import { ChatError } from '../../../lib/chat';
import { voiceTurn } from '../../../lib/voice';
export const runtime='nodejs';
let windowStart=Date.now();let count=0;let active=0;
export async function POST(request:Request){
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin)return Response.json({error:'Origin not allowed.'},{status:403});
  const mime=request.headers.get('content-type')?.split(';')[0];
  if(!['audio/wav','audio/x-wav','audio/wave'].includes(mime ?? ''))return Response.json({error:'Upload a PCM WAV recording.'},{status:415});
  if(Date.now()-windowStart>60000){windowStart=Date.now();count=0;}
  if(++count>10 || active>=2)return Response.json({error:'Voice is busy. Please try again in a minute.'},{status:429});
  if(!process.env.OPENROUTER_API_KEY || !process.env.CHAT_MODEL)return Response.json({error:'Voice is not configured yet. Set the server API key and chat model.'},{status:503});
  active++;
  try{
    const reader=request.body?.getReader();if(!reader)throw new ChatError('Recording is required.',400);
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>10*1024*1024){await reader.cancel();throw new ChatError('Recording exceeds 10 MB.',413);}chunks.push(value);}
    return Response.json(await voiceTurn(Buffer.concat(chunks)),{headers:{'Cache-Control':'no-store'}});
  }catch(e){return Response.json({error:e instanceof ChatError?e.message:'Unable to process recording.'},{status:e instanceof ChatError?e.status:500});}
  finally{active--;}
}
