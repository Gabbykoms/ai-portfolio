import type { CommitResult } from './recent-commits';

export type ClaimCheck = {supported: boolean; unsupported: string[]};

/** Identifier matching only: this cannot establish the truth of arbitrary prose. */
export function checkAnswer(answer: string, results: CommitResult[]): ClaimCheck {
  const commits = results.flatMap(result => 'commits' in result ? result.commits.map(commit => ({...commit,repo:result.repo.toLowerCase()})) : []);
  const unsupported = new Set<string>();
  const urls = /https?:\/\/github\.com\/([^\s/]+\/[^\s/]+)\/commit\/([a-zA-Z0-9]+)(?=$|[\s/?#.,;:!)\]])/gi;
  for (const match of answer.matchAll(urls)) {
    const [,repo,sha] = match;
    if (!/^[a-f0-9]{7,40}$/i.test(sha) || !commits.some(c => c.repo === repo.toLowerCase() && c.sha.toLowerCase().startsWith(sha.toLowerCase()))) {
      unsupported.add(`Unsupported commit URL: ${match[0]}`);
    }
  }
  // Treat standalone 7–40 hex characters as candidate commit identifiers.
  // This conservative rule can flag unrelated hex strings; it is not semantic verification.
  for (const match of answer.matchAll(/\b[a-f0-9]{7,40}\b/gi)) {
    const sha = match[0].toLowerCase();
    if (!commits.some(c => c.sha.toLowerCase().startsWith(sha))) unsupported.add(`Unsupported commit identifier: ${match[0]}`);
  }
  return {supported:unsupported.size === 0,unsupported:[...unsupported]};
}
