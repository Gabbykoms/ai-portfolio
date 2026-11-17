import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runToolLoop, dispatchToolCall, type ModelClient, type ToolDefinition } from '../loop';
import { checkAnswer } from '../check';
import { RECENT_COMMITS_TOOL } from '../recent-commits';

const repo = 'Gabbykoms/Tick-to-trade';
const sha = 'abcdef1234567890abcdef1234567890abcdef12';
const evidence = {repo, commits:[{sha, date:'2026-11-15T12:00:00Z',message:'Fix parser',author:'Gabbykoms',url:`https://github.com/${repo}/commit/${sha}`}]};
const call = (id='one', name='recent_commits', args=JSON.stringify({repo})) => ({id,type:'function' as const,function:{name,arguments:args}});
const reply = (content: string | null, calls: ReturnType<typeof call>[] = [], cost: number | undefined = 0.01) => ({choices:[{message:{content,tool_calls:calls}}],usage:{cost:cost as number | undefined}});
const messages = [{role:'user' as const,content:'What changed recently?'}];
function registry(handler: ToolDefinition['execute'] = async () => evidence): ToolDefinition[] {
  return [{schema:RECENT_COMMITS_TOOL,execute:handler}];
}
function scripted(responses: unknown[]) {
  const requests: Parameters<ModelClient>[0][] = [];
  const client: ModelClient = async request => {
    requests.push(structuredClone({messages:request.messages,tools:request.tools}));
    assert.ok(responses.length,'unexpected extra model call');
    return responses.shift();
  };
  return {client,requests};
}

test('single call delivers evidence with matching ID and sums model cost', async () => {
  const fake = scripted([reply(null,[call()]),reply(`Commit ${sha.slice(0,7)} fixes the parser.`)]);
  const result = await runToolLoop(messages,{client:fake.client,tools:registry()});
  const last = fake.requests[1].messages.at(-1)!;
  assert.equal(last.role,'tool');
  assert.equal(last.tool_call_id,'one');
  assert.deepEqual(JSON.parse(last.content!),evidence);
  assert.equal(fake.requests[1].messages.at(-2)?.tool_calls?.[0].id,'one');
  assert.equal(result.steps,2);
  assert.equal(result.cost,0.02);
  assert.equal(result.check.supported,true);
  assert.equal(result.trace.length,1);
  assert.equal(fake.requests[0].tools[0].function.name,'recent_commits');
});

test('bad arguments return an error to the model, which can correct its call', async () => {
  let executions=0;
  const fake=scripted([reply(null,[call('bad','recent_commits','{"repository":"wrong"}')]),reply(null,[call('fixed')]),reply('Found recent activity.')]);
  const result=await runToolLoop(messages,{client:fake.client,tools:registry(async () => {executions++;return evidence;})});
  assert.equal(JSON.parse(fake.requests[1].messages.at(-1)!.content!).error.code,'invalid_arguments');
  assert.equal(fake.requests[1].messages.at(-1)!.tool_call_id,'bad');
  assert.equal(executions,1);
  assert.equal(result.steps,3);
});

test('unknown tool and malformed JSON produce errors without executing', async () => {
  let executions=0;
  const tools=registry(async () => {executions++;return evidence;});
  assert.equal((await dispatchToolCall(call('x','imaginary'),tools)).error?.code,'unknown_tool');
  assert.equal((await dispatchToolCall(call('x','recent_commits','{'),tools)).error?.code,'invalid_arguments');
  const fake=scripted([reply(null,[call('x','imaginary')]),reply('That tool is unavailable.')]);
  await runToolLoop(messages,{client:fake.client,tools});
  assert.equal(JSON.parse(fake.requests[1].messages.at(-1)!.content!).error.code,'unknown_tool');
  assert.equal(executions,0);
});

test('endless caller stops after four model calls with the program answer', async () => {
  const fake=scripted(Array.from({length:4},()=>reply('Keep going',[call()])));
  const result=await runToolLoop(messages,{client:fake.client,tools:registry()});
  assert.equal(result.steps,4);
  assert.equal(result.stoppedBy,'cap');
  assert.equal(result.answer,"I couldn't finish answering that in 4 steps.");
});

test('side effect is pending and its handler never executes', async () => {
  let effects=0;
  const tools:ToolDefinition[]=[{schema:{type:'function',function:{name:'request_intro',description:'Request introduction',parameters:{type:'object',properties:{message:{type:'string'}},required:['message'],additionalProperties:false}}},sideEffect:true,execute:async () => {effects++;return {sent:true};}}];
  const fake=scripted([reply(null,[call('intro','request_intro','{"message":"Hello"}')]),reply('Awaiting confirmation.')]);
  const result=await runToolLoop(messages,{client:fake.client,tools});
  assert.equal(effects,0);
  assert.deepEqual(result.pending,[{tool:'request_intro',arguments:{message:'Hello'},toolCallId:'intro'}]);
  assert.equal(JSON.parse(fake.requests[1].messages.at(-1)!.content!).error.code,'confirmation_required');
});

test('unsupported identifier is flagged and replaced with a safe answer', async () => {
  const fake=scripted([reply(null,[call()]),reply('Commit deadbee fixed it.')]);
  const result=await runToolLoop(messages,{client:fake.client,tools:registry()});
  assert.equal(result.check.supported,false);
  assert.equal(result.stoppedBy,'unsupported_claim');
  assert.ok(!result.answer.includes('deadbee'));
  assert.match(result.check.unsupported.join(' '),/deadbee/);
});

test('claim check binds commit URL to its repo and does not require profile repo lookups', () => {
  assert.equal(checkAnswer(`See https://github.com/other/repo/commit/${sha}`,[evidence]).supported,false);
  assert.equal(checkAnswer(`See ${evidence.commits[0].url}.`,[evidence]).supported,true);
  assert.equal(checkAnswer('Project: https://github.com/Gabbykoms/Tick-to-trade',[]).supported,true);
  assert.equal(checkAnswer('Commit deadbee exists.',[{error:{code:'not_found',message:'Unavailable'}}]).supported,false);
});

test('multiple calls each receive results; reply execution limit is four', async () => {
  let executions=0;
  const fake=scripted([reply(null,Array.from({length:6},(_,i)=>call(String(i)))),reply('Finished.')]);
  const result=await runToolLoop(messages,{client:fake.client,tools:registry(async () => {executions++;return evidence;})});
  const toolMessages=fake.requests[1].messages.filter(m=>m.role==='tool');
  assert.equal(executions,4);
  assert.deepEqual(toolMessages.map(m=>m.tool_call_id),['0','1','2','3','4','5']);
  assert.equal(JSON.parse(toolMessages[4].content!).error.code,'tool_limit');
  assert.equal(result.trace.length,6);
});

test('missing or invalid usage cost stays unknown', async () => {
  for (const cost of [undefined,-1,NaN]) {
    const response=reply('Profile answer.');
    response.usage.cost=cost;
    const result=await runToolLoop(messages,{client:scripted([response]).client,tools:registry()});
    assert.equal(result.cost,null);
  }
});

test('handler exceptions return safe errors; provider failures use program fallback', async () => {
  const result=await dispatchToolCall(call(),registry(async () => {throw new Error('secret');}));
  assert.equal(result.error?.code,'tool_failed');
  assert.ok(!JSON.stringify(result).includes('secret'));
  const failed=await runToolLoop(messages,{client:async () => {throw new Error('secret');},tools:registry()});
  assert.equal(failed.stoppedBy,'provider_error');
  assert.equal(failed.cost,null);
  assert.ok(!failed.answer.includes('secret'));
});

test('deadline bounds a stalled model without a real provider call', async () => {
  const result=await runToolLoop(messages,{client:async () => new Promise(()=>{}),tools:registry(),timeoutMs:10});
  assert.equal(result.stoppedBy,'timeout');
  assert.equal(result.cost,null);
});

test('malformed model replies stop safely instead of executing calls', async () => {
  for (const response of [{choices:[]},reply(''),reply(null,[{...call(),id:''}]),reply(null,[call(),call()])]) {
    const result=await runToolLoop(messages,{client:scripted([response]).client,tools:registry(async()=>assert.fail('must not execute'))});
    assert.equal(result.stoppedBy,'provider_error');
  }
});


test('deadline also bounds a stalled tool and stops further model calls', async () => {
  const fake=scripted([reply(null,[call()])]);
  const result=await runToolLoop(messages,{client:fake.client,tools:registry(async()=>new Promise(()=>{})),timeoutMs:10});
  assert.equal(result.stoppedBy,'timeout');
  assert.equal(fake.requests.length,1);
});
