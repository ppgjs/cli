import { render } from 'ejs';
import { readStaticTemplateFile } from '../shared';

// https://juejin.cn/post/6977567286013984776?searchId=20231016231457967F2C74CAB6A366B526
export function createIndexTemplate() {
  const config = {
    middleware: true,
    port: 2000
  };
  // const res = readStaticTemplateFile('./index');
  // console.log('13行 - createIndexTemplate.ts  => ', res);

  const file1 = readStaticTemplateFile('index.ejs');
  if (typeof file1 === 'boolean') return;

  const res = render(file1, {
    middleware: config.middleware,
    port: config.port
  });
  console.log('16行 - createIndexTemplate.ts  => ', res);
}
