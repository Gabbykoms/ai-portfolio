import {test} from 'node:test';
import assert from 'node:assert/strict';
import {answerQuestion} from '../lib/chat';
import {voiceTurn} from '../lib/voice';
const repo='Gabbykoms/Tick-to-trade';
const sha='abcdef12'.repeat(5);
function providers(invent=false) {
  let calls=0;
  const fetcher:typeof fetch=async (_url,init)=>{
    const body=JSON.parse(String(init?.body));
    assert.equal(body.tools[0].function.name,'recent_commits');
    assert.ok(init?.signal);
    if (++calls===1) return Response.json({choices:[{message:{content:null,tool_calls:[{id:'commit-call',type:'function',function:{name:'recent_commits',arguments:JSON.stringify({repo})}}]}}],usage:{cost:0.01}});
    const result=body.messages.at(-1);
    assert.equal(result.role,'tool');
    assert.equal(result.tool_call_id,'commit-call');
    assert.equal(JSON.parse(result.content).commits[0].sha,sha);
    return Response.json({choices:[{message:{content:`Commit ${invent?'deadbee':sha.slice(0,7)} fixes the parser.`}}],usage:{cost:0.02}});
  };
  const githubFetcher:typeof fetch=async (_url,init)=>{
    assert.equal(new Headers(init?.headers).has('Authorization'),false);
    return Response.json([{sha,author:{login:'Gabbykoms'},commit:{author:{date:'2026-11-15T12:00:00Z'},message:'Fix parser'}}]);
  };
  return {key:'test',model:'test',fetcher,githubFetcher};
}
test('shared answer executes real dispatcher and adapter, returning trace and accumulated cost',async()=>{
  const result=await answerQuestion('Recent commits?',providers());
  assert.equal(result.steps,2);
  assert.equal(result.cost,0.03);
  assert.equal(result.trace[0].toolCallId,'commit-call');
  assert.equal(result.check.supported,true);
});
test('voice returns loop metadata and speaks the safe replacement for unsupported claims',async()=>{
  const options=providers(true);
  let spoken='';
  const result=await voiceTurn(Buffer.from('mock'),async(op,payload)=>{
    if(op==='transcribe')return {text:'Recent commits?',cost:0.001};
    if(op==='speak'){spoken=payload.text;return {audio:'abc',mime:'audio/mpeg',cost:0.002};}
    return {};
  },q=>answerQuestion(q,options));
  assert.equal(result.check.supported,false);
  assert.equal(result.stoppedBy,'unsupported_claim');
  assert.equal(result.trace.length,1);
  assert.equal(result.steps,2);
  assert.ok(!spoken.includes('deadbee'));
  assert.equal(spoken,result.answer);
  assert.equal(result.costs.answer,0.03);
});
