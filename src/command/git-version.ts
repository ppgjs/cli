import {
  backToOriginalBranch,
  checkInvalidBranch,
  checkOriginMainBranchExist,
  checkVersionMainBranch,
  checkVersionMainBranchHasNotMerged,
  createBranchFromProjectMainBranch,
  deleteLocalVersionOriginMain,
  gitDeleteBranch,
  gitGetCurrentBranch,
  gitPullMainNewCode,
  handleMoreProjectBuild,
  mergeAToB,
  versionInfo
} from '../gitActionCommon';
import { chooseActionType } from '../gitActionCommon/other';
import { exitWithSuccess, logError, logSuccess, logWarn } from '../shared';
import { EGitVersionActionType } from '../types';

// merge 入口
const mergeEnter = async () => {
  await checkInvalidBranch();
  await versionInfo.setVersionNumber();

  await gitPullMainNewCode();
  await mergeAToB(versionInfo.projectMainBranch, versionInfo.originBranch);
  await mergeAToB(versionInfo.originBranch, versionInfo.versionMainBranch);
  await backToOriginalBranch();
  await gitDeleteBranch(versionInfo.versionMainBranch);
};

// new 入口
const newEntrance = async () => {
  await versionInfo.setVersionNumber();
  await checkVersionMainBranch();
  await createBranchFromProjectMainBranch();
};

// check 入口
const checkEntrance = async () => {
  await versionInfo.setVersionNumber();
  await checkOriginMainBranchExist();
  logWarn('准备检测...');
  await checkVersionMainBranchHasNotMerged();
  logSuccess(`检测完成,${versionInfo.versionNumber} 版本的分支全部已合并到主分支`);
  await backToOriginalBranch();
};

// build 入口
const buildEntrance = async () => {
  await versionInfo.setVersionNumber();
  await checkOriginMainBranchExist();
  await mergeAToB(versionInfo.versionMainBranch, versionInfo.projectMainBranch);
  await checkVersionMainBranchHasNotMerged();

  await handleMoreProjectBuild();

  if (versionInfo.originBranch !== (await gitGetCurrentBranch())) {
    await backToOriginalBranch();
    await deleteLocalVersionOriginMain();
  }
};

// publish 入口
const publishEntrance = async () => {
  console.log('Todo:发布');
};

// fix 入口
const fixEntrance = async () => {
  console.log('Todo:修复');
};
// move 入口
const moveEntrance = async () => {
  console.log('Todo:移动');
};

// 入口函数
export async function getVersion(defaultType?: EGitVersionActionType) {
  await versionInfo.init();
  const actionType = await chooseActionType(defaultType);

  switch (actionType) {
    case EGitVersionActionType.merge:
      await mergeEnter();
      break;

    case EGitVersionActionType.new:
      await newEntrance();
      break;

    case EGitVersionActionType.check:
      await checkEntrance();
      break;

    case EGitVersionActionType.build:
      await buildEntrance();
      break;

    case EGitVersionActionType.publish:
      await publishEntrance();
      break;

    case EGitVersionActionType.fix:
      await fixEntrance();
      break;

    case EGitVersionActionType.move:
      await moveEntrance();
      break;

    default:
      logError(`没有任何脚本可执行 ${actionType}`);
  }
  await exitWithSuccess(false);
}
