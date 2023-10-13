import Enquirer from 'enquirer';
import {
  PromptMap,
  checkBranch,
  execCommand,
  exitWithError,
  gitCheckoutBranch,
  gitPull,
  logError,
  logInfo,
  mergePromptOptions,
  terminalLog,
  verifyVersion
} from '../shared';
import { sleep } from '../shared/utils';

class VersionInfo {
  originBranch: string = ''; // 源分支

  mainBranch: string = ''; // 版本主分支

  versionNumber: string = ''; // 版本号

  projectMainBranch: string = ''; // 项目主分支

  async init() {
    this.originBranch = await execCommand('git', ['symbolic-ref', '--short', 'HEAD']);
    logInfo(`当前分支:${this.originBranch}`);

    const version = this.originBranch.split('/')[0];
    if (verifyVersion(version)) {
      this.versionNumber = version;
      this.setMainBranch();
    }
    await this.setProjectMainBranch();

    // await checkWorkingNoCommit();
  }

  setMainBranch() {
    this.mainBranch = `${this.versionNumber}/main`;
  }

  async setVersionNumber() {
    const { version } = await Enquirer.prompt<{ version: string }>([
      mergePromptOptions(PromptMap.inputVersion, { default: this.versionNumber })
    ]);
    console.log('40行 - git-version.ts  => ', version);
    this.versionNumber = version;
    logInfo(`当前版本:${this.versionNumber}`);
    this.setMainBranch();
    logInfo(`当前版本主分支:${this.mainBranch}`);
  }

  async setProjectMainBranch() {
    const [master, main] = await Promise.all([checkBranch('master'), checkBranch('main')]);
    if (master.remoteExist) this.projectMainBranch = `master`;
    else if (main.remoteExist) this.projectMainBranch = `main`;
    else {
      logError(`当前项目缺少主分支:${this.mainBranch}`);
      await exitWithError();
    }
    console.log('59行 - git-version.ts  => ', this.projectMainBranch);
  }
}

const versionInfo = new VersionInfo();

async function checkInvalidBranch() {
  if (versionInfo.originBranch === 'master' || versionInfo.originBranch.endsWith('/main')) {
    logError(`当前分支 ${versionInfo.originBranch} 错误，不能进行合并操作`);
    return exitWithError();
  }
  return true;
}
export async function getVersion() {
  await versionInfo.init();
  await checkInvalidBranch();
  await versionInfo.setVersionNumber();

  // await gitPullMainNewCode();
  await mergeAToB(versionInfo.projectMainBranch, versionInfo.originBranch);

  // await backToOriginalBranch();
}

// 拉取master最新代码
async function gitPullMainNewCode() {
  await gitCheckoutBranch(versionInfo.projectMainBranch);
  await gitPull(true);
  logInfo(`拉取 ${versionInfo.projectMainBranch} 最新代码`);
}

async function mergeAToB(A: string, B: string) {
  terminalLog.start('开始合并');
  // await sleep(6000);
  // terminalLog.SuccessEnd('合并成功');
  // console.log('90行 - git-version.ts  => ', A, B);
  // await gitCheckoutBranch(B);
  // try {
  //   const res = await execCommand('git', ['merge', A, '--no-edit']);
  //   console.log('🚀 ~ file: git-version.ts:92 ~ res:', res);
  // } catch (error) {
  //   console.log('🚀 ~ file: git-version.ts:100 ~ error:', error);
  // }
}

async function backToOriginalBranch() {
  await gitCheckoutBranch(versionInfo.originBranch);
}

/* function tryToReadVersion() {
  tryParseVersionFromBranch
  if [[$(echo "${version}" | grep - n "^.*[0-9]\{1,4\}\.[0-9]\{1,4\}\.[0-9]\{1,4\}$") == ""]]; then
  read - p "请输入版本号: " version
  else
  read - p "请输入版本号（如是版本'${version}'，可直接回车）: " version
  fi
  if [["${version}" == ""]]; then
  tryParseVersionFromBranch
  fi
  while [[$(echo "${version}" | grep - n "^.*[0-9]\{1,4\}\.[0-9]\{1,4\}\.[0-9]\{1,4\}$") == ""]]; do
    read - p "请输入正确的版本号（如：1.0.0）: " version
  done
}
 */
