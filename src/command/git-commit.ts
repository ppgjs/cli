import Enquirer from 'enquirer';
import type { CliOption } from '../types';
import { execCommand } from '../shared';

interface PromptObject {
  types: string;
  scopes: string;
  description: string;
}

export async function gitCommit(
  gitCommitTypes: CliOption['gitCommitTypes'],
  gitCommitScopes: CliOption['gitCommitScopes']
) {
  const typesChoices = gitCommitTypes.map(([name, title]) => {
    const nameWithSuffix = `${name}:`;
    const message = `${nameWithSuffix.padEnd(12)}${title}`;
    return { name, message };
  });

  const scopesChoices = gitCommitScopes.map(([name, title]) => ({
    name,
    message: `${name.padEnd(12)} (${title})`
  }));

  const selectResult = await Enquirer.prompt<PromptObject>([
    { name: 'types', type: 'select', message: '请选择提交类型', choices: typesChoices },
    { name: 'scopes', type: 'select', message: '选择一个scope', choices: scopesChoices },
    { name: 'description', type: 'text', message: '请输入提交描述', required: true }
  ]);
  console.log('31行 - git-commit.ts  => ', selectResult);

  const commitMsg = `${selectResult.types}(${selectResult.scopes}): ${selectResult.description}`;

  execCommand('git', ['commit', '-m', commitMsg], { stdio: 'inherit' });
}
