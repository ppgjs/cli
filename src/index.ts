import cac from 'cac';
import { loadCliOptions } from './config';
import type { CliOption } from './types/index';

import { version } from '../package.json';
import { getVersion, gitCommit } from './command';

type Command = 'test' | 'git-version';

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
    test: {
      desc: '这是一个测试脚本',
      action: async () => {
        await gitCommit(cliOptions.gitCommitTypes, cliOptions.gitCommitScopes);
      }
    },
    'git-version': {
      desc: '分支操作流程',
      action: async () => {
        await getVersion();
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
