export enum EGitVersionActionType {
  'new' = 'new',
  'merge' = 'merge',
  'build' = 'build',
  'publish' = 'publish',
  'check' = 'check',
  'fix' = 'fix',
  'move' = 'move',
  'test' = 'test'
}
export const actionDescription: Record<EGitVersionActionType, string> = {
  [EGitVersionActionType.new]: '创建新的版本功能分支',
  [EGitVersionActionType.merge]: '合并功能分支到版本主分支',
  [EGitVersionActionType.test]: '将版本主分支合并到test分支',
  [EGitVersionActionType.build]: '切换到版本主分支，等待打包',
  [EGitVersionActionType.publish]: '发布版本，版本主分支合并到master分支',
  [EGitVersionActionType.check]: '检测当前版本的分支是否都合并到主分支',
  [EGitVersionActionType.fix]: '创建一个修复分支，修复线上版本Bug',
  [EGitVersionActionType.move]: '版本功能分支迁移到下个版本'
};
