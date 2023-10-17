import { execCommand } from './exec';

// 打开文件
export async function openFile(...path: string[]) {
  const system = await execCommand('uname');
  if (system.includes('Darwin')) {
    await execCommand('open', [...path]);
  } else {
    await execCommand('start', [...path]);
  }
}
