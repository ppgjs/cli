import assert from 'node:assert/strict';
import { afterAll, describe, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import UploadVerifyFile from './index';
import { EPlatForm } from './utils';

/*
 * 构造 UploadVerifyFile 时会通过 $HOME/fhdUploadFile.json 读本地上传配置，
 * 测试里把 HOME 指向临时目录，避免读写真实文件。
 */
const fakeHome = mkdtempSync(path.join(tmpdir(), 'ppg-upload-verify-'));
process.env.HOME = fakeHome;
writeFileSync(path.join(fakeHome, 'fhdUploadFile.json'), '{}');

afterAll(() => {
  rmSync(fakeHome, { recursive: true, force: true });
});

const PAGING_PATH = '/mgr/rdc/staticResource/pagingStaticResourcePublishLog.do';
const DIRECTORY_PATH =
  '/mgr/rdc/staticResource/getUserStaticResourceDirectoryList.do';

type PagingLogEntry = { id?: number; version?: string };
type PagingResult = { list: PagingLogEntry[]; pages?: number } | 'fail';

type StubConfig = {
  projects?: unknown[];
  directoryListIsSuccess?: boolean;
  paging?: Record<number, (page: number) => PagingResult>;
};

type RecordedCall = { url: string; params: Record<string, unknown> };

type UploadRow = {
  id: number;
  name: string;
  uploadDesc: string;
  uploadZipFileName: string;
  oldPublishVersion: string;
  newPublishVersion: string;
};

type TestableUpload = {
  uploadInfoList: UploadRow[];
  initUploadInfoList: () => Promise<void>;
  getIncrementedVersion: (version?: unknown) => string;
  getLogPublishVersion: (
    directoryId: number
  ) => Promise<{ oldPublishVersion: string; newPublishVersion: string }>;
};

/* 模拟请求拦截器之后、响应拦截器之后的返回结构：{ data: { data, isSuccess } } */
const createStub = (config: StubConfig) => {
  const calls: RecordedCall[] = [];

  const get = async (
    url: string,
    requestConfig?: { params?: Record<string, unknown> }
  ) => {
    const params = requestConfig?.params || {};
    calls.push({ url, params });

    if (url.includes('getUserStaticResourceDirectoryList.do')) {
      return {
        data: {
          data: config.projects ?? [],
          isSuccess: config.directoryListIsSuccess ?? true,
        },
      };
    }

    if (url.includes('pagingStaticResourcePublishLog.do')) {
      const directoryId = Number(params.staticResourceDirectoryId);
      const page = Number(params.page ?? 1);
      const result = config.paging?.[directoryId]?.(page) ?? {
        list: [],
        pages: 1,
      };

      if (result === 'fail') {
        return { data: { data: null, isSuccess: false } };
      }

      return {
        data: {
          data: { list: result.list, pages: result.pages ?? 1 },
          isSuccess: true,
        },
      };
    }

    throw new Error(`未预期的请求地址: ${url}`);
  };

  return { stub: { axiosInstance: { get } }, calls };
};

const createTestInstance = (config: StubConfig) => {
  const instance = new UploadVerifyFile(EPlatForm.WEChAT);
  const { stub, calls } = createStub(config);
  (instance as unknown as { uploadRequest: unknown }).uploadRequest = stub;

  return { upload: instance as unknown as TestableUpload, calls };
};

const pagingCalls = (calls: RecordedCall[]) =>
  calls.filter((call) => call.url.includes(PAGING_PATH));

const findRow = (upload: TestableUpload, id: number) =>
  upload.uploadInfoList.find((item) => item.id === id);

/* 线上 pagingStaticResourcePublishLog.do?staticResourceDirectoryId=48 的真实返回 */
const sampleLog48: PagingLogEntry[] = [
  { id: 12067, version: 'qw_txt' },
  { id: 13281, version: '1.3.217' },
  { id: 13279, version: '1.3.216' },
  { id: 13278, version: '1.4.0' },
  { id: 12028, version: '1.3.215' },
  { id: 11631, version: '1.3.214' },
  { id: 11507, version: '1.3.213' },
  { id: 11470, version: '1.3.212' },
  { id: 11214, version: '1.3.211' },
  { id: 11159, version: '1.3.210' },
];

describe('getIncrementedVersion', () => {
  const { upload } = createTestInstance({});

  it('正常版本号递增 patch 位', () => {
    assert.equal(upload.getIncrementedVersion('1.3.217'), '1.3.218');
    assert.equal(upload.getIncrementedVersion('1.4.0'), '1.4.1');
    assert.equal(upload.getIncrementedVersion('0.0.1'), '0.0.2');
  });

  it('去掉首尾空格后再递增', () => {
    assert.equal(upload.getIncrementedVersion(' 1.3.217 '), '1.3.218');
  });

  it('v 前缀的版本号也能递增', () => {
    assert.equal(upload.getIncrementedVersion('v1.3.217'), '1.3.218');
  });

  it('不是版本号的字符串返回空字符串', () => {
    assert.equal(upload.getIncrementedVersion('qw_txt'), '');
    assert.equal(upload.getIncrementedVersion('SaaS小程序校验文件上传'), '');
    assert.equal(upload.getIncrementedVersion('1.3'), '');
    assert.equal(upload.getIncrementedVersion(''), '');
    assert.equal(upload.getIncrementedVersion('   '), '');
  });

  it('非字符串返回空字符串', () => {
    assert.equal(upload.getIncrementedVersion(undefined), '');
    assert.equal(upload.getIncrementedVersion(null), '');
    assert.equal(upload.getIncrementedVersion(1.3), '');
    assert.equal(upload.getIncrementedVersion({}), '');
  });
});

describe('getLogPublishVersion', () => {
  it('从上往下取第一个可用的版本号（真实样例数据）', async () => {
    const { upload, calls } = createTestInstance({
      paging: { 48: () => ({ list: sampleLog48, pages: 27 }) },
    });

    const result = await upload.getLogPublishVersion(48);

    assert.equal(result.oldPublishVersion, '1.3.217');
    assert.equal(result.newPublishVersion, '1.3.218');

    /* 找到后不再继续翻页 */
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].params, {
      page: 1,
      pageSize: 10,
      staticResourceDirectoryId: 48,
    });
  });

  it('跳过前面不可用的记录', async () => {
    const { upload } = createTestInstance({
      paging: {
        48: () => ({
          list: [
            { version: 'qw_txt' },
            { version: 'test_20260428' },
            { version: '' },
            { version: '1.3.216' },
            { version: '1.3.215' },
          ],
          pages: 1,
        }),
      },
    });

    const result = await upload.getLogPublishVersion(48);

    assert.equal(result.oldPublishVersion, '1.3.216');
    assert.equal(result.newPublishVersion, '1.3.217');
  });

  it('第一页没有可用版本号时继续翻页', async () => {
    const { upload, calls } = createTestInstance({
      paging: {
        48: (page) =>
          page === 1
            ? { list: [{ version: 'qw_txt' }, { version: 'abc' }], pages: 2 }
            : { list: [{ version: '1.2.9' }], pages: 2 },
      },
    });

    const result = await upload.getLogPublishVersion(48);

    assert.equal(result.oldPublishVersion, '1.2.9');
    assert.equal(result.newPublishVersion, '1.2.10');

    assert.equal(calls.length, 2);
    assert.equal(calls[0].params.page, 1);
    assert.equal(calls[1].params.page, 2);
  });

  it('最多翻 5 页，都没有可用版本号时返回空', async () => {
    const { upload, calls } = createTestInstance({
      paging: { 48: () => ({ list: [{ version: 'qw_txt' }], pages: 27 }) },
    });

    const result = await upload.getLogPublishVersion(48);

    assert.equal(result.oldPublishVersion, '');
    assert.equal(result.newPublishVersion, '');
    assert.equal(calls.length, 5);
  });

  it('接口返回失败时返回空且不抛错', async () => {
    const { upload } = createTestInstance({ paging: { 48: () => 'fail' } });

    const result = await upload.getLogPublishVersion(48);

    assert.equal(result.oldPublishVersion, '');
    assert.equal(result.newPublishVersion, '');
  });

  it('列表为空时返回空', async () => {
    const { upload } = createTestInstance({});

    const result = await upload.getLogPublishVersion(48);

    assert.equal(result.oldPublishVersion, '');
    assert.equal(result.newPublishVersion, '');
  });
});

describe('initUploadInfoList', () => {
  it('线上版本号可用时保持原逻辑，且不请求发布记录接口', async () => {
    const { upload, calls } = createTestInstance({
      projects: [
        {
          id: 48,
          name: 'img1验证文件',
          lastStaticResourcePublishLog: { version: '1.3.217' },
        },
      ],
    });

    await upload.initUploadInfoList();

    const row = findRow(upload, 48);
    assert.ok(row);
    assert.equal(row.oldPublishVersion, '1.3.217');
    assert.equal(row.newPublishVersion, '1.3.218');

    assert.equal(calls.length, 1);
    assert.match(calls[0].url, new RegExp(DIRECTORY_PATH));
    assert.equal(pagingCalls(calls).length, 0);
  });

  it('线上版本号不是版本号时，去发布记录里从上往下取可用版本号', async () => {
    const { upload, calls } = createTestInstance({
      projects: [
        {
          id: 48,
          name: 'img1验证文件',
          lastStaticResourcePublishLog: { version: 'qw_txt' },
        },
      ],
      paging: { 48: () => ({ list: sampleLog48, pages: 27 }) },
    });

    await upload.initUploadInfoList();

    const row = findRow(upload, 48);
    assert.ok(row);
    assert.equal(row.oldPublishVersion, '1.3.217');
    assert.equal(row.newPublishVersion, '1.3.218');

    /* 关键回归：以前 inc('qw_txt') 得到 null，发布出去的是空版本号 */
    assert.match(row.newPublishVersion, /^\d+\.\d+\.\d+$/);

    const pagingRequest = pagingCalls(calls);
    assert.equal(pagingRequest.length, 1);
    assert.deepEqual(pagingRequest[0].params, {
      page: 1,
      pageSize: 10,
      staticResourceDirectoryId: 48,
    });
  });

  it('lastStaticResourcePublishLog 为 null 时也会去查发布记录', async () => {
    const { upload, calls } = createTestInstance({
      projects: [
        {
          id: 48,
          name: 'img1验证文件',
          lastStaticResourcePublishLog: null,
        },
      ],
      paging: { 48: () => ({ list: sampleLog48, pages: 27 }) },
    });

    await upload.initUploadInfoList();

    const row = findRow(upload, 48);
    assert.ok(row);
    assert.equal(row.oldPublishVersion, '1.3.217');
    assert.equal(row.newPublishVersion, '1.3.218');
    assert.equal(pagingCalls(calls).length, 1);
  });

  it('version 字段缺失时也会去查发布记录', async () => {
    const { upload, calls } = createTestInstance({
      projects: [
        { id: 48, name: 'img1验证文件', lastStaticResourcePublishLog: {} },
      ],
      paging: { 48: () => ({ list: sampleLog48, pages: 27 }) },
    });

    await upload.initUploadInfoList();

    assert.equal(findRow(upload, 48)?.oldPublishVersion, '1.3.217');
    assert.equal(pagingCalls(calls).length, 1);
  });

  it('发布记录里也找不到可用版本号时，跳过该项目且不抛错', async () => {
    const { upload } = createTestInstance({
      projects: [
        {
          id: 48,
          name: 'img1验证文件',
          lastStaticResourcePublishLog: { version: 'qw_txt' },
        },
      ],
      paging: {
        48: () => ({
          list: [{ version: 'qw_txt' }, { version: '' }, { version: 'aaa' }],
          pages: 1,
        }),
      },
    });

    await upload.initUploadInfoList();

    assert.equal(upload.uploadInfoList.length, 0);
  });

  it('线上配置不存在时保持原行为：跳过且不请求发布记录接口', async () => {
    const { upload, calls } = createTestInstance({ projects: [] });

    await upload.initUploadInfoList();

    assert.equal(upload.uploadInfoList.length, 0);
    assert.equal(pagingCalls(calls).length, 0);
  });

  it('多个项目混合时，只对不可用的项目请求发布记录接口', async () => {
    const { upload, calls } = createTestInstance({
      projects: [
        {
          id: 49,
          name: 'chc验证文件',
          lastStaticResourcePublishLog: { version: '2.1.0' },
        },
        {
          id: 48,
          name: 'img1验证文件',
          lastStaticResourcePublishLog: { version: 'qw_txt' },
        },
      ],
      paging: { 48: () => ({ list: sampleLog48, pages: 27 }) },
    });

    await upload.initUploadInfoList();

    assert.equal(upload.uploadInfoList.length, 2);

    const chcRow = findRow(upload, 49);
    assert.equal(chcRow?.oldPublishVersion, '2.1.0');
    assert.equal(chcRow?.newPublishVersion, '2.1.1');

    const imgRow = findRow(upload, 48);
    assert.equal(imgRow?.oldPublishVersion, '1.3.217');
    assert.equal(imgRow?.newPublishVersion, '1.3.218');

    const pagingRequest = pagingCalls(calls);
    assert.equal(pagingRequest.length, 1);
    assert.equal(pagingRequest[0].params.staticResourceDirectoryId, 48);
  });

  it('保留项目本身的配置字段，版本号取去掉空格后的值', async () => {
    const { upload, calls } = createTestInstance({
      projects: [
        {
          id: 48,
          name: 'img1验证文件',
          lastStaticResourcePublishLog: { version: ' 1.3.217 ' },
        },
      ],
    });

    await upload.initUploadInfoList();

    const row = findRow(upload, 48);
    assert.ok(row);
    assert.equal(row.name, 'img1验证文件');
    assert.equal(row.uploadDesc, 'SaaS小程序校验文件上传');
    assert.equal(row.uploadZipFileName, 'chc校验文件.zip');
    assert.equal(row.oldPublishVersion, '1.3.217');
    assert.equal(row.newPublishVersion, '1.3.218');
    assert.equal(pagingCalls(calls).length, 0);
  });

  it('获取上传配置失败时抛出错误', async () => {
    const { upload } = createTestInstance({
      projects: [{ errorMsg: 'token 失效' }],
      directoryListIsSuccess: false,
    });

    await assert.rejects(() => upload.initUploadInfoList(), /获取上传配置失败/);
  });
});
