import Enquirer from 'enquirer';
import * as kolorist from 'kolorist';
import { GitInfo } from '../config';
import {
  execCommand,
  exitWithError,
  gitProject,
  logError,
  logHint,
  logInfo,
  logSuccess,
  logWarn,
  sleep,
  terminalLog
} from '../shared';
import { versionInfo } from './version-info';

import { Axios } from 'axios';
import dayjs from 'dayjs';
import { readFileSync, statSync } from 'fs-extra';
import path from 'path';
import { stringify } from 'querystring';
import { RegGitVersion, RegResultSplitToArr } from './git-regexp';
import {
  chooseAnCheck,
  chooseBuildEnv,
  chooseIsBuild,
  chooseMergeRequestTargetBranch,
  chooseOfficialBuildProject
} from './other';
import { openAndClearUpdateMdFile, openUpdateMdFile } from './update-md';

// 退回到原分支
export function backToOriginalBranch() {
  return gitCheckoutBranch(versionInfo.originBranch);
}

// 合并分支 A分支 合并到 B分支
export async function mergeAToB(A: string, B: string) {
  logInfo(`合并分支:${A} to ${B}`);

  // 拉取A分支最新代码
  await gitCheckoutBranch(A, '', false);
  await gitPull(false);

  await gitCheckoutBranch(B);
  await gitPull(false);
  try {
    await execCommand('git', ['merge', A, '--no-edit']);
  } catch (error) {
    terminalLog.start('等待解决合并冲突');
    await verifyMergeStatus();
  }
  await gitPush();
  terminalLog.SuccessEnd(`合并分支:${A} to ${B} 合并完成`);
}

// 拉取master最新代码
export async function gitPullMainNewCode() {
  await gitCheckoutBranch(versionInfo.projectMainBranch);
  await gitPull(true);
}

// 检测当前分支是否支持执行脚本
export async function checkInvalidBranch() {
  if (
    versionInfo.originBranch === 'master' ||
    versionInfo.originBranch === 'main' ||
    versionInfo.originBranch.endsWith('/main')
  ) {
    logError(`当前分支 ${versionInfo.originBranch} 错误，不能进行操作`);
    return exitWithError();
  }
  return true;
}

// 获取当前分支
export async function gitGetCurrentBranch() {
  return execCommand('git', ['symbolic-ref', '--short', 'HEAD']);
}

export function readGitlabToken(): string {
  const systemDefaultPath = process.env.HOME;
  if (!systemDefaultPath) {
    logError('没有找到系统默认路径');
    return '';
  }

  const TOKEN_FILE_NAME = 'gitlab.token';
  const gitlabTokenPath = path.join(systemDefaultPath, TOKEN_FILE_NAME);

  try {
    statSync(gitlabTokenPath);
  } catch (error) {
    logError(`没有找到 ${gitlabTokenPath} 文件`);
    logWarn(`请创建并写在 ${systemDefaultPath} 目录下的 ${TOKEN_FILE_NAME} 文件中，内容为GitLab个人访问令牌`);
    logInfo('导航链接: http://git.rantron.biz:3002/-/profile/personal_access_tokens');
    return '';
  }
  let gitlabToken = '';
  try {
    gitlabToken = readFileSync(gitlabTokenPath, { encoding: 'utf8' });
    if (!gitlabToken) throw new Error('文件没有内容');
  } catch (error) {
    logError(`读取 ${gitlabTokenPath} 文件失败，请检查文件是否正常`);
  }
  return gitlabToken;
}

// 获取项目远程的名称
export async function getProjectRemoteName() {
  const { value } = await gitProject.getConfig(`remote.${GitInfo.useRemote}.url`);

  const regex = /\/([^/]+)\.git$/;
  const match = value?.match(regex);

  if (match) {
    const projectName = match[1];
    return projectName;
  }
  throw new Error('获取项目名称错误');
}

// gitlab根据项目名称获取 项目id
export async function getGitlabProjectIdByProjectName(projectName: string, gitlabToken: string) {
  try {
    const axios = new Axios({ headers: { 'PRIVATE-TOKEN': gitlabToken } });
    const result = await axios.get(`http://git.rantron.biz:3002/api/v4/projects?search=${projectName}`);
    const parseData = JSON.parse(result.data);
    const projectId = parseData?.[0]?.id;
    if (projectId) return projectId;
  } catch (error: any) {
    logInfo(error);
  }
  throw new Error('获取 项目id 错误啦');
}

type IMergeRequestParams = {
  projectId: string;
  gitlabToken: string;
  originBranch: string;
  targetBranch: string;
};

// gitlab根据项目id 发起合并请求
export async function getGitlabLaunchMergeRequestByProjectId({
  projectId,
  gitlabToken,
  originBranch,
  targetBranch
}: IMergeRequestParams) {
  try {
    const axios = new Axios({ headers: { 'PRIVATE-TOKEN': gitlabToken } });
    const result = await axios.post(
      `http://git.rantron.biz:3002/api/v4/projects/${projectId}/merge_requests`,
      stringify({
        source_branch: originBranch,
        target_branch: targetBranch,
        title: `new merge request  ${originBranch} -> ${targetBranch}`
      })
    );
    const parseData = JSON.parse(result.data);

    if (parseData.iid /* 请求成功 */) {
      logInfo(`合并请求 ${originBranch} -> ${originBranch} 创建成功，请求id：${parseData.iid}，找项目负责人进行审核`);
      logInfo(`导航链接: ${parseData.web_url}`);
      return true;
    } else if (parseData.message) {
      console.log(`${kolorist.red('请求合并发生错误，')}${kolorist.lightMagenta(`错误信息：${parseData.message}`)}`);
    } else {
      throw parseData;
    }
  } catch (error: any) {
    console.log('🏷️ ~ error:', error);
    logError(error);
  }
  return false;
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
export async function gitPush(showMessage = true, branch = '') {
  const pushUseBranch = branch || (await gitGetCurrentBranch());

  try {
    const result = await execCommand('git', ['push', '-u', GitInfo.useRemote, pushUseBranch]);
    if (showMessage) {
      logSuccess(`推送分支 ${pushUseBranch} 到 远程 ${GitInfo.useRemote} `);
    }
    return result;
  } catch (error) {
    logError(`推送失败 ${pushUseBranch} `);
    return Promise.reject(error);
  }
}

// 拉取当前分支远程最新代码
export async function gitPull(showMessage = true) {
  const result = await execCommand('git', ['pull']);
  if (showMessage) {
    const branch = await gitGetCurrentBranch();
    logSuccess(`拉取 ${branch} 分支最新代码`);
  }
  return result;
}

// 切换分支
export async function gitCheckoutBranch(branch: string, logMessage = '', showLog = true) {
  const currentBranch = await gitGetCurrentBranch();
  if (currentBranch === branch) return true;
  await execCommand('git', ['checkout', branch]);
  if (showLog) {
    logSuccess(logMessage || `切换分支到 ${branch} `);
  }
  return true;
}

// 删除分支
export async function gitDeleteBranch(
  branchName: string,
  options: {
    deleteRemote?: boolean;
    deleteLocal?: boolean;
    showLog?: boolean;
    logMessage?: string;
  } = {
    deleteRemote: false,
    deleteLocal: true,
    showLog: true,
    logMessage: ''
  }
) {
  if (options.deleteLocal) {
    await execCommand('git', ['branch', '-d', branchName]);
  }
  if (options.deleteRemote) {
    await execCommand('git', ['push', GitInfo.useRemote, '--delete', branchName]);
  }
  if ((options.deleteLocal || options.deleteRemote) && options.showLog)
    logSuccess(options?.logMessage || `删除分支 ${branchName} 成功`);
}

// 校验版本号
export function verifyVersion(version: string) {
  return RegGitVersion.test(version);
}

// 检测分支是否存在
export async function checkBranch(branch: string) {
  const [localBranch, remoteBranch] = await Promise.all([execCommand('git branch'), execCommand('git branch -r')]);
  const localBranchArr = localBranch.split(RegResultSplitToArr).map(i => i.replace(/\*\s/, ''));
  const remoteBranchArr = remoteBranch.split(RegResultSplitToArr);

  const localExist = localBranchArr.includes(branch);
  const remoteExist = Boolean(remoteBranchArr.find(i => i === `${GitInfo.useRemote}/${branch}`));

  return {
    remoteExist,
    localExist,
    allExist: remoteExist && localExist,
    allNotExist: !remoteExist && !remoteExist
  };
}

// 删除本地版本主分支
export async function deleteLocalVersionOriginMain() {
  await gitDeleteBranch(versionInfo.versionMainBranch, { showLog: false });
  return true;
}

// 检测版本main分支是否存在 不存在则新建
export async function checkVersionMainBranch(mainBranch: string = versionInfo.versionMainBranch) {
  const pushMain = async (showMessage = true) => {
    await gitPush(showMessage, mainBranch);
    await deleteLocalVersionOriginMain();
  };

  const mainExist = await checkBranch(mainBranch);
  if (mainExist.allNotExist) {
    await gitPullMainNewCode();
    await execCommand('git', ['branch', mainBranch]);
    await pushMain(false);
    logSuccess(`创建版本主分支 ${mainBranch}，并推送到远程`);
  } else if (mainExist.localExist) {
    await pushMain();
  }
  await gitCheckoutBranch(versionInfo.projectMainBranch, '', false);
  await deleteLocalVersionOriginMain();
}

// 解析功能分支名称
function parseFuncName(branch: string) {
  const fragment = branch.split('/');
  if (!fragment.length) throw new Error(`没有解析出功能分支`);
  return fragment.pop() as string;
}

// 解析 源功能分支名称
export async function parseFuncFromBranch() {
  const funcName = parseFuncName(versionInfo.originBranch);
  versionInfo.setFuncName(funcName);
  logInfo(`当前功能:${versionInfo.funcName}`);
}

// 读取功能分支
export async function readFunc() {
  if (!versionInfo.funcName) {
    const { inputFuncName } = await Enquirer.prompt<{ inputFuncName: string }>({
      name: 'inputFuncName',
      type: 'text',
      message: '请输入新功能名',
      validate: text => {
        const trim = text.trim();
        if (!trim.length) {
          return '请输入有效的功能名称 ps: addPage | fixError';
        } else if (/\s/.test(trim)) {
          return '输入的版本号之间不能包含空格 ps: addPage | fixError';
        }
        return true;
      }
    });
    versionInfo.setFuncName(inputFuncName.trim());
  }
  logInfo(`当前功能:${versionInfo.funcName}`);
}

// 检查功能分支是否存在
export async function checkFunBranchExist() {
  const funcBranch = await versionInfo.getFuncFullName();
  const { localExist, remoteExist, allExist } = await checkBranch(funcBranch);
  if (allExist) {
    logError(`版本功能分支 ${funcBranch} 已存在!!!`);
    return true;
  } else if (remoteExist) {
    logError(`版本功能分支 ${funcBranch} 远程已经存在!!!`);
    return true;
  } else if (localExist) {
    logError(`版本功能分支 ${funcBranch} 本地已经存在!!!`);
    return true;
  }
  return false;
}

// 创建功能分支 并推送到远程
export async function createBranchFromProjectFuncBranch() {
  await readFunc();
  const exist = await checkFunBranchExist();
  if (exist) {
    await backToOriginalBranch();
    await exitWithError();
  }

  await gitPullMainNewCode();

  const funcBranch = await versionInfo.getFuncFullName();
  await execCommand('git', ['checkout', '-b', funcBranch]);
  await gitPush();
  logSuccess(`${funcBranch} 功能分支创建完成`);
}

// 检查远程版本主分支是否存在
export async function checkOriginMainBranchExist() {
  const exist = await checkBranch(versionInfo.versionMainBranch);
  if (!exist.remoteExist) {
    logError(`抱歉 ${versionInfo.versionMainBranch} 版本主分支不存在`);
    await exitWithError();
  }
  return true;
}

// 检测分支是否是该项目主分支
export function checkBranchIsProjectMainBranch(branch: string) {
  return (
    branch === versionInfo.projectMainBranch ||
    branch === `remotes/${GitInfo.useRemote}/${versionInfo.projectMainBranch}`
  );
}

// 检测分支是否是该版本分支
function checkBranchIsVersionFuncBranch(branch: string) {
  if (
    branch.startsWith(versionInfo.versionNumber) ||
    branch.includes(`${GitInfo.useRemote}/${versionInfo.versionNumber}/`)
  )
    return true;
  return false;
}

// 检测是否有该版本的功能分支未合并到主分支
export async function checkVersionMainBranchHasNotMerged() {
  await gitCheckoutBranch(versionInfo.versionMainBranch);
  await gitPull();
  const noMergeResult = await execCommand('git', ['branch', '-a', '--no-merged']);
  const noMergeBranchArr = noMergeResult.split(RegResultSplitToArr);

  try {
    const versionFuncNoMergeArr: string[] = [];
    noMergeBranchArr.forEach((branch: string) => {
      if (checkBranchIsProjectMainBranch(branch) || checkBranchIsVersionFuncBranch(branch)) {
        const localBranch = branch.replace(`remotes/${GitInfo.useRemote}/`, '');
        if (!versionFuncNoMergeArr.includes(localBranch)) versionFuncNoMergeArr.push(localBranch);
      }
    });
    if (versionFuncNoMergeArr.length) {
      throw new Error(`分支 [${kolorist.green(versionFuncNoMergeArr.join('，'))}] 还没合并，请先合并后再 发布/打包`);
    }
  } catch (error: any) {
    logError(error);
    await backToOriginalBranch();

    if (versionInfo.originBranch !== (await gitGetCurrentBranch())) {
      await deleteLocalVersionOriginMain();
    }

    await exitWithError();
  }
}

// 处理打包
export async function startBuild(defaultIsBuild = true) {
  const isBuild = await chooseIsBuild(defaultIsBuild);
  if (isBuild) {
    logInfo('开始打包...');
    try {
      await execCommand('npm', ['run', 'build'], {
        stdio: 'inherit'
      });
      logSuccess('编译完成!');
      return true;
    } catch (error) {
      logError('编译失败!');
      return false;
    }
  }
  return false;
}

// 普通的打包
async function handleBuildNormal(hasOpenUpdateMdFile = true) {
  if (hasOpenUpdateMdFile) {
    await openUpdateMdFile();
  }
  const buildStatus = await startBuild();

  if (buildStatus) {
    const hasPush = await chooseAnCheck('是否需要将打包好的文件推送到远端');
    if (hasPush) {
      await gitProject.add('./*').commit(`chore: build test branch ${dayjs().format('M-D_H:m')}`);
      await gitPush();
    }
  }
}
// 综合运营系统的打包
async function handleBuildOperatorTs() {
  await openUpdateMdFile();
  const buildEnv = await chooseBuildEnv();
  switch (buildEnv) {
    case 'dev':
      await mergeAToB(versionInfo.versionMainBranch, 'dev');
      await startBuild();
      await gitProject.add('./*').commit('build dist');

      console.log(kolorist.bgLightRed('接下来干这事：'));
      console.log(kolorist.bgLightRed('    钉钉@cyc，cyc会打包部署到dev环境'));
      break;
    case 'test':
      await startBuild();
      await gitProject.add('./*').commit('build dist');
      await gitPush();
      console.log(kolorist.bgLightRed('接下来干这事：'));
      console.log(kolorist.bgLightRed('    自己不行就呼叫测试或者后端同学构建部署该分支，即可在test环境进行测试'));
      break;
    case 'prod':
      console.log(kolorist.bgLightRed('接下来干这事：'));
      console.log(kolorist.bgLightRed('    钉钉@cyc，告诉他升级的分支，cyc会打包部署到prod环境'));
      break;
    default:
      logError(`Error:${buildEnv}`);
  }
}
// 开放平台的打包
async function handleBuildOfficialTs() {
  const selectProject = await chooseOfficialBuildProject();
  await execCommand('npm', ['run', `build:${selectProject}`], { stdio: 'inherit' });
  console.log(kolorist.bgLightRed('接下来干这事：'));
  console.log(kolorist.bgLightRed('    钉钉@cyc，将打包文件发给他'));
}

// 不同项目的打包特殊处理 测试环境
export async function handleMoreProjectBuildByTest() {
  switch (versionInfo.projectName) {
    case 'operator-ts':
      await handleBuildOperatorTs();
      break;
    case 'official-ts':
      await handleBuildOfficialTs();
      break;
    default:
      await handleBuildNormal(false);
  }
}

// 不同项目的打包特殊处理
export async function handleMoreProjectBuild() {
  switch (versionInfo.projectName) {
    case 'operator-ts':
      await handleBuildOperatorTs();
      break;
    case 'official-ts':
      await handleBuildOfficialTs();
      break;
    default:
      await handleBuildNormal();
  }
}

// 退出的时候处理分支
export async function exitHandleCurrentBranch() {
  if (versionInfo.originBranch !== (await gitGetCurrentBranch())) {
    await backToOriginalBranch();
    await deleteLocalVersionOriginMain();
  }
}

// 发布的时候添加tag
export async function publishAddTag() {
  const tagName = `${versionInfo.versionNumber}/publish/${dayjs().format('YY/M/D')}`;
  await execCommand('git', ['tag', '-f', tagName]);
  await execCommand('git', ['push', '-f', GitInfo.useRemote, tagName]);
  logInfo(`版本增加tag${tagName}`);
}

// 旧的发版流程
export async function oldPublish() {
  logHint('准备发布...');
  await mergeAToB(versionInfo.versionMainBranch, versionInfo.projectMainBranch);

  await publishAddTag();

  await openAndClearUpdateMdFile();
  await gitProject.add('./*').commit(`升级版本：${versionInfo.versionNumber}`);
  await gitPush();

  await exitHandleCurrentBranch();
  logSuccess(`${versionInfo.versionNumber} 版本发布成功`);
}

// 迁移功能分支
export async function moveFuncBranch() {
  const exist = await checkFunBranchExist();
  if (exist) {
    await backToOriginalBranch();
    await exitWithError();
  }

  const oldVersion = versionInfo.originBranch.split('/')[0];
  const oldMainBranch = `${oldVersion}/main`;
  const newVersionBranch = await versionInfo.getFuncFullName();

  await execCommand('git', ['branch', '-m', versionInfo.originBranch, newVersionBranch]);

  gitPush();
  logInfo(`修改分支 ${versionInfo.originBranch} 为 ${newVersionBranch}`);
  await gitDeleteBranch(versionInfo.originBranch, { deleteRemote: true });
  logWarn(`删除远程分支 ${versionInfo.originBranch}`);

  // 删除旧的功能主分支
  const { remoteExist, localExist } = await checkBranch(oldMainBranch);
  if (remoteExist || localExist) {
    await gitDeleteBranch(oldMainBranch, {
      deleteRemote: remoteExist,
      deleteLocal: localExist,
      showLog: false
    });
  }

  // 创建旧的版本主分支
  await checkVersionMainBranch(oldMainBranch);

  await gitCheckoutBranch(newVersionBranch);
}

export async function createFixBranch() {
  const fixBranchName = 'fixOnline';
  versionInfo.setFuncName(fixBranchName);
  const fixBranchFullName = await versionInfo.getFuncFullName();
  const exist = await checkFunBranchExist();
  if (exist) {
    await gitProject.checkout(fixBranchFullName);
  } else {
    terminalLog.start('修复分支创建中');
    await gitProject.checkoutLocalBranch(fixBranchFullName).push(GitInfo.useRemote, fixBranchFullName, ['-u']);
    terminalLog.SuccessEnd('修复分支创建完成');
  }
}

/* 获取mq的目标分支名称 */
export async function getMergeRequestTargetBranch() {
  const { all } = await gitProject.branch(['-r']);

  const branchList = all
    .filter(
      branchName =>
        branchName.includes(`${GitInfo.useRemote}/${versionInfo.versionNumber}/`) &&
        !branchName.endsWith(`${GitInfo.useRemote}/${versionInfo.originBranch}`)
    )
    .sort((a, b) => {
      if (a.includes('main') && !b.includes('main')) {
        return -1;
      } else if (!a.includes('main') && b.includes('main')) {
        return 1;
      }
      return 0;
    });
  if (!branchList.length) {
    await backToOriginalBranch();
    throw new Error('没有其他版本分支');
  }
  const targetBranchName = await chooseMergeRequestTargetBranch(branchList);
  return targetBranchName.replace(`${GitInfo.useRemote}/`, '');
}

export const getMergeRquestOriginBranch = async (targetBranch: string): Promise<string> => {
  const tempBranch = `${versionInfo.originBranch}_temp_merge`;
  let originBranch = versionInfo.originBranch;
  let hasConflict = true; /* 存在冲突 */
  try {
    /* 预检测合并是否有冲突 */
    await execCommand('git', ['merge', `${GitInfo.useRemote}/${targetBranch}`, '--no-commit']);
    gitProject.merge(['--abort']);
    hasConflict = false;
  } catch (error) {
    logWarn('和版本主分支存在冲突，先在当前分支解决冲突后再提交合并请求。');
    gitProject.merge(['--abort']);
    // 存在冲突 创建临时分支提交合并请求
  }
  // 删除临时分支
  try {
    await Promise.all([
      execCommand('git', ['push', '--delete', GitInfo.useRemote, tempBranch]),
      execCommand('git', ['branch', '-d', tempBranch])
    ]);
  } catch (error: any) {}

  if (hasConflict) {
    /* 有冲突 缘分支切换为临时分支 */
    originBranch = tempBranch;
    await execCommand('git', ['checkout', '-b', tempBranch]);
    await gitPush();
    await mergeAToB(targetBranch, tempBranch);
  }

  return originBranch;
};
