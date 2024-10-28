import path, { resolve } from 'path';
import { logError } from '../../../shared';
import extra from 'fs-extra';
import Enquirer from 'enquirer';

export enum EPlatForm {
  'WEChAT', // 微信
  'ALIPAY', // 支付宝
  'STATIC', // 静态资源
  'PL_OPERATOR', // 静态资源
  'SAAS_MERCHANT', // 静态资源
}

export interface IUploadFileType {
  wxFileRoot: string;
  aliFileRoot: string;
  staticFileRoot: string;
  ploperatorFileRoot: string;
  saasMerchantFileRoot: string;
  token: string;
}
export const getUploadInfoRoot = () => {
  const systemDefaultPath = process.env.HOME;
  if (!systemDefaultPath) {
    logError('没有找到系统默认路径');
    return '';
  }
  const rootPath = path.join(systemDefaultPath, 'fhdUploadFile.json');

  /* 创建空文件 */
  if (!extra.existsSync(rootPath)) {
    extra.writeJSONSync(rootPath, {});
  }
  return rootPath;
};

export const initUploadInfo = () => {
  const configFilePath = getUploadInfoRoot();
  return extra.readJsonSync(configFilePath);
};

const RootKeyMap = {
  [EPlatForm.WEChAT]: 'wxFileRoot',
  [EPlatForm.ALIPAY]: 'aliFileRoot',
  [EPlatForm.STATIC]: 'staticFileRoot',
  [EPlatForm.PL_OPERATOR]: 'ploperatorFileRoot',
  [EPlatForm.SAAS_MERCHANT]: 'saasMerchantFileRoot',
};

export const getFileRoot = async (
  platefrom: EPlatForm,
  wrapFileRoot?: string
): Promise<string> => {
  const configFilePath = getUploadInfoRoot();
  const readUploadInfo: IUploadFileType = extra.readJsonSync(configFilePath);
  const rootKey = RootKeyMap[platefrom] as keyof IUploadFileType;

  if (wrapFileRoot && extra.existsSync(resolve(wrapFileRoot))) {
    readUploadInfo[rootKey] = resolve(wrapFileRoot);
  } else if (wrapFileRoot) {
    logError(`路径不存在 ${wrapFileRoot}`);
  }

  if (!readUploadInfo[rootKey]) {
    const { pathRoot } = await Enquirer.prompt<{ pathRoot: string }>([
      { name: 'pathRoot', type: 'text', message: '请输入路径', required: true },
    ]);
    return getFileRoot(platefrom, pathRoot);
  }

  return readUploadInfo[rootKey];
};
