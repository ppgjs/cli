import { GitInfo } from '../config';
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

// 获取当前分支
export async function gitGetCurrentBranch() {
  return execCommand('git', ['symbolic-ref', '--short', 'HEAD']);
}

// 检查工作区状态
export async function checkWorkingStatus() {
  return execCommand('git', ['status']);
}

// 查看工作区时候代码没有提交
export async function checkWorkingNoCommit() {
  const status = await checkWorkingStatus();
  if (status.includes('nothing to commit')) return true;

  logError('当前分支还没提交，请提交后再操作');
  await exitWithError();
  return false;
}

// 拉取当前分支远程最新代码
export async function gitPull(showMessage = true) {
  const result = await execCommand('git pull');
  if (showMessage) {
    const branch = await gitGetCurrentBranch();
    logInfo(`拉取 ${branch} 分支最新代码`);
  }
  return result;
}

export async function gitCheckoutBranch(branch: string, logMessage = '') {
  await execCommand('git', ['checkout', branch]);
  logInfo(logMessage || `切换分支到 ${branch}`);
}

// 校验版本号
export function verifyVersion(version: string) {
  const reg = /^[0-9]{1,4}(\.[0-9]{1,4}){2,3}$/;
  return reg.test(version);
}

/**
 * @description: 检测分支是否存在
 * @param {string} branch
 */
export async function checkBranch(branch: string) {
  const [localBranch, remoteBranch] = await Promise.all([execCommand('git branch'), execCommand('git branch -r')]);
  const RegSplit = /\n{1,}\s*/;
  const localBranchArr = localBranch.split(RegSplit);
  const remoteBranchArr = remoteBranch.split(RegSplit);

  const localExist = localBranchArr.includes(branch);
  const remoteExist = Boolean(remoteBranchArr.find(i => i === `${GitInfo.useRemote}/${branch}`));

  return {
    remoteExist,
    localExist,
    allExist: remoteExist && localExist,
    allNotExist: !remoteExist && !remoteExist
  };
}

export async function checkVersionMainBranch(version: string) {
  const versionMainBranch = `${version}/main`;

  const allBranch = await execCommand('git branch -a');
}
