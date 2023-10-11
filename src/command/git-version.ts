import Enquirer from 'enquirer';
import {
  PromptMap,
  execCommand,
  exitWithError,
  gitCheckoutBranch,
  gitPull,
  logError,
  logInfo,
  mergePromptOptions,
  verifyVersion
} from '../shared';

class VersionInfo {
  originBranch: string = ''; // 源分支

  mainBranch: string = ''; // 版本主分支

  versionNumber: string = ''; // 版本号

  async init() {
    this.originBranch = await execCommand('git', ['symbolic-ref', '--short', 'HEAD']);
    logInfo(`当前分支:${this.originBranch}`);

    const version = this.originBranch.split('/')[0];
    if (verifyVersion(version)) {
      this.versionNumber = version;
      this.setMainBranch();
    }
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
  await gitPullMaster();
  await backToOriginalBranch();
}

async function gitPullMaster() {
  // const mainBranch = git config --get init.defaultBranch
  const mainBranch = await execCommand('git config --get init.defaultBranch');
  await gitCheckoutBranch(mainBranch);
  await gitPull(true);
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
