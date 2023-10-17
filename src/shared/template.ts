import { readFileSync } from 'fs';
import { join } from 'path';
import { logError } from './log';

const getRootPath = () => {
  const pathArr = __dirname.split(/(\\|\/)/);
  while (pathArr.length && !/^(dist|src)$/.test(pathArr[pathArr.length - 1])) pathArr.pop();
  return pathArr.join('/');
};

/**
 * @description: 读取静态资源文件
 * @param {*} filePath
 * @return {*}
 */
export const readStaticFile = (filePath = '') => {
  const rootPath = getRootPath();
  const path = join(rootPath, './static/', filePath);
  try {
    const file = readFileSync(path);
    return file.toString();
  } catch (error) {
    logError(`Error:文件不存在${path}`);
  }
  return false;
};

export const readStaticTemplateFileSync = (templateFileName = '') => {
  return readStaticFile(join('./template', templateFileName));
};
