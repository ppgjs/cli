import * as kolorist from 'kolorist';

const log = console.log;

const logWarn = (val = '') => log(kolorist.yellow(val));
const logSuccess = (val = '') => log(kolorist.green(val));
const logError = (val = '') => log(kolorist.red(val));
const logInfo = (val = '') => log(kolorist.blue(val));

export { logWarn, logSuccess, logError, logInfo };
