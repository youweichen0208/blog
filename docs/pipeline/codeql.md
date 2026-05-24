---
lang: zh-CN
title: GitHub CodeQL 代码安全分析
description: 使用 GitHub CodeQL 进行代码安全漏洞扫描和代码质量分析。
date: 2026-05-24
---

# GitHub CodeQL 代码安全分析

CodeQL 是 GitHub 开发的代码分析引擎，用于发现代码中的安全漏洞和代码质量问题。它把代码当作数据库来查询，可以高效地识别潜在的安全风险。

## 什么是 CodeQL

CodeQL 的核心思想是：**把代码转化为数据库，然后用查询语言分析它**。

- **代码数据库**：CodeQL 将源代码解析成关系型数据库，包含代码的结构、语义信息
- **QL 查询语言**：类似 SQL 的查询语言，用于查询代码数据库
- **预定义查询**：GitHub 提供了大量预定义的安全漏洞查询，覆盖常见漏洞类型

CodeQL 支持的语言：

| 语言 | 支持程度 |
| --- | --- |
| JavaScript/TypeScript | 完全支持 |
| Python | 完全支持 |
| Java | 完全支持 |
| C/C++ | 完全支持 |
| Go | 完全支持 |
| Ruby | 完全支持 |
| Swift | 完全支持 |

## CodeQL 能发现什么

### 安全漏洞

- SQL 注入
- XSS（跨站脚本攻击）
- CSRF（跨站请求伪造）
- 路径遍历
- 不安全的反序列化
- 硬编码密钥/密码
- 使用已弃用的加密算法

### 代码质量问题

- 未使用的变量/函数
- 潜在的空指针引用
- 资源泄漏（未关闭的文件/连接）
- 逻辑错误
- 代码复杂度过高

## 使用方式

### GitHub Actions 自动扫描

最简单的方式是在 GitHub Actions 中配置自动扫描。创建 `.github/workflows/codeql.yml`：

```yaml
name: CodeQL Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # 每周扫描一次

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: ['javascript', 'python']  # 根据你的项目选择语言

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:${{matrix.language}}"
```

### GitHub Security 页面查看结果

扫描完成后，在 GitHub 仓库中：

1. 进入 **Security** 标签页
2. 点击 **Code scanning alerts**
3. 查看发现的安全问题

每个警报包含：
- 漏洞类型
- 严重程度
- 问题位置（文件、行号）
- 修复建议

### 本地使用 CodeQL CLI

如果想在本地分析代码：

1. 安装 CodeQL CLI：

```bash
# macOS
brew install codeql

# 或从 GitHub 下载
wget https://github.com/github/codeql-cli-binaries/releases/latest/download/codeql.tar.gz
tar -xzf codeql.tar.gz
```

2. 创建代码数据库：

```bash
codeql database create --language=javascript --source-root=./my-project my-db
```

3. 运行查询：

```bash
codeql database analyze my-db --format=sarif-latest --output=results.sarif
```

## 自定义查询

可以编写自定义 QL 查询来检测特定问题。创建 `ql` 文件：

```ql
/**
 * @name 查找所有使用 eval 的地方
 * @description eval 可能导致代码注入风险
 * @kind problem
 * @problem.severity warning
 * @security-severity high
 * @id js/eval-usage
 */

import javascript

from CallExpr call
where call.getCalleeName() = "eval"
select call, "使用 eval 可能存在安全风险"
```

将查询文件放在 `.github/codeql/queries/` 目录下，GitHub Actions 会自动执行。

## 配置选项

### 自定义配置文件

创建 `.github/codeql/codeql-config.yml`：

```yaml
name: Custom CodeQL Configuration

# 指定要分析的路径
paths:
  - src
  - lib

# 指定要忽略的路径
paths-ignore:
  - '**/test/**'
  - '**/tests/**'
  - '**/*.test.js'

# 使用自定义查询套件
queries:
  - uses: security-and-quality
  - uses: ./ql/custom-queries.ql
```

在 Actions 中引用：

```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    config-file: ./.github/codeql/codeql-config.yml
```

## 最佳实践

### 扫描频率

- **Push 触发**：每次代码推送时扫描，及时发现问题
- **PR 触发**：PR 合入前扫描，阻止有问题的代码进入主分支
- **定时扫描**：每周扫描一次，发现新增的漏洞模式

### 修复优先级

按严重程度排序修复：

| 严重程度 | 建议处理时间 |
| --- | --- |
| Critical | 立即修复 |
| High | 1-3 天内修复 |
| Medium | 1 周内修复 |
| Low | 可根据情况安排 |

### 与其他工具配合

CodeQL 可以配合其他安全工具：

- **Dependabot**：检测依赖漏洞
- **Secret scanning**：检测泄露的密钥
- **SAST 工具**：SonarQube、Semgrep 等

## 免费使用

对于公开仓库，GitHub CodeQL 完全免费。私有仓库需要 GitHub Advanced Security 许可（GitHub Enterprise 用户可免费使用）。

## 参考资料

- [CodeQL 官方文档](https://codeql.github.com/docs/)
- [GitHub CodeQL Action](https://github.com/github/codeql-action)
- [CodeQL 查询库](https://github.com/github/codeql/tree/main/javascript/ql/src)