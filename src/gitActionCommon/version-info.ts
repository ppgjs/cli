import Enquirer from 'enquirer';
import {
  PromptMap,
  execCommand,
  exitWithError,
  logError,
  logInfo,
  mergePromptOptions,
  watchProcessAccident
} from '../shared';
import { backToOriginalBranch, checkBranch, checkWorkingNoCommit, verifyVersion } from './git-utils';

export class VersionInfo {
  originBranch: string = ''; // 源分支

  versionMainBranch: string = ''; // 版本主分支

  versionNumber: string = ''; // 版本号

  projectMainBranch: string = ''; // 项目主分支

  async init() {
    this.originBranch = await execCommand('git', ['symbolic-ref', '--short', 'HEAD']);
    const version = this.originBranch.split('/')[0];
    if (verifyVersion(version)) {
      this.versionNumber = version;
      this.setMainBranch();
    }
    await this.setProjectMainBranch();
    await checkWorkingNoCommit();
    // 监听程序中断意外退出
    watchProcessAccident(backToOriginalBranch);
  }

  setMainBranch() {
    this.versionMainBranch = `${this.versionNumber}/main`;
  }

  async setVersionNumber() {
    const { version } = await Enquirer.prompt<{ version: string }>([
      mergePromptOptions(PromptMap.inputVersion, { default: this.versionNumber })
    ]);
    this.versionNumber = version;
    logInfo(`当前版本:${this.versionNumber}`);
    this.setMainBranch();
    logInfo(`当前版本主分支:${this.versionMainBranch}`);
  }

  async setProjectMainBranch() {
    const [master, main] = await Promise.all([checkBranch('master'), checkBranch('main')]);
    if (master.remoteExist) this.projectMainBranch = `master`;
    else if (main.remoteExist) this.projectMainBranch = `main`;
    else {
      logError(`当前项目缺少主分支:${this.versionMainBranch}`);
      await exitWithError();
    }
  }
}
export const versionInfo = new VersionInfo();
