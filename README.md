# @ppg/cli

这是一个命令行工具

## 用法

### 安装

```bash
npm i -g @ppgjs/cli
```

### 使用

示例：

```bash
ppg -h
```

## 命令介绍

| 命令              | 作用                                                     |
| ----------------- | -------------------------------------------------------- |
| help(-h)          | 查看全部命令用法                                         |
| git-commit        | 创建一个符合 Conventional Commit 规范的提交信息          |
| git-version       | 版本分支操作                                             |
| open              | 在浏览器打开当前仓库                                     |
| git-commit-verify | 检测最近的一次commit信息是否符合 Conventional Commit规范 |
| release           | 发布：更新版本号、提交代码、添加tag、发布npm版本、       |
