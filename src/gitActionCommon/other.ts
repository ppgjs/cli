import Enquirer from 'enquirer';
import glob from 'fast-glob';
import { resolve } from 'path';
import { execCommand } from '../shared';
import { EGitVersionActionType, actionDescription } from '../types';
import { createIndexTemplate } from './createIndexTemplate';

// 获取操作类型
export const getActionType = async (defaultType?: EGitVersionActionType) => {
  let actionType: EGitVersionActionType | undefined;

  if (defaultType) {
    const type = EGitVersionActionType[defaultType];
    if (type) actionType = type;
  }

  if (!actionType) {
    const actionTypeArr = Object.keys(EGitVersionActionType).map(key => ({
      name: key,
      message: `${key.padEnd(10)}${actionDescription[<EGitVersionActionType>key]}`
    }));

    const { choicesActionType } = await Enquirer.prompt<{ choicesActionType: EGitVersionActionType }>([
      {
        name: 'choicesActionType',
        type: 'select',
        message: '请选择操作类型',
        choices: actionTypeArr
      }
    ]);

    actionType = choicesActionType;
  }
  return actionType;
};

// export function createUpdateMdFile() {}
export async function openUpdateMdFile() {
  try {
    const system = await execCommand('uname');
    const files = await glob(['*/**/doc/update.md'], { ignore: ['**/node_modules/**'] });
    if (files.length) {
      const fullFile = resolve(files[0]);
      if (system.includes('Darwin')) {
        await execCommand('open', [fullFile]);
      } else {
        await execCommand('start', [fullFile]);
      }
      // await logInfo(`打开 ${versionInfo.versionNumber} 版本升级步骤文档`);
      createIndexTemplate();
    }
  } catch (error) {
    console.log('openUpdateMdFile Error:', error);
  }
}
