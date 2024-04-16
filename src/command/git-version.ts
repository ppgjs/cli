import {
  backToOriginalBranch,
  checkInvalidBranch,
  checkOriginMainBranchExist,
  checkVersionMainBranch,
  checkVersionMainBranchHasNotMerged,
  createBranchFromProjectFuncBranch,
  createFixBranch,
  exitHandleCurrentBranch,
  getGitlabLaunchMergeRequestByProjectId,
  getGitlabProjectIdByProjectName,
  getProjectRemoteName,
  gitDeleteBranch,
  gitPullMainNewCode,
  handleMoreProjectBuild,
  handleMoreProjectBuildByTest,
  mergeAToB,
  moveFuncBranch,
  oldPublish,
  parseFuncFromBranch,
  readGitlabToken,
  versionInfo
} from '../gitActionCommon';
import { chooseActionType } from '../gitActionCommon/other';
import { exitWithSuccess, gitProject, logError, logSuccess, logWarn } from '../shared';
import { EGitVersionActionType } from '../types';
import { openStore } from './open-git-store';

// merge Request 入口
const mergeRequestEnter = async () => {
  await checkInvalidBranch();
  await versionInfo.setVersionNumber();

  await gitPullMainNewCode();

  await mergeAToB(versionInfo.projectMainBranch, versionInfo.originBranch);

  await backToOriginalBranch();

  const gitlabToken = readGitlabToken();
  if (!gitlabToken) return;

  const projectName = await getProjectRemoteName();

  const projectId = await getGitlabProjectIdByProjectName(projectName, gitlabToken);
  await getGitlabLaunchMergeRequestByProjectId({
    projectId,
    gitlabToken,
    originBranch: versionInfo.originBranch,
    targetBranch: versionInfo.versionMainBranch
  });
};

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
  await createBranchFromProjectFuncBranch();
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
  // await mergeAToB(versionInfo.projectMainBranch, versionInfo.versionMainBranch);
  await checkVersionMainBranchHasNotMerged();

  await handleMoreProjectBuild();

  await exitHandleCurrentBranch();
};

// publish 入口
const publishEntrance = async () => {
  await versionInfo.setVersionNumber();

  await checkOriginMainBranchExist();
  // await mergeAToB(versionInfo.projectMainBranch, versionInfo.versionMainBranch);
  await checkVersionMainBranchHasNotMerged();

  // 新项目中只能在 gitlab 中提交合并
  const useProjectFile = ['fhd_miniprogram_monorepo'];
  if (useProjectFile.includes(versionInfo.projectName)) {
    logError(`在gitlab中提交合并请求，将 ${versionInfo.versionMainBranch} 合并到 ${versionInfo.projectMainBranch}`);
    await openStore();
  } else {
    await oldPublish();
  }
};

// fix 入口
const fixEntrance = async () => {
  await gitProject.checkout(versionInfo.projectMainBranch).pull();
  await versionInfo.setVersionNumber('请输入修复的版本号');
  await createFixBranch();
};

// move 入口
const moveEntrance = async () => {
  await checkInvalidBranch();

  await parseFuncFromBranch();

  await versionInfo.setVersionNumber('请输入迁移的目标版本号');

  await checkVersionMainBranch();

  await moveFuncBranch();
};
// test 入口
const testEntrance = async () => {
  await checkInvalidBranch();
  await versionInfo.setVersionNumber();

  await checkVersionMainBranchHasNotMerged(); // 检测分支是否有代码没有合并到版本主分支

  await mergeAToB(versionInfo.versionMainBranch, 'test');

  await handleMoreProjectBuildByTest(); // 打包

  await backToOriginalBranch();

  await gitDeleteBranch(versionInfo.versionMainBranch);
};

// 入口函数
export async function getVersion(defaultType?: EGitVersionActionType) {
  await versionInfo.init();
  const actionType = await chooseActionType(defaultType);

  switch (actionType) {
    case EGitVersionActionType.mq:
      await mergeRequestEnter();
      break;

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
    case EGitVersionActionType.test:
      await testEntrance();
      break;

    default:
      logError(`没有任何脚本可执行 ${actionType}`);
  }
  await exitWithSuccess(false);
}
