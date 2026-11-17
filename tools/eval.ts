/** Separate billed evaluation. Never imported by the no-key test command. */
import {mkdir, writeFile, appendFile} from 'node:fs/promises';
import {answerQuestion, buildMessages} from '../lib/chat';
import {RECENT_COMMITS_TOOL} from './recent-commits';

const repo='Gabbykoms/Tick-to-trade';
const cases=[
  {id:'recent',question:`What are the latest commits in ${repo}? Cite a commit identifier.`,repos:[repo],must:['commit'],mustNot:['deployed to production'],success:true},
  {id:'missing',question:'What changed in Gabbykoms/week08-nonexistent-repository-7f91d2? Do not substitute another repository.',repos:['Gabbykoms/week08-nonexistent-repository-7f91d2'],must:['not found','unavailable','could not','couldn’t','cannot','could not find'],mustNot:['implemented','deployed','fixed'],success:false},
  {id:'profile',question:'What full-time roles is Gabriel targeting?',repos:[],must:['software','engineering'],mustNot:['guaranteed'],success:false},
  {id:'invent',question:`Tell me exactly what Gabriel committed yesterday in ${repo}. If the recent sample cannot establish this, say you cannot verify it; do not invent work.`,repos:[repo],must:['cannot','can’t','could not','couldn’t','verify','confirm'],mustNot:['definitely committed','certainly committed'],success:true},
  {id:'two',question:`Compare the most recent commit in ${repo} and Trinity-Shuttle-Service/Ctrl-Alt-Elite. Look up both and cite identifiers for available commits.`,repos:[repo,'Trinity-Shuttle-Service/Ctrl-Alt-Elite'],must:['commit'],mustNot:['guaranteed'],success:true},
];

async function main() {
  if(!process.env.OPENROUTER_API_KEY) {console.log('SKIP: OPENROUTER_API_KEY is unset; no billed calls.');return;}
  const models=process.argv.slice(2);
  if(models.length!==2 || models[0]===models[1]) throw new Error('Supply two distinct verified model IDs.');
  const catalogResponse=await fetch('https://openrouter.ai/api/v1/models',{signal:AbortSignal.timeout(15000)});
  if(!catalogResponse.ok) throw new Error('Model catalog unavailable');
  const catalog=await catalogResponse.json();
  const selected=models.map(id=>{
    const m=catalog.data.find((m:any)=>m.id===id);
    if(!m?.supported_parameters?.includes('tools'))throw new Error(`Tool support not verified: ${id}`);
    return {id,pricing:m.pricing,supported_parameters:m.supported_parameters};
  });
  const timestamp=new Date().toISOString();
  const directory=`tools/evals/${timestamp.replace(/[:.]/g,'-')}`;
  await mkdir(directory,{recursive:true});
  // Character count is a deliberately conservative token proxy for an estimate,
  // not a tokenizer measurement or a guaranteed invoice limit.
  const initial=JSON.stringify({messages:buildMessages(cases[0].question),tools:[RECENT_COMMITS_TOOL]}).length;
  const estimate=selected.reduce((sum,m)=>sum+5*4*((initial+12000)*Number(m.pricing.prompt)+350*Number(m.pricing.completion)),0);
  await writeFile(`${directory}/setup.json`,JSON.stringify({timestamp,models:selected,cases,estimatedUSD:estimate,estimateAssumption:'40 calls maximum, 350 output tokens per call, prompt character count plus 12000 tokens of tool history; estimate only',maxCallsPerQuestion:4},null,2));
  console.log(`Estimated conservative evaluation cost: $${estimate.toFixed(4)}; maximum 40 model calls, no automatic retries.`);
  if(!Number.isFinite(estimate) || estimate>1)throw new Error('Estimate exceeds $1 evaluation guard; no model calls made.');
  const rows:any[]=[];
  for(const model of models) for(const c of cases) {
    const start=performance.now();
    const providerCalls:any[]=[];
    const providerRequests:any[]=[];
    let result:Awaited<ReturnType<typeof answerQuestion>>|undefined;
    let error:string|undefined;
    try {
      result=await answerQuestion(c.question,{model,fetcher:async(url,init)=>{
        providerRequests.push(JSON.parse(String(init?.body)));
        const response=await fetch(url,init);
        // Save only successful response bodies, never auth headers or raw error bodies.
        if(response.ok) providerCalls.push(await response.clone().json());
        else providerCalls.push({httpStatus:response.status});
        return response;
      }});
    } catch(e) {error=e instanceof Error?e.message:'Evaluation failed';}
    const text=result?.answer.toLowerCase() ?? '';
    const trace=result?.trace ?? [];
    const requested=trace.map(t=>{try{return JSON.parse(t.arguments).repo?.toLowerCase();}catch{return undefined;}});
    const checks={
      completed:result?.stoppedBy==='answer',
      requiredTools:c.repos.every(r=>requested.includes(r.toLowerCase())) && (c.repos.length>0 || trace.length===0),
      requiredWords:c.must.some(w=>text.includes(w)),
      forbiddenWords:c.mustNot.every(w=>!text.includes(w)),
      claims:result?.check.supported===true,
      evidence:!c.success || c.repos.every(r=>trace.some(t=>!t.result.error && t.result.repo?.toString().toLowerCase()===r.toLowerCase() && Array.isArray(t.result.commits) && t.result.commits.length>0)),
      missingIs404:c.id!=='missing' || trace.some(t=>t.result.error?.code==='not_found'),
    };
    const knownCosts=providerCalls.map(p=>p.usage?.cost);
    const cost=result ? result.cost : (providerRequests.length===providerCalls.length && knownCosts.length && knownCosts.every(v=>typeof v==='number' && Number.isFinite(v) && v>=0) ? knownCosts.reduce((a,b)=>a+b,0) : null);
    const row={model,id:c.id,question:c.question,pass:Object.values(checks).every(Boolean),checks,seconds:(performance.now()-start)/1000,cost,steps:result?.steps ?? providerCalls.length,result,error,providerCalls,providerRequests};
    rows.push(row);
    await writeFile(`${directory}/${model.replaceAll('/','-')}-${c.id}.json`,JSON.stringify(row,null,2));
    console.log(`${model} ${c.id}: ${row.pass?'PASS':'FAIL'}; ${row.steps} calls; $${cost ?? 'unknown'}; ${row.seconds.toFixed(2)}s`);
  }
  const average=(withTool:boolean)=>{
    const group=rows.filter(r=>r.result && Boolean(r.result.trace.length)===withTool);
    return group.length && group.every(r=>r.cost!==null) ? group.reduce((sum,r)=>sum+r.cost,0)/group.length : null;
  };
  const summary={directory,passed:rows.filter(r=>r.pass).length,total:rows.length,costWithTool:average(true),costWithoutTool:average(false),maxSteps:Math.max(...rows.map(r=>r.steps))};
  await writeFile(`${directory}/summary.json`,JSON.stringify(summary,null,2));
  const table=rows.map(r=>`| ${r.model} | ${r.id} | ${r.result?.trace.map((t:any)=>t.tool).join(', ') || 'none recorded'} | ${r.steps} | ${r.pass?'PASS':'FAIL'} | ${r.cost===null?'unknown':r.cost.toFixed(8)} | ${r.seconds.toFixed(2)} |`).join('\n');
  await appendFile('tools/CHECKS.md',`\n## Billed evaluation: ${timestamp}\n\nArtifacts: [${directory.replace('tools/','')}](./${directory.replace('tools/','')}/summary.json). Same production prompt and 350-token setting for both models; no automatic retries.\n\n| Model | Question | Tools called | Steps | Verdict | USD | Seconds |\n| --- | --- | --- | --- | --- | --- | --- |\n${table}\n\nMean USD/question with tools: ${summary.costWithTool ?? 'unknown'}. Without tools: ${summary.costWithoutTool ?? 'unknown'}. Maximum steps: ${summary.maxSteps}.\n\nCode checks are limited heuristics, not a semantic correctness guarantee. Failed rows and successful provider responses are retained in the artifacts.\n`);
  console.log(JSON.stringify(summary));
}
main().catch(()=>{console.error('Evaluation stopped. Check configuration, model IDs, network access, or the estimate guard. Saved artifacts, if any, are retained.');process.exitCode=1;});
