import { render } from 'ejs';
import { glob } from 'fast-glob';
import { existsSync, writeFileSync } from 'fs-extra';
import { join, resolve } from 'path';
import { format } from 'prettier';
import { logError, logHint, logInfo, openFile, readStaticTemplateFileSync } from '../shared';
import { versionInfo } from './version-info';

/**
 * @description: 创建分支
 * @param {*} replace 是否替换
 * @param {*} hint 是否替换失败警告信息
 * @return {*}
 */
export async function createUpdateMdFile(replace = true, hint = false) {
  const updateMdPath = join(process.cwd(), 'doc', 'update.md');
  if (!replace) {
    const updateMdExist = existsSync(updateMdPath);
    if (updateMdExist) {
      if (hint) logHint(`Warn: ${updateMdPath} 已存在`);
      return false;
    }
  }
  const fileTemp = readStaticTemplateFileSync('update_md.ejs');
  if (typeof fileTemp === 'boolean') {
    logError('Error: 创建update.md失败');
    return false;
  }

  const fileContent = render(fileTemp, {
    version: versionInfo.versionNumber
  });
  const fileContentFormat = await format(fileContent, { parser: 'markdown' });

  writeFileSync(updateMdPath, fileContentFormat);
  return true;
}

/**
 * @description: 打开文件
 * @return {boolean}
 */
export async function openUpdateMdFile() {
  try {
    const files = await glob(['*/**/doc/update.md'], { ignore: ['**/node_modules/**'] });
    if (files.length) {
      openFile(resolve(files[0]));
      await logInfo(`打开 ${versionInfo.versionNumber} 版本升级步骤文档`);
      return true;
    }
  } catch (error) {
    console.log('openUpdateMdFile Error:', error);
  }
  return false;
}
