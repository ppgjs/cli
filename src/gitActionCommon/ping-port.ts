import Enquirer from 'enquirer';
import { sys } from 'ping';
import * as kolorist from 'kolorist';
import { terminalLog } from '../shared';
import dns from 'dns';

const ipv4Reg = /^(\d{1,3}\.){3}\d{1,3}$/;
const domainReg = /^([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,5})$/;

// 检验函数
const verifyIpv4 = (val: string) => ipv4Reg.test(val);
const verifyDomain = (val: string) => domainReg.test(val);
const verifyIpv4OrDomain = (val: string) => verifyIpv4(val) || verifyDomain(val);

// 输入ip/域名
const inputIpOrDomain = async (
  description = '请输入ip/域名',
  errorHint = '请输入正确的ip/域名',
  verifyType: 1 | 2 | 3 = 1 // 1校验ipv4 or domain 2检验ipv4 3校验domain
) => {
  return Enquirer.prompt<{ ip: string }>([
    {
      name: 'ip',
      type: 'text',
      message: description,
      required: true,
      validate(input) {
        if (verifyType === 1) {
          return verifyIpv4OrDomain(input) || errorHint;
        } else if (verifyType === 2) {
          return verifyIpv4(input) || errorHint;
        }
        return verifyDomain(input) || errorHint;
      }
    }
  ]);
};
const pingDomainOfIp = (hostname: string): Promise<string> => {
  if (!verifyDomain(hostname)) return Promise.resolve('');
  return new Promise((res, rej) => {
    dns.lookup(`${hostname}`, (err, ipAddress) => {
      if (err) {
        rej(new Error(`无法解析域名 ${hostname}: ${err.message}`));
      } else {
        res(` 对应的IP地址:${kolorist.lightCyan(ipAddress)}`);
      }
    });
  });
};

// 执行ping操作
const pingIP = (ipStr: string) => {
  return new Promise(res => {
    sys.probe(ipStr, isAlive => {
      const status = isAlive ? kolorist.green('alive') : kolorist.red('dead');
      res(`${kolorist.lightBlue(ipStr)} is ${status}`);
    });
  });
};

export async function PingPort(pingScope: boolean, ipOrDomain: string = '') {
  if (pingScope) {
    let endIp = '';
    let startIp = ipOrDomain;
    if (!verifyIpv4(startIp)) {
      const { ip } = await inputIpOrDomain('请输入范围起始的ip', '请输入正确的ip', 2);
      startIp = ip;
    }
    const { ip } = await inputIpOrDomain('请输入范围结束的ip', '请输入正确的ip', 2);
    endIp = ip;

    // 将IP地址范围转换为数字数组以便遍历
    const startIPArray = startIp.split('.').map(Number);
    const endIPArray = endIp.split('.').map(Number);
    const ResultArr: Promise<any>[] = [];

    // 遍历IP地址范围并执行ping操作
    for (let i = startIPArray[3]; i <= endIPArray[3]; i += 1) {
      const currentIPArray = [...startIPArray];
      currentIPArray[3] = i;
      ResultArr.push(pingIP(currentIPArray.join('.')));
    }
    terminalLog.start('正在疯狂ping中');
    const ipPingResultRes = await Promise.all(ResultArr);
    console.log(`
-------------------
${ipPingResultRes.join(`\n`)}
-------------------`);
    terminalLog.SuccessEnd('ping完成啦');
  } else {
    // 单独ping一个端口或者域名
    let pingIpStr = '';
    if (verifyIpv4OrDomain(ipOrDomain)) {
      pingIpStr = ipOrDomain;
    }
    if (!pingIpStr) {
      const { ip } = await inputIpOrDomain();
      pingIpStr = ip;
    }
    const [domainOfIp, pingResult] = await Promise.all([pingDomainOfIp(pingIpStr), pingIP(pingIpStr)]);
    console.log(`
-------------------
${pingResult} ${domainOfIp}
-------------------`);
  }
}
