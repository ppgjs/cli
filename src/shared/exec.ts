import { execa, execaSync, type Options } from 'execa';

// 异步执行
export async function execCommand(cmd: string, args: string[] = [], options: Options = {}) {
  const res = await execa(cmd, args, options);
  return res?.stdout?.trim() || '';
}

// 同步执行
export function execCommandSync(cmd: string, args: string[] = []) {
  const res = execaSync(cmd, args);
  return res?.stdout?.trim() || '';
}

export async function testDir() {
  const a = await execCommand('git', ['rev-parse', '--show-toplevel']);

  // 改变进程执行的目录

  process.chdir(`${a}/dist`);
  console.log('26行 - git-version.ts  => ', `${a}/dist`);
  console.log('26行 - git-version.ts  => ', process.cwd());
  const res = await execCommand('ls');
  console.log('26行 - git-version.ts  => ', res);
}
