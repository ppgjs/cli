import Enquirer from 'enquirer';
import {
  PromptMap,
  execCommand,
  exitWithError,
  getPackageJsonAttr,
  logError,
  logWarn,
  mergePromptOptions,
  watchProcessAccident
} from '../shared';
import { backToOriginalBranch, checkBranch, checkWorkingNoCommit, verifyVersion } from './git-utils';

export class VersionInfo {
  projectName = ''; // 项目名称

  originBranch: string = ''; // 源分支

  versionMainBranch: string = ''; // 版本主分支

  versionNumber: string = ''; // 版本号

  projectMainBranch: string = ''; // 项目主分支

  funcName: string = ''; // 功能分支名称(不包含版本号)

  async init() {
    await this.getProjectName();
    this.originBranch = await execCommand('git', ['symbolic-ref', '--short', 'HEAD']);
    logWarn(`当前分支:${this.originBranch}`);
    const version = this.originBranch.split('/')[0];
    if (verifyVersion(version)) {
      this.versionNumber = version;
      this.setMainBranch();
    }
    await Promise.all([this.setProjectMainBranch()]);
    await checkWorkingNoCommit();
    // 监听程序中断意外退出
    watchProcessAccident(backToOriginalBranch);
  }

  setMainBranch() {
    this.versionMainBranch = `${this.versionNumber}/main`;
  }

  async setVersionNumber(message?: string) {
    const { version } = await Enquirer.prompt<{ version: string }>([
      mergePromptOptions(PromptMap.inputVersion, JSON.parse(JSON.stringify({ default: this.versionNumber, message })))
    ]);
    this.versionNumber = version;
    logWarn(`当前版本:${this.versionNumber}`);
    this.setMainBranch();
    logWarn(`当前版本主分支:${this.versionMainBranch}`);
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

  setFuncName(funcName: string) {
    this.funcName = funcName;
  }

  // 获取完整功能分支名称 版本号/功能名
  async getFuncFullName() {
    if (!this.funcName) {
      logError('抱歉没有找到功能分支');
      await exitWithError();
    }
    return `${this.versionNumber}/${this.funcName}`;
  }

  async getProjectName() {
    const options = await getPackageJsonAttr({ packageJson: ['name'] });
    if (options && options.name) {
      this.projectName = options.name;
      logWarn(`当前项目名称:${options.name}`);
    }
  }
}
export const versionInfo = new VersionInfo();
