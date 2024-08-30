import { Axios } from 'axios';
import FormData from 'form-data';
import { stringify } from 'querystring';

export type IResponse = {
  isSuccess: boolean;
  data?: any;
};

export class FileUploadAxios {
  private token = '';

  public axiosInstance: Axios;
  constructor() {
    this.axiosInstance = new Axios({});

    this.axiosInstance.interceptors.request.use(request => {
      const isFromData = request.data instanceof FormData;
      if (request.method === 'post' && !isFromData) {
        const data = request.data || {};
        data.token = data.token || this.token;
        data.referer = 'mgrapi';
        request.data = stringify(data);
      } else if (request.method === 'get') {
        const params = { ...(request.params || {}) };
        request.params = {
          ...params,
          ...{
            token: params.token || this.token,
            referer: 'mgrapi',
          },
        };
      }
      return request;
    });

    this.axiosInstance.interceptors.response.use(response => {
      const data = JSON.parse(response.data || '{}');
      const isSuccess = data.rcode === 0;
      return { ...response, data: { ...(data || {}), isSuccess } };
    });
  }

  public setToken(token = '') {
    this.token = token;
  }
}

export const uploadRequest = new FileUploadAxios();
