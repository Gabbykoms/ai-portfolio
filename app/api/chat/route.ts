import { answerQuestion, ChatError } from '../../../lib/chat';
export const runtime = 'nodejs';
let windowStart = Date.now();
let count = 0;
export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({error:'Send a JSON question.'},{status:415});
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({error:'Origin not allowed.'},{status:403});
  if (Date.now() - windowStart > 60000) { windowStart = Date.now(); count = 0; }
  if (++count > 20) return Response.json({error:'Too many questions. Please wait a minute.'},{status:429,headers:{'Retry-After':'60'}});
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new ChatError('A question is required.',400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new ChatError('Question payload is too large.',413); }
      chunks.push(value);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ChatError('Invalid JSON.',400); }
    return Response.json(await answerQuestion(body?.question),{headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    return Response.json({error:error instanceof ChatError ? error.message : 'Unable to answer right now.'}, {status:error instanceof ChatError ? error.status : 500});
  }
}
