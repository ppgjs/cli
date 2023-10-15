import { getActionType } from '../gitActionCommon/other';
import {
  backToOriginalBranch,
  gitCheckoutBranch,
  gitDeleteBranch,
  gitPull,
  verifyMergeStatus,
  versionInfo
} from '../gitActionCommon';
import { execCommand, exitWithError, exitWithSuccess, logError, logInfo, logWarn, terminalLog } from '../shared';
import { EGitVersionActionType } from '../types';

async function checkInvalidBranch() {
  if (versionInfo.originBranch === 'master' || versionInfo.originBranch.endsWith('/main')) {
    logError(`当前分支 ${versionInfo.originBranch} 错误，不能进行合并操作`);
    return exitWithError();
  }
  return true;
}

// 拉取master最新代码
async function gitPullMainNewCode() {
  await gitCheckoutBranch(versionInfo.projectMainBranch);
  await gitPull(true);
  logInfo(`拉取 ${versionInfo.projectMainBranch} 最新代码`);
}

async function mergeAToB(A: string, B: string) {
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

const mergeEnter = async () => {
  await checkInvalidBranch();
  await versionInfo.setVersionNumber();

  await gitPullMainNewCode();
  await mergeAToB(versionInfo.projectMainBranch, versionInfo.originBranch);
  await mergeAToB(versionInfo.originBranch, versionInfo.versionMainBranch);
  await backToOriginalBranch();
  await gitDeleteBranch(versionInfo.versionMainBranch);
  await exitWithSuccess();
};

// 入口函数
export async function getVersion(defaultType?: EGitVersionActionType) {
  // await versionInfo.init();
  const actionType = await getActionType(defaultType);
  switch (actionType) {
    case EGitVersionActionType.merge:
      await mergeEnter();
      break;

    default:
      logError(`没有任何脚本可执行 ${actionType}`);
  }
}
