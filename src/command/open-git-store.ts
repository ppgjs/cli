import { GitInfo } from '../config';
import { execCommand, logError, logInfo, logSuccess } from '../shared';

export async function openStore(wrapUrL = '') {
  let openUrl = wrapUrL;
  if (!openUrl) openUrl = await execCommand('git', ['remote', 'get-url', GitInfo.useRemote]);
  if (!openUrl) return logError('没有可打开的网址(＾－＾)');
  const open = await import('open');
  logInfo(`打开地址: ${openUrl}`);
  try {
    await open.default(openUrl, { wait: true });
    logSuccess(`Default browser opened successfully.`);
  } catch (error) {
    logError(`Unable to open the default browser:${error}`);
  }
  return true;
}
