'use client';
import { useState } from 'react';
export default function Chat() {
  const [question,setQuestion] = useState('');
  const [answer,setAnswer] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function send(event:React.FormEvent) {
    event.preventDefault(); if (busy || !question.trim()) return;
    setBusy(true); setError(''); setAnswer('');
    try {
      const response = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question}),signal:AbortSignal.timeout(35000)});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to answer right now.');
      setAnswer(data.answer);
    } catch (e) { setError(e instanceof Error ? e.message : 'Connection failed. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="chat" id="ask" aria-labelledby="chat-title">
    <div><span className="eyebrow">A closer look</span><h2 id="chat-title">Ask about my work.</h2><p>Explore my projects, contributions, and what I’m learning. Answers draw from my project profile.</p></div>
    <div className="chat-panel">
      <div className="suggestions">{['What did Gabriel build in Tick-to-trade?','What was Gabriel’s role in BantamGo?'].map(q=><button type="button" disabled={busy} key={q} onClick={()=>setQuestion(q)}>{q}</button>)}</div>
      <form onSubmit={send}><label htmlFor="question">Your question</label><textarea id="question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={2000} required rows={3} placeholder="What would you like to know?"/><button className="primary" disabled={busy || !question.trim()}>{busy?'Thinking…':'Ask Gabriel’s assistant ↗'}</button></form>
      <div aria-live="polite" aria-busy={busy}>{busy && <p>Looking through the project profile…</p>}{answer && <p className="answer">{answer}</p>}</div>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  </section>;
}
