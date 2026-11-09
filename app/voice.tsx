'use client';
import {useEffect,useRef,useState} from 'react';
async function wav(blob:Blob):Promise<Blob>{
  if(blob.size>10*1024*1024)throw Error('Choose a recording smaller than 10 MB.');
  const context=new AudioContext();
  try{
    const audio=await context.decodeAudioData(await blob.arrayBuffer());
    if(audio.duration>30 || !audio.length)throw Error('Record between 0 and 30 seconds.');
    const samples=audio.length, bytes=new ArrayBuffer(44+samples*2), view=new DataView(bytes);
    const text=(at:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};
    text(0,'RIFF');view.setUint32(4,36+samples*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,audio.sampleRate,true);view.setUint32(28,audio.sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples*2,true);
    const channels=Array.from({length:audio.numberOfChannels},(_,c)=>audio.getChannelData(c));
    for(let i=0;i<samples;i++){let sample=0;for(const channel of channels)sample+=channel[i]/channels.length;sample=Math.max(-1,Math.min(1,sample));view.setInt16(44+i*2,sample<0?sample*32768:sample*32767,true);}
    return new Blob([bytes],{type:'audio/wav'});
  }finally{await context.close();}
}
export default function Voice(){
  const [recording,setRecording]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<any>(null),[clip,setClip]=useState<Blob|null>(null);
  const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;if(timer.current)clearTimeout(timer.current);if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());};},[]);
  async function start(){
    setError('');setClip(null);setResult(null);
    try{
      if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)throw Error('Microphone recording is unavailable. Choose an audio file below.');
      const media=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!mounted.current){media.getTracks().forEach(t=>t.stop());return;}
      stream.current=media;const rec=new MediaRecorder(media);recorder.current=rec;const chunks:Blob[]=[];
      rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      rec.onerror=()=>{setError('Recording failed. Try an audio file.');media.getTracks().forEach(t=>t.stop());setRecording(false);};
      rec.onstop=()=>{if(timer.current)clearTimeout(timer.current);media.getTracks().forEach(t=>t.stop());if(mounted.current){setRecording(false);setClip(new Blob(chunks,{type:rec.mimeType}));}};
      rec.start();setRecording(true);timer.current=setTimeout(()=>{if(rec.state==='recording')rec.stop();},29000);
    }catch(e){setError(e instanceof Error?e.message:'Microphone access failed.');}
  }
  async function send(){
    if(!clip || busy)return;setBusy(true);setError('');setResult(null);
    try{const audio=await wav(clip);const response=await fetch('/api/voice',{method:'POST',headers:{'Content-Type':'audio/wav'},body:audio,signal:AbortSignal.timeout(130000)});const data=await response.json();if(!response.ok)throw Error(data.error || 'Voice failed.');setResult(data);}
    catch(e){setError(e instanceof Error?e.message:'Voice failed.');}finally{setBusy(false);}
  }
  return <section className="voice" aria-labelledby="voice-title"><h3 id="voice-title">Or ask out loud.</h3><p>Record up to 30 seconds. Your audio is sent for transcription only when you choose “Send recording.” Check the transcript—names can be misheard.</p>
    <div className="voice-controls"><button type="button" className="primary" disabled={busy} onClick={()=>recording?recorder.current?.stop():start()}>{recording?'Stop recording':'Record a question'}</button><label className="file-label">Or choose audio<input type="file" accept="audio/*" disabled={busy || recording} onChange={e=>{setClip(e.target.files?.[0] ?? null);setError('');setResult(null);}}/></label></div>
    {clip && <button className="primary" disabled={busy || recording} onClick={send}>{busy?'Transcribing, answering, and speaking…':'Send recording ↗'}</button>}
    <div aria-live="polite">{recording && <p>Recording… stops automatically before 30 seconds.</p>}{clip && !busy && <p>Recording ready to send.</p>}{busy && <p>Preparing your spoken answer…</p>}</div>
    {error && <p role="alert" className="error">{error}</p>}
    {result && <div className="voice-result"><h4>What I heard</h4><p>{result.transcript}</p><h4>Answer</h4><p>{result.answer}</p><audio controls src={`data:${result.mime};base64,${result.audio}`}>Your browser does not support audio playback.</audio><details><summary>Turn costs</summary>{Object.entries(result.costs).map(([name,value])=><p key={name}>{name}: {typeof value==='number'?`$${value.toFixed(6)}`:'Not yet reported'}</p>)}</details><p>If the transcript is wrong, record again or use the text box above.</p></div>}
  </section>;
}
