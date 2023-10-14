import { execCommand } from './exec';

/**
 * @description: 睡眠
 * @param {number} delay
 * @return {Promise} 时间完成之后的
 */
export const sleep = (delay = 1000) => {
  return new Promise(res => {
    setTimeout(() => {
      res('睡眠完成');
    }, delay);
  });
};

/**
 * @description: 浏览器打开网页
 * @param {number} delay
 * @return {Promise} 时间完成之后的
 */
export const openBrowserUrl = (url: string) => {
  return execCommand('start', [url]);
};
