---
lang: zh-CN
title: MCP 常用插件配置
description: Chrome DevTools MCP、Playwright MCP 等常用插件的配置教程。
date: 2026-05-24
---

# MCP 常用插件配置

这里收集了一些好用的 MCP 插件，让 Claude Code 可以操作浏览器、自动化测试等。

## Chrome DevTools MCP

Chrome DevTools MCP 让 Claude Code 可以通过 MCP 协议操作 Chrome 浏览器，包括打开页面、点击元素、填写表单、截图等。

### 安装

在 Claude Code 对话框里：

```bash
/plugin marketplace add ChromeDevTools/chrome-devtools-mcp
/plugin install chrome-devtools-mcp
```

安装完成后重启 Claude Code 即可使用。

### 使用场景

#### 网页自动化操作

让 Claude 自动操作网页：

- 打开网页并截图
- 填写表单并提交
- 点击按钮、导航页面
- 获取页面内容

示例：

```
用 chrome devtools 打开 https://github.com 并截图
```

#### 调试网页问题

检查网页的 DOM 结构、CSS 样式、JavaScript 执行：

```
用 chrome devtools 检查当前页面的 console 错误
```

#### 性能分析

分析网页加载性能、内存使用：

```
用 chrome devtools 分析当前页面的 LCP 时间
```

#### 端到端测试

自动化测试网页功能：

```
用 chrome devtools 测试登录流程是否正常
```

Claude 可以通过 Chrome DevTools MCP 自动操作浏览器，完成点击、填写、导航等操作：

![Claude 使用 Chrome DevTools MCP](../images/posts/2026/06/2026-06-28-screenshot.png)

上图展示了 Claude 使用 Chrome DevTools MCP 自动打开网页并进行操作的过程。
---

## Playwright MCP

Playwright MCP 让 Claude Code 可以通过 Playwright 操作浏览器，支持 Chromium、Firefox、WebKit 三种浏览器引擎，适合自动化测试和网页操作。

### 安装

在 Claude Code 对话框里：

```bash
/plugin install playwright
```

安装完成后重启 Claude Code 即可使用。

### 使用场景

#### 跨浏览器测试

支持 Chromium、Firefox、WebKit 三种浏览器引擎：

```
用 playwright 在 firefox 中打开网页并测试兼容性
```

#### 自动化测试

端到端自动化测试网页功能：

```
用 playwright 测试购物车流程是否正常
```

#### 网页截图和录制

截图、录制视频、生成 PDF：

```
用 playwright 打开网页并截图保存
```

#### 表单自动填写

自动填写和提交表单：

```
用 playwright 填写注册表单并提交
```

#### 页面内容抓取

获取页面文本、链接、图片等信息：

```
用 playwright 获取页面所有链接
```