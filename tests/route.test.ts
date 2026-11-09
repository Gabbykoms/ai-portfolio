import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../app/api/chat/route';
const request = (body:string, type='application/json') => new Request('http://localhost/api/chat',{method:'POST',headers:{'Content-Type':type},body});
test('route rejects invalid type, malformed JSON, missing question and oversize bytes',async()=>{
  assert.equal((await POST(request('hello','text/plain'))).status,415);
  assert.equal((await POST(request('{'))).status,400);
  assert.equal((await POST(request('{}'))).status,400);
  assert.equal((await POST(request('x'.repeat(8193)))).status,413);
});
test('cross-origin requests fail before provider processing',async()=>{
  assert.equal((await POST(new Request('http://localhost/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://elsewhere.example'},body:'{}'}))).status,403);
});
test('voice accepts browser origin matching Host despite an internal localhost URL',async()=>{
  const {POST:voice}=await import('../app/api/voice/route');
  const response=await voice(new Request('http://localhost:3000/api/voice',{method:'POST',headers:{Host:'127.0.0.1:3000',Origin:'http://127.0.0.1:3000','Content-Type':'text/plain'},body:'probe'}));
  assert.equal(response.status,415); // Passes origin gate, stops before any provider call.
});
test('chat accepts browser origin matching Host and still rejects foreign origins',async()=>{
  const make=(origin:string)=>new Request('http://localhost:3000/api/chat',{method:'POST',headers:{Host:'127.0.0.1:3000',Origin:origin,'Content-Type':'application/json'},body:'{}'});
  assert.equal((await POST(make('http://127.0.0.1:3000'))).status,400);
  assert.equal((await POST(make('http://evil.example'))).status,403);
  assert.equal((await POST(make('http://127.0.0.1:3001'))).status,403);
});
