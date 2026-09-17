import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import { FileUploadAxios } from './uploadRequest';

type CapturedRequest = {
  url: string;
  params?: Record<string, unknown>;
  body?: unknown;
};

/*
 * new Axios({}) 没有配置 transformRequest/transformResponse，
 * 所以适配器收到的 body 与返回的 response.data 都是原始字符串，
 * 这里按真实的原始报文来模拟。
 */
const createInstance = (rawBody: string) => {
  const instance = new FileUploadAxios();
  const captured: CapturedRequest[] = [];

  const adapter: AxiosAdapter = async (
    config: InternalAxiosRequestConfig
  ) => {
    captured.push({
      /* getUri 会走真实的参数序列化，可以校验最终拼出来的 query */
      url: instance.axiosInstance.getUri(config),
      params: config.params as Record<string, unknown> | undefined,
      body: config.data,
    });

    return {
      data: rawBody,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  instance.axiosInstance.defaults.adapter = adapter;

  return { instance, captured };
};

describe('FileUploadAxios 请求拦截器', () => {
  it('GET 自动补上 token 与 referer，并保留业务参数', async () => {
    const { instance, captured } = createInstance(JSON.stringify({ rcode: 0 }));
    instance.setToken('TEST_TOKEN');

    await instance.axiosInstance.get(
      'https://mgrapi.fhd001.com/mgr/rdc/staticResource/pagingStaticResourcePublishLog.do',
      {
        params: {
          page: 1,
          pageSize: 10,
          staticResourceDirectoryId: 48,
        },
      }
    );

    assert.equal(captured.length, 1);
    const { url, params } = captured[0];

    /* 发布记录接口的查询参数必须完整，缺一个都会拿不到数据 */
    assert.match(url, /page=1/);
    assert.match(url, /pageSize=10/);
    assert.match(url, /staticResourceDirectoryId=48/);
    assert.match(url, /referer=mgrapi/);
    assert.match(url, /token=TEST_TOKEN/);
    assert.deepEqual(params, {
      page: 1,
      pageSize: 10,
      staticResourceDirectoryId: 48,
      token: 'TEST_TOKEN',
      referer: 'mgrapi',
    });
  });

  it('显式传入的 token 优先于实例上的 token', async () => {
    const { instance, captured } = createInstance(JSON.stringify({ rcode: 0 }));
    instance.setToken('INSTANCE_TOKEN');

    await instance.axiosInstance.get('https://mgrapi.fhd001.com/a.do', {
      params: { token: 'PARAM_TOKEN' },
    });

    assert.match(captured[0].url, /token=PARAM_TOKEN/);
    assert.doesNotMatch(captured[0].url, /INSTANCE_TOKEN/);
  });

  it('POST 普通对象会转成 form-urlencoded 并补上 token、referer', async () => {
    const { instance, captured } = createInstance(JSON.stringify({ rcode: 0 }));
    instance.setToken('TEST_TOKEN');

    await instance.axiosInstance.post(
      'https://mgrapi.fhd001.com/mgr/rdc/staticResource/staticResourcePublish.do',
      { staticResourceDirectoryId: 48, version: '1.3.218' }
    );

    const body = captured[0].body as string;
    assert.equal(typeof body, 'string');
    assert.match(body, /staticResourceDirectoryId=48/);
    assert.match(body, /version=1\.3\.218/);
    assert.match(body, /token=TEST_TOKEN/);
    assert.match(body, /referer=mgrapi/);
  });

  it('POST FormData 不会被改写', async () => {
    const { instance, captured } = createInstance(JSON.stringify({ rcode: 0 }));
    instance.setToken('TEST_TOKEN');
    const formData = new FormData();
    formData.append('token', 'UPLOAD_TOKEN');

    await instance.axiosInstance.post(
      'https://download.fhd001.com/upload',
      formData
    );

    assert.equal(captured[0].body, formData);
  });
});

describe('FileUploadAxios 响应拦截器', () => {
  it('rcode 为 0 时 isSuccess 为 true，且 data 就是原始 data 字段', async () => {
    const payload = {
      list: [{ id: 13281, version: '1.3.217' }],
      page: 1,
      pageSize: 10,
      total: 265,
      pages: 27,
    };
    const { instance } = createInstance(
      JSON.stringify({ rcode: 0, scode: 0, data: payload })
    );

    const response = await instance.axiosInstance.get<{
      data: typeof payload;
      isSuccess: boolean;
    }>('https://mgrapi.fhd001.com/mgr/rdc/staticResource/pagingStaticResourcePublishLog.do');

    /* index.ts 里的 const { data: { data: pagingData, isSuccess } } 依赖这个结构 */
    assert.equal(response.data.isSuccess, true);
    assert.deepEqual(response.data.data.list, [{ id: 13281, version: '1.3.217' }]);
    assert.equal(response.data.data.pages, 27);
  });

  it('rcode 非 0 时 isSuccess 为 false', async () => {
    const { instance } = createInstance(
      JSON.stringify({ rcode: 1001, errorMsg: 'token 失效', data: null })
    );

    const response = await instance.axiosInstance.get<{
      isSuccess: boolean;
      data?: { list?: unknown[] };
    }>('https://mgrapi.fhd001.com/mgr/rdc/staticResource/pagingStaticResourcePublishLog.do');

    assert.equal(response.data.isSuccess, false);
    assert.equal(response.data.data, null);
  });
});
