import { readFileSync } from 'fs';
import { execCommand } from '../shared';
import chalk from 'chalk';
import path from 'path';

export async function gitCommitVerify() {
  const gitPath = await execCommand('git', ['rev-parse']);

  const gitMsgPath = path.join(gitPath, '.git', 'COMMIT_EDITMSG');

  console.log('9行 - git-verify.ts  => ', gitMsgPath);
  const commitMsg = readFileSync(gitMsgPath, { encoding: 'utf8' });
  const REG_EXP = /(?<type>[a-z]+)(\((?<scope>[a-z]+)\))?(?<breaking>!)?:(?<description>.+)/i;
  if (!REG_EXP.test(commitMsg)) {
    throw new Error(
      `${chalk.bgRed(' ERROR ')} ${chalk.red('Git提交信息不符合 Git Conventional Message 规范!\n\n')}${chalk.green(
        '推荐使用命令 pnpm commit 生成符合规范的Git提交信息'
      )}`
    );
  }
}
