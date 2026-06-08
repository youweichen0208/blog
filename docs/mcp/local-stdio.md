---
lang: zh-CN
title: MCP本地实战
description: MCP local stdio实战
date: 2026-01-28
---

## 在本地打包mcp ts项目

```bash
npm run build
```

## 如何登录docker上的mysql

![Docker MySQL 登录](../.vitepress/public/images/posts/2026/06/2026-06-09-docker-mysql.png)

```bash
docker exec -it taurus-mcp-mysql mysql -uroot -proot
```

## stdio 传输方式配置示例

以下是一个完整的 MCP 服务器配置命令示例：

```bash
claude mcp add huaweicloud-taurusdb-local \
  --transport stdio --scope local \
  --env TAURUSDB_SQL_PROFILES=/tmp/taurusdb-local-profiles.json \
  --env TAURUSDB_DEFAULT_DATASOURCE=local_mysql \
  -- node /Users/youweichen/projects/taurus-mcp-server/packages/mcp/dist/index.js
```

### 命令各部分说明

| 部分                                            | 说明                                          |
| ----------------------------------------------- | --------------------------------------------- |
| `claude mcp add`                                | Claude Code CLI 命令，用于添加新的 MCP 服务器 |
| `huaweicloud-taurusdb-local`                    | MCP 服务器的唯一标识名称                      |
| `--transport stdio`                             | 通信方式：通过标准输入/输出进行进程间通信     |
| `--scope local`                                 | 配置范围：仅当前项目有效                      |
| `--env TAURUSDB_SQL_PROFILES=...`               | 设置环境变量：指定数据库连接配置文件路径      |
| `--env TAURUSDB_DEFAULT_DATASOURCE=local_mysql` | 设置环境变量：默认数据源名称                  |
| `--`                                            | 分隔符，后面是实际要执行的命令                |
| `node .../dist/index.js`                        | 启动 MCP 服务器的命令（运行编译后的 JS 文件） |

### 工作流程

1. Claude Code 启动时会读取这个配置
2. 通过 `node` 启动 MCP 服务器进程
3. MCP 服务器读取 `/tmp/taurusdb-local-profiles.json` 获取数据库连接信息
4. Claude 通过 stdio 与这个进程通信，调用数据库相关工具

### 常用命令

查看已配置的 MCP 服务器列表：

```bash
claude mcp list
```

## 常见问题

### 问题1:缺少配置环境参数

![缺少环境变量导致的 Inspector 错误](../.vitepress/public/images/posts/2026/06/2026-06-09-mcp-inspector-env.png)

说明 Inspector
启动时没有传入环境变量，所以 MCP
找不到配置文件。

**原因:** TAURUSDB_SQL_PROFILES 和
TAURUSDB_DEFAULT_DATASOURCE
环境变量未设置。

**解决方案：**
关闭当前的Inspector，用带环境变量的命令重新启动：

```bash
npx @modelcontextprotocol/inspector -e TAURUSDB_SQL_PROFILES=/tmp/taurusdb-local-profiles.json -e TAURUSDB_DEFAULT_DATASOURCE=local_mysql  node packages/mcp/dist/index.js
```
