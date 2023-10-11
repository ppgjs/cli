import type { EnquirerBasePromptOptions } from 'src/types';
import { verifyVersion } from './gitUtils';

type PromptMapKey = 'inputVersion';

export const PromptMap: Record<PromptMapKey, EnquirerBasePromptOptions> = {
  inputVersion: {
    name: 'version',
    type: 'text',
    message: '请输入版本号',
    required: true,
    validate(input) {
      return verifyVersion(input) || '请输入正确的版本号 ps: 1.0.0';
    }
  }
};

// 合并 Prompt 配置
export const mergePromptOptions = (
  prompt: EnquirerBasePromptOptions,
  restOptions: Partial<EnquirerBasePromptOptions> = {}
) => ({ ...prompt, ...restOptions });
