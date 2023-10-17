import type { SimpleGitOptions } from 'simple-git';
import { simpleGit } from 'simple-git';

const options: Partial<SimpleGitOptions> = {
  baseDir: process.cwd(),
  binary: 'git',
  maxConcurrentProcesses: 6,
  trimmed: false
};

// 当前项目使用的git
export const gitProject = simpleGit(options);
