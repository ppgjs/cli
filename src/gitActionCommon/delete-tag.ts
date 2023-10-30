import Enquirer from 'enquirer';
import { execCommand, logSuccess } from '../shared';
import { RegResultSplitToArr } from './git-regexp';
import { GitInfo } from '../config';

const deleteTagOrigin = async (tag: string, remoteTags: string) => {
  try {
    const arr = [execCommand(`git tag -d ${tag}`)];
    if (remoteTags.includes(`refs/tags/${tag}`)) {
      arr.push(execCommand(`git`, ['push', GitInfo.useRemote, `:refs/tags/${tag}`]));
    }
    await Promise.all(arr);
  } catch (error) {
    console.warn(`error:删除tag:${tag}错误`, error);
  }
};

export async function deleteTag(tag: string = '') {
  let handleDeleteTag: string[] = [];
  if (tag) handleDeleteTag.push(tag);

  if (!tag) {
    const tags = (await execCommand('git tag -l')).split(RegResultSplitToArr);
    const { tags: selectTags } = await Enquirer.prompt<{ tags: string[] }>([
      {
        name: 'tags',
        type: 'multiselect',
        message: '请选择需要删除的tag',
        choices: tags.map(name => ({ name })),
        validate(selectArr) {
          return Boolean(selectArr.length) || '请选择至少一个tag';
        }
      }
    ]);
    handleDeleteTag = selectTags;
  }
  const remoteTags = await execCommand(`git ls-remote --tags ${GitInfo.useRemote}`);
  const result: Promise<void>[] = [];
  handleDeleteTag.forEach(tagName => {
    result.push(deleteTagOrigin(tagName, remoteTags));
  });

  await Promise.all(result);
  logSuccess(`操作完成了`);
}
