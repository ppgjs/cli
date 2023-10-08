import type { CliOption } from '../types';

export async function gitCommit(
  gitCommitTypes: CliOption['gitCommitTypes'],
  gitCommitScopes: CliOption['gitCommitScopes']
) {
  console.log('7行 - git-commit.ts -:gitCommitTypes => ', gitCommitTypes);
  console.log('8行 - git-commit.ts -:gitCommitScopes => ', gitCommitScopes);
  return 12323;
}
