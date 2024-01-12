import Enquirer from 'enquirer';
import { EGitVersionActionType, actionDescription } from '../types';

// 获取操作类型
export const chooseActionType = async (defaultType?: EGitVersionActionType) => {
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

// 是否打包
export const chooseIsBuild = async (defaultIsBuild = true) => {
  const { isBuild } = await Enquirer.prompt<{ isBuild: boolean }>([
    {
      name: 'isBuild',
      type: 'confirm',
      initial: defaultIsBuild,
      message: '是否需要编译'
    }
  ]);
  return isBuild;
};
// 单个选项
export const chooseAnCheck = async (message: string, defaultCheck = true) => {
  const { isCheck } = await Enquirer.prompt<{ isCheck: boolean }>([
    {
      name: 'isCheck',
      type: 'confirm',
      initial: defaultCheck,
      message
    }
  ]);
  return isCheck;
};

export const chooseBuildEnv = async () => {
  const { env } = await Enquirer.prompt<{ env: 'dev' | 'test' | 'prod' }>([
    {
      name: 'env',
      type: 'select',
      message: '请选择操作类型',
      choices: [
        { name: 'dev', message: `${'dev'.padEnd(8)}开发环境` },
        { name: 'test', message: `${'test'.padEnd(8)}测试环境` },
        { name: 'prod', message: `${'prod'.padEnd(8)}生产环境` }
      ]
    }
  ]);
  return env;
};

// 仅用于开放平台打包
export const chooseOfficialBuildProject = async () => {
  const { project } = await Enquirer.prompt<{ project: string }>([
    {
      name: 'project',
      type: 'select',
      message: '请选择要打包的项目',
      choices: [{ name: 'open' }, { name: 'index' }]
    }
  ]);
  return project;
};
