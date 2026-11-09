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
