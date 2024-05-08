import * as kolorist from 'kolorist';
import type { Options, Ora } from 'ora';

type NonUndefined<T> = T extends undefined ? never : T;

type Spinner = NonUndefined<Options['spinner']>;

const defaultStyle: Spinner = 'simpleDotsScrolling';

// 终端等待的loading
class TerminalLog {
  // 挑了几个更加图形化的模式
  shapeList: Spinner[] = [defaultStyle, 'monkey', 'speaker', 'moon', 'earth', 'smiley'];
  // shapeList: Spinner[] = [defaultStyle];

  index: number = 0;

  count: number = 0;

  spinner?: Ora;

  timer?: NodeJS.Timeout;

  preTextFormat: string = '';

  // 描述信息
  showDesc: string = '';

  private startNow: number = Date.now();

  constructor() {
    this.init();
  }

  async init() {
    const ora = await import('ora');
    this.spinner = await ora.default({ color: 'green', spinner: defaultStyle, prefixText: 'start' });
  }

  setSpinnerStyle(spinner?: Spinner, prefixText?: string) {
    if (this.spinner) {
      Object.assign(this.spinner, { prefixText, spinner });
    }
  }

  start(showDesc = 'waiting', preTextFormat = 'waiting **s') {
    this.showDesc = kolorist.red(showDesc);
    this.index = 0;
    this.preTextFormat = preTextFormat;
    this.spinner?.start(this.showDesc);
    this.startNow = Date.now();
    this.circle();
  }

  SuccessEnd(successText: string) {
    if (this.spinner) this.spinner.succeed(`${successText}😄`);
    this.end();
  }

  FailEnd(failText: string) {
    if (this.spinner) this.spinner.fail(`${failText}😄`);
    this.end();
  }

  private end() {
    // this.spinner?.stop();
    clearInterval(this.timer);
    this.setSpinnerStyle(defaultStyle, '');
  }

  circle() {
    this.timer = setInterval(() => {
      const seconds = this.getLoadingSeconds();
      if (this.spinner && this.shapeList.length) {
        if (!(seconds % 3)) this.index = (this.index + 1) % this.shapeList.length;
        const prefixText = this.preTextFormat.replace('**', `${seconds}`);
        this.setSpinnerStyle(this.shapeList[this.index], kolorist.blue(kolorist.bgGreen(prefixText)));
      }
    }, 1000);
  }

  getLoadingSeconds() {
    return Math.ceil((Date.now() - this.startNow) / 1000);
  }
}

export const terminalLog = new TerminalLog();
