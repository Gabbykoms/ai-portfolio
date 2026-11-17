import Ajv from 'ajv';
import { checkAnswer } from './check';
import { recentCommits, RECENT_COMMITS_TOOL, type CommitResult } from './recent-commits';

export type ToolCall = {id:string; type:'function'; function:{name:string; arguments:string}};
export type Message = {role:'system'|'user'|'assistant'|'tool'; content:string|null; tool_calls?:ToolCall[]; tool_call_id?:string};
export type ToolSchema = {type:string; function:{name:string; description:string; parameters:object}};
export type ToolDefinition = {schema:ToolSchema; sideEffect?:boolean; execute:(args:unknown, signal?:AbortSignal)=>Promise<object>};
export type ModelClient = (request:{messages:Message[]; tools:ToolSchema[]; signal?:AbortSignal})=>Promise<unknown>;
export type Pending = {tool:string; arguments:unknown; toolCallId:string};
export type ToolResult = {error?:{code:string;message:string}; pending?:Pending; [key:string]:unknown};
export type TraceEntry = {step:number; toolCallId:string; tool:string; arguments:string; result:ToolResult};
const ajv = new Ajv({allErrors:true});
const productionTools:ToolDefinition[] = [{schema:RECENT_COMMITS_TOOL,execute:recentCommitsAdapter}];
async function recentCommitsAdapter(args:unknown, signal?:AbortSignal) {
  return recentCommits(args,(url,init) => fetch(url,{...init,signal:signal && init?.signal ? AbortSignal.any([signal,init.signal]) : signal ?? init?.signal}));
}
const errorResult = (code:string,message:string):ToolResult => ({error:{code,message}});

/** Side effects are always held here. Confirmation/execution belongs to a separate human flow. */
export async function dispatchToolCall(call:ToolCall, tools:ToolDefinition[]=productionTools, signal?:AbortSignal):Promise<ToolResult> {
  const tool=tools.find(t=>t.schema.function.name===call.function.name);
  if (!tool) return errorResult('unknown_tool','Unknown tool. Use one of the advertised tool names.');
  let args:unknown;
  try { args=JSON.parse(call.function.arguments); }
  catch { return errorResult('invalid_arguments','Arguments must be valid JSON matching the advertised schema.'); }
  try {
    const validate=ajv.compile(tool.schema.function.parameters);
    if (!validate(args)) return errorResult('invalid_arguments',`Arguments must match the advertised schema: ${ajv.errorsText(validate.errors)}.`);
    if (tool.sideEffect) return {...errorResult('confirmation_required','This action needs human confirmation and has not run.'),pending:{tool:call.function.name,arguments:args,toolCallId:call.id}};
    signal?.throwIfAborted();
    const result=await tool.execute(args,signal);
    // Serialize here so unusable handler output also becomes a tool error.
    const serialized=JSON.stringify(result);
    const safe:unknown=JSON.parse(serialized);
    if (!safe || typeof safe!=='object' || Array.isArray(safe)) throw new Error('Invalid result');
    return safe as ToolResult;
  } catch { return errorResult('tool_failed','The tool could not complete this request. No reliable result is available.'); }
}

type StopReason = 'answer'|'cap'|'unsupported_claim'|'timeout'|'provider_error';
type Options = {client:ModelClient; tools?:ToolDefinition[]; timeoutMs?:number};

/** Four model calls maximum, four tool executions per reply, one overall deadline. */
export async function runToolLoop(initialMessages:Message[], options:Options) {
  const tools=options.tools ?? productionTools;
  const messages=structuredClone(initialMessages);
  const trace:TraceEntry[]=[];
  const pending:Pending[]=[];
  let steps=0;
  let cost:number|null=0;
  const controller=new AbortController();
  const timeoutMs=options.timeoutMs ?? 30000;
  if (!Number.isFinite(timeoutMs) || timeoutMs<=0) throw new Error('timeoutMs must be positive and finite');
  let rejectDeadline:(reason:Error)=>void=()=>{};
  const deadline=new Promise<never>((_,reject)=>{rejectDeadline=reject;});
  const timer=setTimeout(()=>{controller.abort();rejectDeadline(new Error('deadline'));},timeoutMs);
  const finish=(answer:string,stoppedBy:StopReason,check=checkAnswer('',[]))=>({answer,steps,stoppedBy,cost,trace,pending,check});
  try {
    for (steps=1;steps<=4;steps++) {
      const raw=await Promise.race([options.client({messages:structuredClone(messages),tools:tools.map(t=>t.schema),signal:controller.signal}),deadline]);
      const response=raw as {choices?:{message?:{content?:unknown;tool_calls?:unknown}}[];usage?:{cost?:unknown}} | null;
      const usage=response?.usage?.cost;
      cost=cost!==null && typeof usage==='number' && Number.isFinite(usage) && usage>=0 ? cost+usage : null;
      const message=response?.choices?.[0]?.message;
      if (!message) throw new Error('Missing message');
      const calls=message.tool_calls ?? [];
      if (!Array.isArray(calls) || calls.length>32) throw new Error('Invalid calls');
      if (!calls.length) {
        if (typeof message.content!=='string' || !message.content.trim()) throw new Error('Empty answer');
        const answer=message.content.trim();
        const results=trace.filter(t=>t.tool==='recent_commits' && !t.result.error && Array.isArray(t.result.commits) && typeof t.result.repo==='string').map(t=>t.result as CommitResult);
        const check=checkAnswer(answer,results);
        return check.supported ? finish(answer,'answer',check) : finish('I could not verify the commit details in that answer. Please try asking again.','unsupported_claim',check);
      }
      const ids=new Set<string>();
      for (const call of calls) {
        if (!call || typeof call.id!=='string' || !call.id || ids.has(call.id) || call.type!=='function'
          || typeof call.function?.name!=='string' || typeof call.function?.arguments!=='string') throw new Error('Malformed call');
        ids.add(call.id);
      }
      messages.push({role:'assistant',content:typeof message.content==='string' ? message.content : null,tool_calls:calls});
      for (const [index,call] of (calls as ToolCall[]).entries()) {
        const result=index>=4 ? errorResult('tool_limit','Only four tool calls per reply are allowed. Use the results already returned.')
          : await Promise.race([dispatchToolCall(call,tools,controller.signal),deadline]);
        trace.push({step:steps,toolCallId:call.id,tool:call.function.name,arguments:call.function.arguments,result});
        if (result.pending) pending.push(result.pending);
        messages.push({role:'tool',tool_call_id:call.id,content:JSON.stringify(result)});
      }
    }
    steps=4;
    return finish("I couldn't finish answering that in 4 steps.",'cap');
  } catch {
    cost=null; // A failed/timed-out call may still have incurred unreported provider usage.
    return controller.signal.aborted
      ? finish('The answer took too long. Please try again.','timeout')
      : finish('The answer service could not complete this request. Please try again.','provider_error');
  } finally {clearTimeout(timer);controller.abort();}
}
