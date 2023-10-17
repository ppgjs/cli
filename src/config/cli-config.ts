import type { CliOption } from '../index';
const eslintExt = '*.{js,jsx,mjs,cjs,json,ts,tsx,mts,cts,vue,svelte,astro}';

import { loadConfig } from 'c12';
import { getPackageJsonAttr } from '../shared';

const defaultOptions: CliOption = {
  cwd: process.cwd(),
  cleanupDirs: [
    '**/dist',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/pnpm-lock.yaml',
    '**/node_modules',
    '!node_modules/**'
  ],
  gitCommitTypes: [
    ['init', '项目初始化'],
    ['feat', '添加新特性'],
    ['fix', '修复bug'],
    ['docs', '仅仅修改文档'],
    ['style', '仅仅修改了空格、格式缩进、逗号等等，不改变代码逻辑'],
    ['refactor', '代码重构，没有加新功能或者修复bug'],
    ['perf', '优化相关，比如提升性能、体验'],
    ['test', '添加测试用例'],
    ['build', '依赖相关的内容'],
    ['ci', 'CI配置相关，例如对k8s，docker的配置文件的修改'],
    ['chore', '改变构建流程、或者增加依赖库、工具等'],
    ['revert', '回滚到上一个版本']
  ],
  gitCommitScopes: [
    ['projects', '项目搭建'],
    ['components', '组件相关'],
    ['hooks', 'hook 相关'],
    ['utils', 'utils 相关'],
    ['types', 'ts类型相关'],
    ['styles', '样式相关'],
    ['deps', '项目依赖'],
    ['auth', '对 auth 修改'],
    ['release', '版本发布'],
    ['other', '其他修改']
  ],
  ncuCommandArgs: ['--deep', '-u'],
  changelogOptions: {},
  prettierWriteGlob: [
    `!**/${eslintExt}`,
    '!*.min.*',
    '!CHANGELOG.md',
    '!dist',
    '!LICENSE*',
    '!output',
    '!coverage',
    '!public',
    '!temp',
    '!package-lock.json',
    '!pnpm-lock.yaml',
    '!yarn.lock',
    '!.github',
    '!__snapshots__',
    '!node_modules'
  ],
  lintStagedConfig: {
    [eslintExt]: 'eslint --fix',
    '*': 'soy prettier-write'
  }
};
export async function loadCliOptions(overrides?: Partial<CliOption>, cwd = process.cwd()) {
  const options = {
    overrides,
    name: 'ppg',
    defaults: defaultOptions,
    cwd,
    packageJson: ['name']
  };
  const { config: c12Config } = await loadConfig(options);

  const pkgJson = await getPackageJsonAttr(options);

  const config = Object.assign(c12Config || {}, pkgJson);

  return config as CliOption;
}
