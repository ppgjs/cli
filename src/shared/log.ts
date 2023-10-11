import chalk from 'chalk';

const log = console.log;

const logWarn = (val = '') => log(chalk.yellow(val));
const logSuccess = (val = '') => log(chalk.green(val));
const logError = (val = '') => log(chalk.red(val));
const logInfo = (val = '') => log(chalk.blue(val));

export { logWarn, logSuccess, logError, logInfo };
