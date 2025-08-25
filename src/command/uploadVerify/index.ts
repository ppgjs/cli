import { AxiosRequestConfig } from 'axios';
import Enquirer from 'enquirer';
import FormData from 'form-data';
import extra, { readFileSync, readdirSync, writeJson } from 'fs-extra';
import path from 'path';
import { inc } from 'semver';
import { logError, logInfo, logSuccess } from '../../shared';
import {
  EPlatForm,
  IUploadFileType,
  getFileRoot,
  getUploadInfoRoot,
  initUploadInfo,
} from './utils';
import {
  ChcZipName,
  SaasZipName,
  StaticZipName,
  prepareAliZipFile,
  prepareDirFileZip,
  welfareZipName,
} from './utils/preZipFile';
import { FileUploadAxios, IResponse } from './utils/uploadRequest';

type IUploadBaseConfig = {
  id: number;
  name: string;
  productName: string;
  uploadZipFileName:
    | typeof ChcZipName
    | typeof SaasZipName
    | typeof StaticZipName
    | string;
  uploadDesc: string;
};
type IUploadToastConfig = IUploadBaseConfig & {
  oldPublishVersion: string; //上一次版本号
  newPublishVersion: string; //寄件发版的版本号
};

const UploadIdMap = {
  [EPlatForm.WEChAT]: [49, 48, 41],
  [EPlatForm.ALIPAY]: [49, 48],
  [EPlatForm.STATIC]: [36],
  [EPlatForm.PL_OPERATOR]: [52],
  [EPlatForm.SAAS_MERCHANT]: [41],
  [EPlatForm.AD_STATIC]: [37],
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
  /* 扫码的桶 */
  {
    id: 41,
    name: '寄快递静态资源',
    productName: 'jkdstatic',
    uploadDesc: 'SaaS小程序校验文件上传',
    uploadZipFileName: SaasZipName,
  },
  {
    id: 36,
    name: '风火递寄递静态资源-static',
    productName: 'fhdostatic',
    uploadDesc: '图片上传',
    uploadZipFileName: StaticZipName,
  },
  {
    id: 52,
    name: '寄递运营系统',
    productName: 'ploperator',
    uploadDesc: '部署综合运营系统',
    uploadZipFileName: '',
  },
  {
    id: 37,
    name: '广告静态资源',
    productName: 'fhdostatic',
    uploadDesc: '图片上传',
    uploadZipFileName: welfareZipName,
  },
];

export default class UploadVerifyFile {
  private uploadRequest = new FileUploadAxios();
  private localUploadInfo: IUploadFileType =
    initUploadInfo(); /* 上传需要的信息 */
  private publishFileRoot = ''; /* 发版根目录 */
  private configFilePath = getUploadInfoRoot(); /* 上传配置文件路径 */
  private uploadInfoList: IUploadToastConfig[] = [];
  private currentPlatfrom: EPlatForm;

  constructor(platfrom: EPlatForm) {
    this.currentPlatfrom = platfrom;
  }

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

    const uploadInfoList = UploadProjectList.map(
      (item): IUploadToastConfig | false => {
        const onlineConfig = projectList.find(
          (project: any) => project.id === item.id
        );
        if (!onlineConfig?.lastStaticResourcePublishLog?.version) {
          console.info('线上配置不存在:', item.name, ',id:', item.id);

          return false;
        }

        const { version: oldPublishVersion } =
          onlineConfig?.lastStaticResourcePublishLog || {};
        const newPublishVersion = inc(oldPublishVersion, 'patch') || '';

        return {
          ...item,
          oldPublishVersion,
          newPublishVersion,
        };
      }
    ).filter(Boolean) as IUploadToastConfig[];

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
      logError(
        `${uploadInfo.name} 获取上传token errorinfo -> ${JSON.stringify(
          uploadToken
        )}`
      );
      throw new Error('上传失败');
    }

    /* 上传 */

    const formData = new FormData();
    if (!uploadInfo.uploadZipFileName.trim()) {
      throw new Error('文件名为空');
    }

    const filePath = path.join(
      this.publishFileRoot,
      uploadInfo.uploadZipFileName
    );

    // return;

    const bufferData = readFileSync(filePath);
    formData.append('files[]', bufferData, {
      filename: uploadInfo.uploadZipFileName.split('.')[0],
    });
    formData.append('token', uploadToken);

    const config: AxiosRequestConfig = {
      headers: {
        Referer: 'https://oss.fhd001.com/',
        Origin: 'https://oss.fhd001.com',
      },
    };
    const {
      data: { data: uploadResult, isSuccess: uploadIsSuccess },
    } = await this.uploadRequest.axiosInstance.post<IResponse>(
      'https://download.fhd001.com/upload',
      formData,
      config
    );
    if (!uploadIsSuccess) {
      logError(
        `${uploadInfo.name} 上传失败 errorinfo -> ${JSON.stringify(
          uploadResult
        )}`
      );
      console.log('🏷️ index.ts ~ error => ', uploadResult);
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
      logError(
        `${uploadInfo.name} 发布失败 errorinfo -> ${JSON.stringify(
          publicResult
        )}`
      );
      throw new Error('发布失败');
    }
    logSuccess(`${uploadInfo.name} 发布成功`);
  };

  uploadEntry = async () => {
    await this.initUploadInfoList();

    const uploadIds = UploadIdMap[this.currentPlatfrom];
    // 筛选 对应平台的项目
    const uploadList = this.uploadInfoList.filter((uploadItem) =>
      uploadIds.includes(uploadItem.id)
    );

    await Promise.all(
      uploadList.map((item) => {
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
      {
        name: 'inputToken',
        type: 'text',
        message: '请输入火花派token',
        required: true,
      },
    ]);
    return this.initToken(inputToken);
  };

  /* 更新 发版信息 */
  writeConfigFile() {
    writeJson(this.configFilePath, this.localUploadInfo);
  }

  async wxMain(fileRoot?: string) {
    this.localUploadInfo.wxFileRoot = await getFileRoot(
      this.currentPlatfrom,
      fileRoot
    );

    this.publishFileRoot = path.join(this.localUploadInfo.wxFileRoot, '..');

    await prepareDirFileZip(this.localUploadInfo.wxFileRoot, SaasZipName);
    await prepareAliZipFile(this.localUploadInfo.wxFileRoot);

    const configFilePath = getUploadInfoRoot();
    const localUploadInfo: IUploadFileType = extra.readJsonSync(configFilePath);

    await this.initToken(localUploadInfo.token);

    await this.uploadEntry();

    logInfo('上传完成了!');
  }

  async aliMain(fileRoot?: string) {
    this.localUploadInfo.aliFileRoot = await getFileRoot(
      this.currentPlatfrom,
      fileRoot
    );

    this.publishFileRoot = path.join(this.localUploadInfo.aliFileRoot, '..');

    await prepareAliZipFile(this.localUploadInfo.aliFileRoot);

    const configFilePath = getUploadInfoRoot();
    const localUploadInfo: IUploadFileType = extra.readJsonSync(configFilePath);

    await this.initToken(localUploadInfo.token);

    await this.uploadEntry();

    logInfo('上传完成了!');
  }

  // 静态资源上传
  async staticMain(fileRoot?: string) {
    this.localUploadInfo.staticFileRoot = await getFileRoot(
      this.currentPlatfrom,
      fileRoot
    );

    this.publishFileRoot = path.join(this.localUploadInfo.staticFileRoot, '..');

    await prepareDirFileZip(this.localUploadInfo.staticFileRoot, StaticZipName);

    const configFilePath = getUploadInfoRoot();
    const localUploadInfo: IUploadFileType = extra.readJsonSync(configFilePath);

    await this.initToken(localUploadInfo.token);

    const staticInfo = UploadProjectList.find((item) => item.id === 36)!;

    if (!staticInfo) throw new Error('未找到静态资源项目');
    const { desc } = await Enquirer.prompt<{ desc: string }>([
      {
        name: 'desc',
        type: 'text',
        message: '请输入上传描述信息',
        required: true,
        initial: staticInfo.uploadDesc,
      },
    ]);

    staticInfo.uploadDesc = desc;

    await this.uploadEntry();

    logInfo('上传完成了!');
  }
  // 广告静态资源上传
  async staticAdMain(fileRoot?: string) {
    this.localUploadInfo.adStaticFileRoot = await getFileRoot(
      this.currentPlatfrom,
      fileRoot
    );

    this.publishFileRoot = path.join(
      this.localUploadInfo.adStaticFileRoot,
      '..'
    );

    await prepareDirFileZip(
      this.localUploadInfo.adStaticFileRoot,
      welfareZipName
    );

    const configFilePath = getUploadInfoRoot();
    const localUploadInfo: IUploadFileType = extra.readJsonSync(configFilePath);

    await this.initToken(localUploadInfo.token);

    const staticInfo = UploadProjectList.find((item) => item.id === 37)!;

    if (!staticInfo) throw new Error('未找到静态资源项目');
    const { desc } = await Enquirer.prompt<{ desc: string }>([
      {
        name: 'desc',
        type: 'text',
        message: '请输入上传描述信息',
        required: true,
        initial: staticInfo.uploadDesc,
      },
    ]);

    staticInfo.uploadDesc = desc;

    await this.uploadEntry();

    logInfo('上传完成了!');
  }

  // 综合运营系统上传
  async plOperatorMain(fileRoot?: string) {
    this.localUploadInfo.ploperatorFileRoot = await getFileRoot(
      this.currentPlatfrom,
      fileRoot
    );
    const fileArr = readdirSync(
      path.resolve(this.localUploadInfo.ploperatorFileRoot)
    );

    if (!fileArr.length) {
      return logError(
        `${this.localUploadInfo.ploperatorFileRoot} 目录下没有文件`
      );
    }

    this.publishFileRoot = path.resolve(
      this.localUploadInfo.ploperatorFileRoot
    );

    const configFilePath = getUploadInfoRoot();
    const localUploadInfo: IUploadFileType = extra.readJsonSync(configFilePath);

    await this.initToken(localUploadInfo.token);

    const staticInfo = UploadProjectList.find((item) => item.id === 52)!;

    if (!staticInfo) throw new Error('未找到静态资源项目');

    const { fileName, desc } = await Enquirer.prompt<{
      fileName: any;
      desc: string;
    }>([
      {
        name: 'fileName',
        type: 'select',
        message: '请选择上传的压缩包',
        required: true,
        choices: fileArr,
      },
      {
        name: 'desc',
        type: 'text',
        message: '请输入发布描述信息',
        required: true,
        initial: '发布综合运营系统',
      },
    ]);

    staticInfo.uploadDesc = desc;
    staticInfo.uploadZipFileName = fileName;

    await this.uploadEntry();

    logInfo('上传完成了!');
  }

  // SaaS商户后台上传
  async saasMerchantMain(fileRoot?: string) {
    this.localUploadInfo.saasMerchantFileRoot = await getFileRoot(
      this.currentPlatfrom,
      fileRoot
    );
    const fileArr = readdirSync(
      path.resolve(this.localUploadInfo.saasMerchantFileRoot)
    );

    if (!fileArr.length) {
      return logError(
        `${this.localUploadInfo.saasMerchantFileRoot} 目录下没有文件`
      );
    }

    this.publishFileRoot = path.resolve(
      this.localUploadInfo.saasMerchantFileRoot
    );

    const configFilePath = getUploadInfoRoot();
    const localUploadInfo: IUploadFileType = extra.readJsonSync(configFilePath);

    await this.initToken(localUploadInfo.token);

    const staticInfo = UploadProjectList.find((item) => item.id === 41)!;

    if (!staticInfo) throw new Error('未找到静态资源项目');

    const { fileName, desc } = await Enquirer.prompt<{
      fileName: any;
      desc: string;
    }>([
      {
        name: 'fileName',
        type: 'select',
        message: '请选择上传的压缩包',
        required: true,
        choices: fileArr,
      },
      {
        name: 'desc',
        type: 'text',
        message: '请输入发布描述信息',
        required: true,
        initial: '发布SaaS商户后台',
      },
    ]);

    staticInfo.uploadDesc = desc;
    staticInfo.uploadZipFileName = fileName;

    await this.uploadEntry();

    logInfo('上传完成了!');
  }
}
