import { join } from 'path';
import { logError } from './log';
import { readFileSync } from 'fs';

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
  console.log('17行 - template.ts  => ', __dirname);
  const rootPath = getRootPath();
  console.log('🚀 ~ file: template.ts:19 ~ rootPath:', rootPath);
  const path = join(rootPath, './static/', filePath);
  console.log('🚀 ~ file: template.ts:20 ~ path:', path);
  try {
    const file = readFileSync(path);
    return file.toString();
  } catch (error) {
    logError(`Error:文件不存在${path}`);
    console.log('25行 - template.ts  => ', error);
  }
  return false;
};

export const readStaticTemplateFile = (templateFileName = '') => {
  return readStaticFile(join('./template', templateFileName));
};
