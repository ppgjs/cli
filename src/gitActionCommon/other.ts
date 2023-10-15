import Enquirer from 'enquirer';
import { EGitVersionActionType, actionDescription } from '../types';

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
