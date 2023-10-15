export interface CliOption {
  /**
   * the project root directory
   */
  cwd: string;
  /**
   * cleanup dirs
   * @default
   * ```json
   * ["** /dist", "** /pnpm-lock.yaml", "** /node_modules", "!node_modules/**"]
   * ```
   * @description glob pattern syntax {@link https://github.com/isaacs/minimatch}
   */
  cleanupDirs: string[];
  /**
   * git commit types
   */
  gitCommitTypes: [string, string][];
  /**
   * git commit scopes
   */
  gitCommitScopes: [string, string][];
  /**
   * npm-check-updates command args
   * @default ["--deep","-u"]
   */
  ncuCommandArgs: string[];
  /**
   * options of generate changelog
   * @link https://github.com/soybeanjs/changelog
   */
  changelogOptions: Record<string, any>;
  /**
   * prettier write glob
   * @description glob pattern syntax {@link https://github.com/micromatch/micromatch}
   */
  prettierWriteGlob: string[];
  /**
   * lint-staged config
   */
  lintStagedConfig: Record<string, string | string[]>;
}

export interface EnquirerBasePromptOptions {
  name: string | (() => string);
  type: string | (() => string);
  message: string | (() => string) | (() => Promise<string>);
  default?: string;
  prefix?: string;
  initial?: any;
  required?: boolean;
  enabled?: boolean | string;
  disabled?: boolean | string;
  format?(value: string): string | Promise<string>;
  result?(value: string): string | Promise<string>;
  skip?: ((state: object) => boolean | Promise<boolean>) | boolean;
  validate?(value: string): boolean | string | Promise<boolean | string>;
  onSubmit?(name: string, value: any, prompt: any): boolean | Promise<boolean>;
  onCancel?(name: string, value: any, prompt: any): boolean | Promise<boolean>;
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
}
