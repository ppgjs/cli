import { AxiosRequestConfig } from 'axios';
import Enquirer from 'enquirer';
import FormData from 'form-data';
import extra, { readFileSync, writeJson } from 'fs-extra';
import path from 'path';
import { inc } from 'semver';
import { logError, logInfo, logSuccess } from '../../shared';
import { getFileRoot, getUploadInfoRoot, IUploadFileType } from './utils';
import { ChcZipName, prepareZipFile, SaasZipName } from './utils/preZipFile';
import { FileUploadAxios, IResponse } from './utils/uploadRequest';

type IUploadBaseConfig = {
  id: number;
  name: string;
  productName: string;
  uploadZipFileName: typeof ChcZipName | typeof SaasZipName;
  uploadDesc: string;
};
type IUploadToastConfig = IUploadBaseConfig & {
  oldPublishVersion: string; //上一次版本号
  newPublishVersion: string; //寄件发版的版本号
};

const UploadProjectList: IUploadBaseConfig[] = [
  {
    id: 49,
    name: 'chc验证文件',
    productName: 'fhdchcstatic',
    uploadZipFileName: ChcZipName,
    uploadDesc: 'SaaS小程序校验文件上传',
  },
  {
    id: 48,
    name: 'img1验证文件',
    productName: 'fhdostatic',
    uploadDesc: 'SaaS小程序校验文件上传',
    uploadZipFileName: ChcZipName,
  },
  {
    id: 41,
    name: '寄快递静态资源',
    productName: 'jkdstatic',
    uploadDesc: 'SaaS小程序校验文件上传',
    uploadZipFileName: SaasZipName,
  },
];

export default class UploadVerifyFile {
  private uploadRequest = new FileUploadAxios();
  private localUploadInfo: IUploadFileType = { fileRoot: '', token: '' }; /* 上传需要的信息 */
  private publishFileRoot = ''; /* 发版根目录 */
  private configFilePath = getUploadInfoRoot(); /* 上传配置文件路径 */
  private uploadInfoList: IUploadToastConfig[] = [];

  private initUploadInfoList = async () => {
    const {
      data: { data: projectList, isSuccess },
    } = await this.uploadRequest.axiosInstance.get<IResponse>(
      'https://mgrapi.fhd001.com/mgr/rdc/staticResource/getUserStaticResourceDirectoryList.do'
    );
    if (!isSuccess) {
      logError(JSON.stringify(projectList));
      throw new Error('获取上传配置失败');
    }

    const uploadInfoList = UploadProjectList.map((item): IUploadToastConfig => {
      const onlineConfig = projectList.find((project: any) => project.id === item.id);
      if (!onlineConfig?.lastStaticResourcePublishLog?.version) {
        throw new Error(`${item.name} 线上配置不存在`);
      }

      const { version: oldPublishVersion } = onlineConfig?.lastStaticResourcePublishLog || {};
      const newPublishVersion = inc(oldPublishVersion, 'patch') || '';

      return {
        ...item,
        oldPublishVersion,
        newPublishVersion,
      };
    });
    this.uploadInfoList = uploadInfoList;
  };

  private publicZip = async (uploadInfo: IUploadToastConfig) => {
    /* 获取 上传 token */
    const {
      data: { data: uploadToken, isSuccess: getUploadTokenIsSuccess },
    } = await this.uploadRequest.axiosInstance.post<IResponse>(
      'https://mgrapi.fhd001.com/mgr/common/upload/createUploadToken',
      { fileName: uploadInfo.uploadZipFileName, isPrivate: true }
    );
    if (!getUploadTokenIsSuccess) {
      logError(`${uploadInfo.name} 获取上传token errorinfo -> ${JSON.stringify(uploadToken)}`);
      throw new Error('上传失败');
    }

    /* 上传 */

    const formData = new FormData();
    const filePath = path.join(this.publishFileRoot, uploadInfo.uploadZipFileName);
    const bufferData = readFileSync(filePath);
    formData.append('files[]', bufferData, { filename: uploadInfo.uploadZipFileName.split('.')[0] });
    formData.append('token', uploadToken);

    const config: AxiosRequestConfig = {
      headers: {
        Referer: 'https://oss.fhd001.com/',
        Origin: 'https://oss.fhd001.com',
      },
    };
    const {
      data: { data: uploadResult, isSuccess: uploadIsSuccess },
    } = await this.uploadRequest.axiosInstance.post<IResponse>('https://download.fhd001.com/upload', formData, config);
    if (!uploadIsSuccess) {
      logError(`${uploadInfo.name} 上传失败 errorinfo -> ${JSON.stringify(uploadResult)}`);
      throw new Error('上传失败');
    } else {
      logSuccess(`${uploadInfo.name} 上传成功`);
    }

    /* 发布 */
    const {
      data: { data: publicResult, isSuccess: publicIsSuccess },
    } = await this.uploadRequest.axiosInstance.post<IResponse>(
      'https://mgrapi.fhd001.com/mgr/rdc/staticResource/staticResourcePublish.do',
      {
        staticResourceDirectoryId: uploadInfo.id,
        version: uploadInfo.newPublishVersion,
        description: uploadInfo.uploadDesc,
        ossFilePath: uploadResult,
      }
    );
    if (!publicIsSuccess) {
      logError(`${uploadInfo.name} 发布失败 errorinfo -> ${JSON.stringify(publicResult)}`);
      throw new Error('发布失败');
    }
    logSuccess(`${uploadInfo.name} 发布成功`);
  };

  uploadEntry = async () => {
    await this.initUploadInfoList();
    await Promise.all(
      this.uploadInfoList.map(item => {
        return this.publicZip(item);
      })
    );
  };

  initToken = async (token: string): Promise<string> => {
    if (token) {
      const {
        data: { isSuccess },
      } = await this.uploadRequest.axiosInstance.get<IResponse>(
        'https://mgrapi.fhd001.com/mgr/rdc/staticResource/getUserStaticResourceDirectoryList.do',
        { params: { token } }
      );
      if (isSuccess) {
        logSuccess('token 校验通过');
        this.uploadRequest.setToken(token);
        this.localUploadInfo.token = token;
        this.writeConfigFile();

        return token;
      }
      logError('token 无效，请重新输入');
    }

    const { inputToken } = await Enquirer.prompt<{ inputToken: string }>([
      { name: 'inputToken', type: 'text', message: '请输入火花派token', required: true },
    ]);
    return this.initToken(inputToken);
  };

  /* 更新 发版信息 */
  writeConfigFile() {
    writeJson(this.configFilePath, this.localUploadInfo);
  }

  async main(fileRoot?: string) {
    this.localUploadInfo.fileRoot = await getFileRoot(fileRoot);

    this.publishFileRoot = path.join(this.localUploadInfo.fileRoot, '..');

    await prepareZipFile(this.localUploadInfo.fileRoot);

    const configFilePath = getUploadInfoRoot();
    const localUploadInfo: IUploadFileType = extra.readJsonSync(configFilePath);

    await this.initToken(localUploadInfo.token);

    await this.uploadEntry();

    logInfo('上传完成了!');
  }
}
