#!/usr/bin/env node

import cac from 'cac';
import { loadCliOptions } from './config';
import type { CliOption } from './types/index';

import { version } from '../package.json';
import { getVersion, gitCommit, gitCommitVerify, openStore } from './command';

type Command = 'git-commit' | 'open' | 'git-commit-verify' | 'git-version';

type CommandActions<T extends object> = (args?: T) => Promise<void> | void;

type CommandWithAction<A extends object = object> = Record<Command, { desc: string; action: CommandActions<A> }>;

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
      action: async () => {
        await gitCommit(cliOptions.gitCommitTypes, cliOptions.gitCommitScopes);
      }
    },
    'git-version': {
      desc: '分支操作流程',
      action: async () => {
        await getVersion();
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

  for await (const [command, { desc, action }] of Object.entries(commands)) {
    cli.command(command, desc).action(action);
  }

  cli.parse();
}
setupCli();

export type { CliOption };
