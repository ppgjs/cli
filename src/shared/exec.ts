import { type Options } from 'execa';

// 异步执行
export async function execCommand(cmd: string, args: string[] = [], options: Options = {}) {
  const { execa } = await import('execa');
  const res = await execa(cmd, args, options);
  return res?.stdout?.trim() || '';
}
