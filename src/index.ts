#!/usr/bin/env node

import type { Command } from 'cac';
import cac from 'cac';
import { loadCliOptions } from './config';
import type { CliOption, EGitVersionActionType } from './types/index';

import { version } from '../package.json';
import {
  getVersion,
  gitCommit,
  gitCommitVerify,
  openStore,
  release,
} from './command';
import {
  backToOriginalBranch,
  deleteTag,
  PingPort as pingPort,
} from './gitActionCommon';

import { exitWithError, logWarn } from './shared';
import UploadVerifyFile from './command/uploadVerify/index';
import { EPlatForm } from './command/uploadVerify/utils';

type CommandName =
  | 'git-commit'
  | 'open'
  | 'git-commit-verify'
  | 'ping [ip]'
  | 'delete-tag [tagName]'
  | 'git-version [actionType]'
  | 'public-verify-vx [fileRoot]'
  | 'public-verify-ali [fileRoot]'
  | 'public-static [fileRoot]'
  | 'public-ad [fileRoot]'
  | 'public-ploperator [fileRoot]'
  | 'public-merchant [fileRoot]'
  | 'release';

type CommandActions<T extends object> = (
  args: T,
  options: Record<string, any>
) => Promise<void> | void;

type CommandWithAction<A extends object = object> = Record<
  CommandName,
  {
    desc: string; // 命令描述
    alias?: string; // 别名
    options?: Parameters<Command['option']>[];
    action: CommandActions<A>; // 执行函数
  }
>;
interface CommandArg {
  total?: boolean;
}
async function setupCli() {
  const cliOptions = await loadCliOptions();

  const cli = cac('ppg');

  cli.version(version).help();

  const commands: CommandWithAction<CommandArg> = {
    'git-commit': {
      desc: '创建一个符合 Conventional Commit 规范的提交信息',
      alias: 'gc',
      action: async () => {
        try {
          await gitCommit(
            cliOptions.gitCommitTypes,
            cliOptions.gitCommitScopes
          );
        } catch (error) {
          exitWithError();
        }
      },
    },
    'git-version [actionType]': {
      desc: '版本分支操作',
      alias: 'gv',
      action: async (actionType) => {
        try {
          await getVersion(<EGitVersionActionType>(<unknown>actionType));
        } catch (error) {
          backToOriginalBranch();
          logWarn(JSON.stringify(error));
          exitWithError();
        }
      },
    },
    'git-commit-verify': {
      desc: '检测最近的一次commit信息是否符合 Conventional Commit规范',
      alias: 'gcv',
      action: async () => {
        await gitCommitVerify();
      },
    },
    'ping [ip]': {
      desc: 'ping ip/域名',
      alias: 'p',
      options: [
        ['-m, --more', 'Whether to ping multiple ips', { default: false }],
      ],
      action: async (ip, options) => {
        await pingPort(options.more, <string>(<unknown>ip));
      },
    },
    'delete-tag [tagName]': {
      desc: '删除远程tag',
      alias: 'dt',
      action: async (tag) => {
        await deleteTag(<string>(<unknown>tag));
      },
    },
    'public-verify-vx [fileRoot]': {
      desc: '将校验文件发布到远程-微信',
      alias: 'pvv',
      action: async (fileRoot) => {
        const uploadVerifyFile = new UploadVerifyFile(EPlatForm.WEChAT);
        await uploadVerifyFile.wxMain(<string>(<unknown>fileRoot));
      },
    },
    'public-verify-ali [fileRoot]': {
      desc: '将校验文件发布到远程-支付宝/抖音',
      alias: 'pva',
      action: async (fileRoot) => {
        const uploadVerifyFile = new UploadVerifyFile(EPlatForm.ALIPAY);
        await uploadVerifyFile.aliMain(<string>(<unknown>fileRoot));
      },
    },
    'public-static [fileRoot]': {
      desc: '将寄递静态资源发布到远程',
      alias: 'ps',
      action: async (fileRoot) => {
        const uploadVerifyFile = new UploadVerifyFile(EPlatForm.STATIC);
        await uploadVerifyFile.staticMain(<string>(<unknown>fileRoot));
      },
    },
    'public-ad [fileRoot]': {
      desc: '将广告态资源发布到远程',
      alias: 'pa',
      action: async (fileRoot) => {
        const uploadVerifyFile = new UploadVerifyFile(EPlatForm.AD_STATIC);
        await uploadVerifyFile.staticAdMain(<string>(<unknown>fileRoot));
      },
    },
    'public-ploperator [fileRoot]': {
      desc: '部署综合运营系统',
      alias: 'ppl',
      action: async (fileRoot) => {
        const uploadVerifyFile = new UploadVerifyFile(EPlatForm.PL_OPERATOR);
        await uploadVerifyFile.plOperatorMain(<string>(<unknown>fileRoot));
      },
    },
    'public-merchant [fileRoot]': {
      desc: '部署SaaS商户后台',
      alias: 'ppm',
      action: async (fileRoot) => {
        const uploadVerifyFile = new UploadVerifyFile(EPlatForm.SAAS_MERCHANT);
        await uploadVerifyFile.saasMerchantMain(<string>(<unknown>fileRoot));
      },
    },
    open: {
      desc: '在浏览器打开当前仓库',
      alias: 'o',
      action: async () => {
        await openStore();
      },
    },
    release: {
      desc: '发布：更新版本号、生成changelog、提交代码',
      alias: 'r',
      action: async () => {
        await release();
      },
    },
  };

  for await (const [
    command,
    { options, desc, action, alias = command.replace(/\s.+/gi, '') },
  ] of Object.entries(commands)) {
    const commandItem = cli.command(command, desc).action(action).alias(alias);
    if (options && options.length) {
      options.forEach((element) => {
        commandItem.option(...element);
      });
    }
  }

  cli
    .command('test', '这是一个描述')
    .alias('tt')
    .option('-r, --recursive', 'Remove recursively', { default: false })
    .action((a, b) => {
      console.log(a, b);
    });

  cli.parse();
}
setupCli();

export type { CliOption };
