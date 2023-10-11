import { execCommand } from './exec';
import { logError, logInfo } from './log';

// 退出进程
export function exitWithError() {
  return new Promise((_, reject) => {
    // 监听键盘输入
    process.stdin.setRawMode(true);
    process.stdin.resume();
    logError('脚本执行失败，按任意键退出！');
    process.stdin.on('data', () => {
      reject(new Error('Program Exit'));
      process.exit();
    });
  });
}

export async function gitPull(showMessage = true) {
  const result = await execCommand('git pull');
  if (showMessage) {
    const branch = await execCommand('git', ['symbolic-ref', '--short', 'HEAD']);
    logInfo(`拉取 ${branch} 分支最新代码`);
  }
  return result;
}

export async function gitCheckoutBranch(branch: string, logMessage = '') {
  await execCommand('git', ['checkout', branch]);
  logInfo(logMessage || `切换分支到 ${branch}`);
}

export function verifyVersion(version: string) {
  const reg = /^[0-9]{1,4}(\.[0-9]{1,4}){2,3}$/;
  return reg.test(version);
}
