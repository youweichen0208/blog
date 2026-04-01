---
lang: zh-CN
title: 基于 Hysteria2 的高性能代理服务器搭建指南
description: 使用 RackNerd VPS + Hysteria2 协议搭建低延迟、高吞吐的代理服务器
date: 2026-01-13
tags:
  - VPS
  - Hysteria2
  - Proxy
  - Network
---

通过`uv`和stdio连接MCP服务器的配置如下：

```json
{
    "mcpServers": {
        "服务器名称"：{
            "command": "uv",
            "args": [
                "--directory",
                "/path/to/server/directory",
                "run",
                "main.py"
            ]
        }
    }
}
```

使用uvx（uv的一次性运行工具）

```json
{
  "mcpServers": {
    "my-server": {
      "command": "uvx",
      "args": ["mcp-server-package"]
    }
  }
}
```
