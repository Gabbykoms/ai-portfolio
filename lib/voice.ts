import { spawn } from 'node:child_process';
import path from 'node:path';
import { answerQuestion, ChatError } from './chat';
export function spokenText(text:string) {
  const plain=text.replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/https?:\/\/\S+/g,'').replace(/[*_`#>~]/g,'').replace(/^\s*[-+]\s+/gm,'').replace(/\s+/g,' ').trim();
  return (plain.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []).slice(0,3).join('').trim();
}
export function runAudio(operation:string, payload:Record<string,string>):Promise<any> {
  return new Promise((resolve,reject)=>{
    const python=process.env.VOICE_PYTHON || path.join(process.cwd(),'.venv','bin','python');
    const child=spawn(python,['-m','voice.bridge'],{cwd:process.cwd(),stdio:['pipe','pipe','pipe']});
    let output=''; let settled=false;
    const finish=(error?:Error,result?:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(result);};
    const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new ChatError('Voice processing timed out.',504));},45000);
    child.on('error',()=>finish(new ChatError('Voice runtime is not configured. Install requirements.txt first.',503)));
    child.stdout.on('data',(chunk:Buffer)=>{output+=chunk.toString();if(output.length>15*1024*1024){child.kill('SIGKILL');finish(new ChatError('Voice output is too large.'));}});
    child.stderr.resume(); // Never send provider diagnostics or credentials to the browser.
    child.stdin.on('error',()=>{});
    child.on('close',()=>{try{const result=JSON.parse(output);finish(result.error?new ChatError(result.error,result.status || 502):undefined,result);}catch{finish(new ChatError('Voice processing failed.'));}});
    child.stdin.end(JSON.stringify({operation,...payload}));
  });
}
export async function voiceTurn(audio:Buffer, bridge=runAudio, answer=answerQuestion) {
  const payload={audio:audio.toString('base64')};
  await bridge('validate',payload);
  const transcription=await bridge('transcribe',payload);
  if(transcription.empty || !transcription.text?.trim()) throw new ChatError('No speech was recognized. Please record again.',422);
  const reply=await answer(transcription.text);
  const text=spokenText(reply.answer);
  if(!text)throw new ChatError('The answer could not be prepared for speech.');
  const speech=await bridge('speak',{text});
  const costs={transcription:transcription.cost ?? null,answer:reply.cost,speech:speech.cost ?? null,total:null as number|null};
  if([costs.transcription,costs.answer,costs.speech].every(c=>typeof c==='number'))costs.total=costs.transcription+costs.answer+costs.speech;
  return {transcript:transcription.text,answer:text,audio:speech.audio,mime:speech.mime,costs,transcription,speech:{...speech,audio:undefined}};
}
