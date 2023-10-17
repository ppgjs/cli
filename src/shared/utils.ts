import type { LoadConfigOptions } from 'c12';
import { readPackageJSON } from 'pkg-types';
import { logError, logSuccess } from './log';

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

// 执行成功退出进程
export function exitWithSuccess(wait = true) {
  if (!wait) {
    logSuccess('cli执行完成');
    return '脚本执行完成';
  }
  return new Promise(resolve => {
    // 监听键盘输入
    process.stdin.setRawMode(true);
    process.stdin.resume();
    logSuccess('cli执行完成，按任意键退出。');
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

// 修复c12中packageJson的问题
export const getPackageJsonAttr = async (options: LoadConfigOptions) => {
  const pkgJson: Record<string, any> = {};
  if (options.packageJson) {
    const keys = (
      Array.isArray(options.packageJson)
        ? options.packageJson
        : [typeof options.packageJson === 'string' ? options.packageJson : options.name]
    ).filter(t => t && typeof t === 'string') as string[];
    const pkgJsonFile = await readPackageJSON(options.cwd).catch(e => {
      console.warn('read package.json error => ', e);
    });
    if (pkgJsonFile) {
      const values: Record<string, any> = {};
      keys.forEach((key: string) => {
        if (pkgJsonFile[key]) values[key] = pkgJsonFile[key];
      });
      Object.assign(pkgJson, values);
    }
  }
  return pkgJson;
};
