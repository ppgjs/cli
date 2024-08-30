import path, { resolve } from 'path';
import { logError } from '../../../shared';
import extra from 'fs-extra';
import Enquirer from 'enquirer';


export interface IUploadFileType {
  fileRoot: string,
  token: string
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
    extra.writeJSON(rootPath, {});
  }
  return rootPath
}


export const getFileRoot = async (wrapFileRoot?: string): Promise<string> => {
  const configFilePath = getUploadInfoRoot()
  const readUploadInfo: IUploadFileType = extra.readJsonSync(configFilePath)
  if (wrapFileRoot && extra.existsSync(resolve(wrapFileRoot))) {
    readUploadInfo.fileRoot = resolve(wrapFileRoot)
  } else if (wrapFileRoot) {
    logError(`路径不存在 ${wrapFileRoot}`)
  }

  if (!readUploadInfo.fileRoot) {
    const { pathRoot } = await Enquirer.prompt<{ pathRoot: string; }>([
      { name: 'pathRoot', type: 'text', message: '请输入路径', required: true }
    ]);
    return getFileRoot(pathRoot)
  }


  return readUploadInfo.fileRoot
}