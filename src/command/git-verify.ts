import { readFileSync } from 'fs';
import { execCommand } from '../shared';
import path from 'path';
import * as kolorist from 'kolorist';

export async function gitCommitVerify() {
  const gitPath = await execCommand('git', ['rev-parse']);

  const gitMsgPath = path.join(gitPath, '.git', 'COMMIT_EDITMSG');

  const commitMsg = readFileSync(gitMsgPath, { encoding: 'utf8' });
  const REG_EXP = /(?<type>[a-z]+)(\((?<scope>[a-z]+)\))?(?<breaking>!)?:(?<description>.+)/i;
  if (!REG_EXP.test(commitMsg)) {
    throw new Error(
      `${kolorist.bgRed(' ERROR ')} ${kolorist.red(
        'Git提交信息不符合 Git Conventional Message 规范!\n\n'
      )}${kolorist.green('推荐使用命令 pnpm commit 生成符合规范的Git提交信息')}`
    );
  }
}
