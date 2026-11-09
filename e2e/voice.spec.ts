import {test,expect} from '@playwright/test';
function wav(){const b=Buffer.alloc(16044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(16000,40);return b;}
test('file upload sends only WAV; transcript, answer and audio appear',async({page})=>{
 let uploaded=false;
 await page.route('**/api/voice',async route=>{
  expect(route.request().headers()['content-type']).toBe('audio/wav');
  expect(route.request().postDataBuffer()?.subarray(0,4).toString()).toBe('RIFF');uploaded=true;
  await route.fulfill({json:{transcript:'What did Gabriel build?',answer:'Gabriel built Tick-to-trade with AI assistance.',audio:wav().toString('base64'),mime:'audio/wav',costs:{transcription:0.001,answer:0.002,speech:null,total:null}}});
 });
 await page.goto('/');
 await page.getByLabel('Or choose audio').setInputFiles({name:'question.wav',mimeType:'audio/wav',buffer:wav()});
 await page.getByRole('button',{name:'Send recording'}).click();
 await expect(page.getByText('What did Gabriel build?',{exact:true})).toBeVisible();
 await expect(page.locator('.voice-result')).toContainText('Gabriel built Tick-to-trade with AI assistance.');
 await expect(page.locator('audio')).toHaveJSProperty('readyState',4);
 expect(uploaded).toBeTruthy();
});
test('microphone records and stops; provider errors are visible',async({page})=>{
 await page.route('**/api/voice',route=>route.fulfill({status:503,json:{error:'Voice is not configured yet.'}}));
 await page.goto('/');await page.waitForLoadState('networkidle');await page.getByRole('button',{name:'Record a question'}).click();
 await expect(page.getByRole('button',{name:'Stop recording'})).toBeVisible();
 await page.waitForTimeout(600);
 await page.getByRole('button',{name:'Stop recording'}).click();
 await page.getByRole('button',{name:'Send recording'}).click();
 await expect(page.locator('.voice').getByRole('alert')).toContainText('Voice is not configured yet.');
});
