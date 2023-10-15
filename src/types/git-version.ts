export enum EGitVersionActionType {
  'new' = 'new',
  'merge' = 'merge',
  'build' = 'build'
}
export const actionDescription: Record<EGitVersionActionType, string> = {
  [EGitVersionActionType.new]: '创建新的版本功能分支',
  [EGitVersionActionType.merge]: '合并功能分支到版本主分支',
  [EGitVersionActionType.build]: '切换到版本主分支，等待打包'
};
