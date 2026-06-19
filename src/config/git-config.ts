const GitInfo = {
  useRemote: 'origin',
  gitlabUrl: 'http://git.rantron.biz:3002'
};

const updateRemote = (remote: string) => {
  GitInfo.useRemote = remote;
};

const updateGitlabUrl = (url: string) => {
  GitInfo.gitlabUrl = url;
};

export { GitInfo, updateRemote, updateGitlabUrl };

