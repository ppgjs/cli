import { existsSync, mkdirSync } from 'fs-extra';
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

// 检测目标文件夹存不存在 不存在则创建
export function createMkdir(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
    console.log('目标文件夹已创建');
  }
}
