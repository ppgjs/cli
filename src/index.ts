#!/usr/bin/env node

import cac from 'cac';
import { loadCliOptions } from './config';
import type { CliOption, EGitVersionActionType } from './types/index';

import { version } from '../package.json';
import { getVersion, gitCommit, gitCommitVerify, openStore } from './command';
import { exitWithError } from './shared';

type Command = 'git-commit' | 'open' | 'git-commit-verify' | 'git-version [actionType]';

type CommandActions<T extends object> = (args?: T) => Promise<void> | void;

type CommandWithAction<A extends object = object> = Record<
  Command,
  {
    desc: string;
    alias?: string;
    action: CommandActions<A>;
  }
>;

interface CommandArg {
  total?: boolean;
}
async function setupCli() {
  const cliOptions = await loadCliOptions();

  const cli = cac('pz');

  cli.version(version).option('--total', 'Generate changelog by total tags').help();

  const commands: CommandWithAction<CommandArg> = {
    'git-commit': {
      desc: '创建一个符合 Conventional Commit 规范的提交信息',
      alias: 'gc',
      action: async () => {
        try {
          await gitCommit(cliOptions.gitCommitTypes, cliOptions.gitCommitScopes);
        } catch (error) {
          exitWithError();
        }
      }
    },
    'git-version [actionType]': {
      desc: '分支操作流程',
      action: async actionType => {
        try {
          await getVersion(<EGitVersionActionType>(<unknown>actionType));
        } catch (error) {
          exitWithError();
        }
      }
    },
    'git-commit-verify': {
      desc: '检测最近的一次commit信息是否符合 Conventional Commit规范',
      action: async () => {
        await gitCommitVerify();
      }
    },
    open: {
      desc: '在浏览器打开当前仓库',
      action: async () => {
        await openStore();
      }
    }
  };

  for await (const [command, { desc, action, alias = command.replace(/\s.+/gi, '') }] of Object.entries(commands)) {
    cli.command(command, desc).action(action).alias(alias);
  }

  cli
    .command('test', '这是一个描述')
    .alias('tt')
    .action(() => {
      console.log('75行 - index.ts  => ', '执行了');
    });

  cli.parse();
}
setupCli();

export type { CliOption };
