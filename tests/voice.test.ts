import {test} from 'node:test';
import assert from 'node:assert/strict';
import { voiceTurn, spokenText } from '../lib/voice';
test('voice uses the shared answer, reports costs, and stops on empty transcription',async()=>{
  const operations:string[]=[];
  const bridge=async(operation:string)=>{operations.push(operation); return operation==='transcribe'?{text:'What did Gabriel build?',empty:false,cost:0.001}:{audio:'abc',mime:'audio/mpeg',cost:null};};
  const result=await voiceTurn(Buffer.from('test'),bridge,async(q:string)=>({answer:'A C++ project.',cost:0.002,model:'test'}));
  assert.deepEqual(operations,['validate','transcribe','speak']);
  assert.equal(result.costs.total,null);
  assert.equal(result.answer,'A C++ project.');
  await assert.rejects(voiceTurn(Buffer.from('test'),async(op:string)=>op==='transcribe'?{empty:true,text:''}:{},async()=>{throw Error('must not answer');}),/No speech/);
});
test('spoken text removes Markdown and limits sentences',()=>{
  assert.equal(spokenText('**One.** Two! Three? Four.'),'One. Two! Three?');
  assert.equal(spokenText('[Project](https://example.com).'), 'Project.');
});
test('Python bridge validates WAV without a model call',async()=>{
  const {runAudio}=await import('../lib/voice');
  const b=Buffer.alloc(16044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(16000,40);
  assert.equal((await runAudio('validate',{audio:b.toString('base64')})).seconds,1);
  await assert.rejects(runAudio('validate',{audio:Buffer.from('bad').toString('base64')}),/Invalid WAV/);
});
