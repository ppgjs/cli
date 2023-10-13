const GitInfo = {
  useRemote: 'origin'
};

const updateRemote = (remote: string) => {
  GitInfo.useRemote = remote;
};
export { GitInfo, updateRemote };
