---
lang: zh-CN
title: MCP (Model Context Protocol) 完全指南
description: 从零开始学习 MCP 协议，掌握 stdio 和 SSE 两种传输方式
date: 2026-01-28
tags:
  - MCP
  - AI
  - Protocol
  - Claude
---

# MCP (Model Context Protocol) 完全指南

## 1. 什么是 MCP？

**MCP (Model Context Protocol)** 是 Anthropic 开发的一个开放协议，用于在 AI 应用（如 Claude）和外部工具、数据源之间建立标准化的通信机制。

### 1.1 核心概念

MCP 采用**客户端-服务器架构**：

```
┌─────────────────────────────────────────────────────────┐
│                     MCP 架构图                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐                  ┌──────────────┐    │
│  │              │                  │              │    │
│  │   Claude     │                  │  MCP Server  │    │
│  │   Desktop    │◄────────────────►│              │    │
│  │  (MCP Host)  │   MCP Protocol   │  (工具提供者) │    │
│  │              │                  │              │    │
│  └──────────────┘                  └──────┬───────┘    │
│                                           │            │
│                                           │            │
│                                           ▼            │
│                                    ┌─────────────┐     │
│                                    │  Resources  │     │
│                                    │  - 文件系统  │     │
│                                    │  - 数据库    │     │
│                                    │  - API      │     │
│                                    └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

**角色说明**：

- **MCP Host（主机）**：AI 应用（如 Claude Desktop），负责发起请求
- **MCP Server（服务器）**：工具提供者，响应请求并执行操作
- **Resources（资源）**：服务器可以访问的外部系统

### 1.2 MCP 能做什么？

MCP 让 AI 能够：

1. **访问本地文件系统**：读取、搜索、编辑文件
2. **查询数据库**：执行 SQL 查询，获取业务数据
3. **调用 API**：与第三方服务集成
4. **执行系统命令**：运行脚本、管理进程
5. **访问企业内部工具**：连接内网系统

### 1.3 为什么需要 MCP？

**传统方式的问题**：

- 每个工具都需要单独集成
- 没有统一的接口标准
- 安全性难以保证
- 维护成本高

**MCP 的优势**：

| 特性 | 传统方式 | MCP 方式 |
|------|---------|---------|
| **标准化** | 每个工具自定义协议 | 统一的 MCP 协议 |
| **安全性** | 各自实现，参差不齐 | 内置权限控制 |
| **可扩展性** | 需要修改 AI 应用 | 只需添加 MCP 服务器 |
| **维护成本** | 高 | 低 |

### 1.4 MCP 的核心组件

MCP 协议定义了三种核心能力：

#### 1.4.1 Resources（资源）

**定义**：服务器暴露的数据或内容，供 AI 读取。

**特点**：
- 只读访问
- 可以是文件、数据库记录、API 响应等
- 支持文本和二进制数据

**示例**：
```json
{
  "uri": "file:///home/user/project/README.md",
  "name": "项目文档",
  "mimeType": "text/markdown"
}
```

#### 1.4.2 Tools（工具）

**定义**：服务器提供的可执行函数，供 AI 调用。

**特点**：
- 可以修改状态
- 接受参数，返回结果
- 类似于函数调用

**示例**：
```json
{
  "name": "execute_sql",
  "description": "执行 SQL 查询",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {"type": "string"}
    }
  }
}
```

#### 1.4.3 Prompts（提示词模板）

**定义**：预定义的提示词模板，帮助用户快速开始对话。

**特点**：
- 可以包含动态参数
- 简化常见任务
- 提高用户体验

**示例**：
```json
{
  "name": "analyze_logs",
  "description": "分析服务器日志",
  "arguments": [
    {
      "name": "log_file",
      "description": "日志文件路径"
    }
  ]
}
```

## 2. MCP 的两种传输方式

MCP 支持两种传输协议：**stdio** 和 **SSE (Server-Sent Events)**。

### 2.1 快速对比

| 特性 | stdio | SSE |
|------|-------|-----|
| **通信方式** | 标准输入/输出 | HTTP 长连接 |
| **适用场景** | 本地工具、命令行程序 | 远程服务、Web 服务 |
| **部署复杂度** | 简单 | 中等 |
| **网络要求** | 无 | 需要 HTTP 服务器 |
| **安全性** | 进程隔离 | 需要配置认证 |
| **典型用例** | 文件系统、本地数据库 | 云服务、企业 API |

### 2.2 选择建议

**使用 stdio 的场景**：
- 本地工具（文件管理、Git 操作）
- 命令行程序
- 不需要网络访问
- 快速原型开发

**使用 SSE 的场景**：
- 远程服务器上的工具
- 需要多客户端访问
- 企业内部服务
- 需要负载均衡

## 3. 应用场景

### 3.1 开发场景

- **代码库分析**：读取项目文件，理解代码结构
- **Git 操作**：查看提交历史，创建分支
- **数据库管理**：查询数据，生成报表

### 3.2 运维场景

- **日志分析**：自动分析错误日志，定位问题
- **服务器监控**：查询 Prometheus 指标
- **容器管理**：查看 Docker 容器状态
- **配置管理**：读取和更新配置文件

### 3.3 数据分析场景

- **数据查询**：连接数据库，执行复杂查询
- **报表生成**：自动生成业务报表
- **数据清洗**：批量处理数据

## 4. 学习路径

本教程按照以下顺序组织：

1. **[快速入门](./getting-started.md)**：5 分钟搭建第一个 MCP 服务器
2. **[传输协议详解](./transport.md)**：深入理解 stdio 和 SSE
3. **[Claude 配置](./claude-config.md)**：如何在 Claude Desktop 中配置 MCP
4. **[构建 MCP 服务器](./build-server.md)**：从零开始开发自定义服务器
5. **[运维实战](./devops-practice.md)**：真实场景下的 MCP 应用

## 5. 前置知识

学习 MCP 需要以下基础：

- **必需**：
  - 基本的命令行操作
  - JSON 格式理解
  - 任意一门编程语言（Python/Node.js/Go）

- **推荐**：
  - HTTP 协议基础
  - 进程间通信概念
  - RESTful API 设计

## 6. 开发环境准备

### 6.1 安装 Claude Desktop

访问 [Claude 官网](https://claude.ai/download) 下载并安装 Claude Desktop。

**支持的平台**：
- macOS 10.15+
- Windows 10+
- Linux (Ubuntu 20.04+)

### 6.2 安装开发工具

**Python 开发者**：
```bash
# 安装 Python 3.10+
python3 --version

# 安装 MCP SDK
pip install mcp
```

**Node.js 开发者**：
```bash
# 安装 Node.js 18+
node --version

# 安装 MCP SDK
npm install @modelcontextprotocol/sdk
```

### 6.3 验证安装

创建一个简单的测试文件：

```python
# test_mcp.py
from mcp import Server

server = Server("test-server")
print("MCP SDK 安装成功！")
```

运行测试：
```bash
python test_mcp.py
```

## 7. 社区资源

- **官方文档**：https://modelcontextprotocol.io/
- **GitHub 仓库**：https://github.com/modelcontextprotocol
- **示例代码**：https://github.com/modelcontextprotocol/servers
- **Discord 社区**：https://discord.gg/anthropic

## 8. 下一步

准备好了吗？让我们从[快速入门](./getting-started.md)开始，5 分钟搭建你的第一个 MCP 服务器！

---

**提示**：本教程会持续更新，建议收藏并关注最新内容。
