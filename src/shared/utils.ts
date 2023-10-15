import { execCommand } from './exec';
import { logError } from './log';

/**
 * @description: 睡眠
 * @param {number} delay
 * @return {Promise} 时间完成之后的
 */
export const sleep = (delay = 1000) => {
  return new Promise(res => {
    setTimeout(() => {
      res('睡眠完成');
    }, delay);
  });
};

/**
 * @description: 浏览器打开网页
 * @param {number} delay
 * @return {Promise} 时间完成之后的
 */
export const openBrowserUrl = (url: string) => {
  return execCommand('start', [url]);
};

// 执行成功退出进程
export function exitWithSuccess() {
  return new Promise(resolve => {
    // 监听键盘输入
    process.stdin.setRawMode(true);
    process.stdin.resume();
    logError('cli执行完成，按任意键退出。');
    process.stdin.on('data', () => {
      resolve('脚本执行完成');
      process.exit();
    });
  });
}

// 执行失败退出进程
export function exitWithError() {
  return new Promise((_, reject) => {
    // 监听键盘输入
    process.stdin.setRawMode(true);
    process.stdin.resume();
    logError('cli执行失败，按任意键退出！');
    process.stdin.on('data', () => {
      reject(new Error('Program Exit'));
      process.exit();
    });
  });
}

/**
 * @description: 监听进程结束
 * @param {function} callback 回调
 * @param {*} autoAccidentExitCallFun 程序指定异常退出(非手动退出) 是否执行该函数
 * @return {*}
 */
export function watchProcessAccident(callback: () => void, autoAccidentExitCallFun = false) {
  process.on('exit', async code => {
    if (code !== 0) {
      // 异常退出
      if (autoAccidentExitCallFun) await callback();
      logError(`进程退出编码:${code}`);
    }
  });
  // 用户手动退出
  process.on('SIGINT', async () => {
    await callback();
    process.exit(0); // 退出程序
  });
}
