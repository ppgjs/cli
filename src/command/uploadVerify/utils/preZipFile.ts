import archiver from 'archiver';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  readdirSync,
  statSync,
} from 'fs';
import path from 'path';
import { logError, logSuccess, sleep } from '../../../shared';

export const ChcZipName = 'chc校验文件.zip';
export const StaticZipName = 'static.zip';
export const SaasZipName = 'saas.zip';

//将整个目录压缩
export const prepareDirFileZip = async (filePath: string, fileName: string) => {
  const outPutRoot = path.join(filePath, '..');
  const file = path.resolve(filePath);
  if (!existsSync(file)) {
    logError(`${file}不存在`);
    return false;
  }

  const saasOutput = createWriteStream(path.join(outPutRoot, fileName));

  const archiveSaas = archiver('zip', {
    zlib: { level: 9 }, // 设置压缩级别
  });

  // 监听错误事件
  archiveSaas.on('error', (err) => {
    logError(` archiveSaas error-> ${JSON.stringify(err)}`);
    throw err;
  });

  // 监听完成事件
  saasOutput.on('close', () => {
    logSuccess(
      `文件 压缩包创建完成，文件大小: ${archiveSaas.pointer()} 字节`
    );
  });

  // 监听错误事件
  saasOutput.on('error', (err) => {
    logError(` archive zip error-> ${JSON.stringify(err)}`);
    throw err;
  });

  // 连接输出流到压缩工具
  archiveSaas.pipe(saasOutput);
  if (!fileName.split('.')[0]) throw '没有文件名称';

  archiveSaas.directory(file, fileName.split('.')[0]);

  archiveSaas.finalize(); // 完成压缩
  await sleep();
};

export const prepareAliZipFile = async (filePath: string) => {
  const outPutRoot = path.join(filePath, '..');
  const file = path.resolve(filePath);
  if (!existsSync(file)) {
    logError(`${file}不存在`);
    return false;
  }

  const checkOutput = createWriteStream(path.join(outPutRoot, ChcZipName));

  const archiveCheck = archiver('zip', {
    zlib: { level: 9 }, // 设置压缩级别
  });

  // 监听完成事件
  checkOutput.on('close', () => {
    logSuccess(
      `校验文件 压缩包创建完成，文件大小: ${archiveCheck.pointer()} 字节`
    );
  });

  // 监听错误事件
  archiveCheck.on('error', (err) => {
    logError(` archiveCheck error-> ${JSON.stringify(err)}`);
    throw err;
  });

  const fileNames = new Set();

  // 递归函数：查找所有.txt文件并添加到压缩包
  function addFilesToArchive(dir: string) {
    const files = readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = statSync(filePath);

      if (stat.isDirectory()) {
        // 如果是目录，递归调用
        addFilesToArchive(filePath);
      } else if (['.html', '.txt'].includes(path.extname(file))) {
        if (fileNames.has(file)) return;
        fileNames.add(file);
        // 如果是.txt文件，添加到压缩包
        archiveCheck.append(createReadStream(filePath), {
          name: path.basename(file),
        });
      }
    });
  }

  // 开始递归查找并添加文件
  addFilesToArchive(file);

  archiveCheck.pipe(checkOutput);
  archiveCheck.finalize();
  await sleep();
};
