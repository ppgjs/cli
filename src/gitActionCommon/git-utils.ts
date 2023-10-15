import { GitInfo } from '../config';
import { execCommand, exitWithError, logError, logSuccess, logWarn, sleep, terminalLog } from '../shared';
import { versionInfo } from './version-info';

// 退回到原分支
export function backToOriginalBranch() {
  return gitCheckoutBranch(versionInfo.originBranch);
}

// 合并分支 A分支 合并到 B分支
export async function mergeAToB(A: string, B: string) {
  logWarn(`合并分支:${A} to ${B}`);
  await gitCheckoutBranch(B);
  try {
    const res = await execCommand('git', ['merge', A, '--no-edit']);
    console.log('🚀 ~ file: git-version.ts:92 ~ res:', res);
    logWarn(`合并分支:${A} to ${B}`);
    terminalLog.SuccessEnd(`合并分支:${A} to ${B} 合并成功`);
  } catch (error) {
    terminalLog.start('等待解决合并冲突');
    await verifyMergeStatus();
    terminalLog.SuccessEnd(`合并分支:${A} to ${B} 合并完成`);
  }
  await gitPull();
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

// 检测合并状态 是否合并完成
export async function verifyMergeStatus() {
  await sleep();
  const status = await checkWorkingStatus();
  if (status.includes('nothing to commit')) return true;
  return verifyMergeStatus();
}

// 推送当前分支到远程
export async function gitPush(showMessage = true) {
  const result = await execCommand('git', ['push', '-u', GitInfo.useRemote, '-u']);
  if (showMessage) {
    const branch = await gitGetCurrentBranch();
    logSuccess(`推送分支 ${branch} 到 远程${GitInfo.useRemote}`);
  }
  return result;
}

// 拉取当前分支远程最新代码
export async function gitPull(showMessage = true) {
  const result = await execCommand('git pull');
  if (showMessage) {
    const branch = await gitGetCurrentBranch();
    logSuccess(`拉取 ${branch} 分支最新代码`);
  }
  return result;
}

export async function gitCheckoutBranch(branch: string, logMessage = '') {
  await execCommand('git', ['checkout', branch]);
  logSuccess(logMessage || `切换分支到 ${branch}`);
}

// 删除分支
export async function gitDeleteBranch(
  branchName: string,
  options = {
    deleteRemote: false,
    deleteLocal: true,
    logMessage: ''
  }
) {
  if (options.deleteLocal) {
    await execCommand('git', ['branch', '-d', branchName]);
  }
  if (options.deleteRemote) {
    await execCommand('git', ['push', GitInfo.useRemote, '--delete', branchName]);
  }
  if (options.deleteLocal || options.deleteRemote) logSuccess(options?.logMessage || `删除分支 ${branchName} 成功`);
}

// 校验版本号
export function verifyVersion(version: string) {
  const reg = /^.*[0-9]{1,4}(\.[0-9]{1,4}){2,3}$/;
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
