declare module 'lint-staged' {
  // LintStagedOptions 接口用于描述 lint-staged 的选项
  interface LintStagedOptions {
    config?: Record<string, string | string[]>; // 可选的配置项
    allowEmpty?: boolean; // 是否允许空
  }

  // LintStagedFn 类型定义了 lint-staged 函数的签名
  type LintStagedFn = (options: LintStagedOptions) => Promise<boolean>;

  // LintStaged 接口扩展 LintStagedFn 并添加了 default 属性
  interface LintStaged extends LintStagedFn {
    default: LintStagedFn; // default 属性为 LintStagedFn 类型
  }

  // 声明 lintStaged 变量，并指定其类型为 LintStaged
  const lintStaged: LintStaged;

  // 导出 lintStaged 变量作为默认导出
  export default lintStaged;
}
