import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recentCommits, RECENT_COMMITS_TOOL } from '../recent-commits';

const repo = 'Gabbykoms/Tick-to-trade';
const sha = 'a'.repeat(40);
const commit = {sha, author:{login:'Gabbykoms'}, commit:{author:{date:'2026-11-15T12:00:00Z',email:'private@example.com'}, message:'Fix parser\nDetails'}};

test('advertised schema rejects extra fields; valid calls return bounded public evidence', async () => {
  assert.equal(RECENT_COMMITS_TOOL.function.parameters.additionalProperties, false);
  const result = await recentCommits({repo}, async (url, init) => {
    assert.equal(String(url), `https://api.github.com/repos/${repo}/commits?per_page=5`);
    assert.equal(new Headers(init?.headers).has('Authorization'), false);
    assert.ok(init?.signal);
    return Response.json([commit]);
  });
  assert.deepEqual(result, {repo, commits:[{sha, date:'2026-11-15T12:00:00Z', message:'Fix parser',author:'Gabbykoms',url:`https://github.com/${repo}/commit/${sha}`} ]});
  assert.ok(!JSON.stringify(result).includes('private@example.com'));
});

test('invalid arguments and unrelated repos never reach the network', async () => {
  for (const args of [null, [], {}, {repository:repo}, {repo,count:0}, {repo,count:11}, {repo,count:1.5}, {repo,count:'2'}, {repo,extra:true}, {repo:'https://github.com/'+repo}, {repo:'Gabbykoms/..'}, {repo:'someone/other'}]) {
    const result = await recentCommits(args, async () => { assert.fail('network must not run'); });
    assert.ok('error' in result);
  }
});

test('shared project and owner repositories are accepted case-insensitively', async () => {
  for (const name of ['gabbykoms/missing-repository','trinity-shuttle-service/ctrl-alt-elite']) {
    const result = await recentCommits({repo:name,count:1}, async () => Response.json([]));
    assert.deepEqual(result,{repo:name,commits:[]});
  }
});

test('GitHub failures become safe structured results', async () => {
  for (const status of [404,403,429,409,500]) {
    const result = await recentCommits({repo}, async () => new Response('sensitive upstream detail',{status}));
    assert.ok('error' in result);
    assert.ok(!JSON.stringify(result).includes('sensitive upstream detail'));
  }
  const result = await recentCommits({repo}, async () => {throw new Error('secret diagnostic');});
  assert.ok('error' in result);
  assert.ok(!JSON.stringify(result).includes('secret diagnostic'));
});

test('malformed provider results are rejected instead of treated as evidence', async () => {
  for (const data of [{message:'unexpected'}, [{}], [{...commit,sha:'invalid'}], [{...commit,commit:{author:{date:'yesterday'},message:'x'}}]]) {
    const result = await recentCommits({repo}, async () => Response.json(data));
    assert.ok('error' in result);
  }
  assert.ok('error' in await recentCommits({repo},async () => new Response('not JSON')));
});

test('missing author login stays unknown and long subjects/results are bounded', async () => {
  const result = await recentCommits({repo,count:1},async () => Response.json([{...commit,author:null,commit:{...commit.commit,message:'x'.repeat(500)}},commit]));
  assert.ok('commits' in result);
  if ('commits' in result) {
    assert.equal(result.commits.length,1);
    assert.equal(result.commits[0].author,null);
    assert.equal(result.commits[0].message.length,200);
  }
});
