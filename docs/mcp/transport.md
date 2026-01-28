---
lang: zh-CN
title: MCP 传输协议详解 - stdio vs SSE
description: 深入理解 MCP 的两种传输方式及其应用场景
date: 2026-01-28
---

# MCP 传输协议详解

## 1. 传输协议概述

MCP 支持两种传输协议：**stdio（标准输入/输出）** 和 **SSE（Server-Sent Events）**。选择合适的传输方式对于系统的性能、安全性和可维护性至关重要。

### 1.1 架构对比

```
┌─────────────────────────────────────────────────────────────┐
│                    stdio 传输方式                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                  ┌──────────────┐        │
│  │   Claude     │    stdin/stdout  │  MCP Server  │        │
│  │   Desktop    │◄────────────────►│   (进程)      │        │
│  │              │                  │              │        │
│  └──────────────┘                  └──────────────┘        │
│                                                              │
│  特点：进程间通信，本地运行，无需网络                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SSE 传输方式                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                  ┌──────────────┐        │
│  │   Claude     │    HTTP/SSE      │  MCP Server  │        │
│  │   Desktop    │◄────────────────►│  (HTTP服务)   │        │
│  │              │   (网络连接)      │              │        │
│  └──────────────┘                  └──────┬───────┘        │
│                                           │                 │
│                                           │                 │
│                                    可部署在远程服务器         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. stdio 传输方式

### 2.1 工作原理

**stdio** 使用操作系统的标准输入/输出流进行通信：

1. **Claude Desktop** 启动 MCP 服务器作为子进程
2. 通过 **stdin** 发送请求（JSON-RPC 格式）
3. 服务器通过 **stdout** 返回响应
4. **stderr** 用于日志输出

### 2.2 通信流程

```
┌─────────────────────────────────────────────────────────────┐
│                  stdio 通信流程                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Claude Desktop                    MCP Server                │
│       │                                 │                    │
│       │  1. 启动进程                     │                    │
│       ├────────────────────────────────►│                    │
│       │                                 │                    │
│       │  2. 发送请求 (stdin)             │                    │
│       │  {"method": "tools/list"}       │                    │
│       ├────────────────────────────────►│                    │
│       │                                 │                    │
│       │                                 │  3. 处理请求        │
│       │                                 │                    │
│       │  4. 返回响应 (stdout)            │                    │
│       │  {"result": {...}}              │                    │
│       │◄────────────────────────────────┤                    │
│       │                                 │                    │
│       │  5. 日志输出 (stderr)            │                    │
│       │  "Processing request..."        │                    │
│       │◄────────────────────────────────┤                    │
│       │                                 │                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Python 实现示例

```python
#!/usr/bin/env python3
import asyncio
import sys
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

app = Server("example-server")

@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="echo",
            description="回显输入的文本",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {"type": "string"}
                },
                "required": ["message"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "echo":
        # 日志输出到 stderr（不会干扰 stdout 的 JSON-RPC 通信）
        print(f"[LOG] Echoing: {arguments['message']}", file=sys.stderr)

        return [TextContent(
            type="text",
            text=f"Echo: {arguments['message']}"
        )]

    return [TextContent(type="text", text="Unknown tool")]

async def main():
    # stdio_server() 处理标准输入/输出
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
```

### 2.4 Node.js 实现示例

```javascript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "example-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "echo",
        description: "回显输入的文本",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "echo") {
    // 日志输出到 stderr
    console.error(`[LOG] Echoing: ${args.message}`);

    return {
      content: [
        {
          type: "text",
          text: `Echo: ${args.message}`,
        },
      ],
    };
  }

  return {
    content: [{ type: "text", text: "Unknown tool" }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Server started on stdio");
}

main().catch(console.error);
```

### 2.5 Claude Desktop 配置

```json
{
  "mcpServers": {
    "example-server": {
      "command": "python",
      "args": ["/absolute/path/to/server.py"]
    }
  }
}
```

**配置说明**：

- `command`：可执行文件路径（python、node、自定义二进制等）
- `args`：传递给命令的参数列表
- 必须使用绝对路径

### 2.6 优势与限制

**优势**：

1. **简单易用**：无需配置网络服务器
2. **安全性高**：进程隔离，无网络暴露
3. **低延迟**：本地通信，无网络开销
4. **易于调试**：可以直接在终端运行测试

**限制**：

1. **仅限本地**：无法远程访问
2. **单客户端**：一个服务器实例只能服务一个 Claude Desktop
3. **进程管理**：Claude Desktop 负责启动/停止进程
4. **资源限制**：受本地机器性能限制

### 2.7 适用场景

- ✅ 本地文件系统操作
- ✅ 本地数据库查询
- ✅ 命令行工具封装
- ✅ Git 操作
- ✅ 本地开发环境管理
- ❌ 远程服务器访问
- ❌ 多用户共享
- ❌ 需要负载均衡

---

## 3. SSE 传输方式

### 3.1 工作原理

**SSE (Server-Sent Events)** 是一种基于 HTTP 的服务器推送技术：

1. 客户端通过 HTTP 连接到服务器
2. 服务器保持连接打开，可以持续推送事件
3. 使用 `text/event-stream` 内容类型
4. 支持自动重连

### 3.2 通信流程

```
┌─────────────────────────────────────────────────────────────┐
│                  SSE 通信流程                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Claude Desktop                    MCP Server (HTTP)         │
│       │                                 │                    │
│       │  1. HTTP 连接                    │                    │
│       │  GET /sse                       │                    │
│       ├────────────────────────────────►│                    │
│       │                                 │                    │
│       │  2. 建立 SSE 连接                │                    │
│       │  Content-Type: text/event-stream│                    │
│       │◄────────────────────────────────┤                    │
│       │                                 │                    │
│       │  3. 发送请求 (POST)              │                    │
│       │  POST /message                  │                    │
│       │  {"method": "tools/list"}       │                    │
│       ├────────────────────────────────►│                    │
│       │                                 │                    │
│       │  4. 通过 SSE 推送响应            │                    │
│       │  event: message                 │                    │
│       │  data: {"result": {...}}        │                    │
│       │◄────────────────────────────────┤                    │
│       │                                 │                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Python 实现示例（FastAPI）

```python
#!/usr/bin/env python3
"""
基于 SSE 的 MCP 服务器
使用 FastAPI 实现 HTTP 服务
"""

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from mcp.server import Server
from mcp.types import Tool, TextContent
import asyncio
import json
import uvicorn

app = FastAPI()
mcp_server = Server("sse-example")

@mcp_server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_time",
            description="获取当前服务器时间",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]

@mcp_server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "get_time":
        from datetime import datetime
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return [TextContent(
            type="text",
            text=f"服务器时间: {current_time}"
        )]

    return [TextContent(type="text", text="Unknown tool")]

@app.get("/sse")
async def sse_endpoint(request: Request):
    """SSE 端点，保持长连接"""

    async def event_generator():
        try:
            # 发送初始连接消息
            yield f"data: {json.dumps({'type': 'connected'})}\n\n"

            # 保持连接，等待客户端断开
            while True:
                if await request.is_disconnected():
                    break
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.post("/message")
async def message_endpoint(request: Request):
    """处理 MCP 请求"""

    body = await request.json()
    method = body.get("method")

    if method == "tools/list":
        tools = await list_tools()
        return {
            "jsonrpc": "2.0",
            "id": body.get("id"),
            "result": {
                "tools": [
                    {
                        "name": t.name,
                        "description": t.description,
                        "inputSchema": t.inputSchema
                    }
                    for t in tools
                ]
            }
        }

    elif method == "tools/call":
        params = body.get("params", {})
        name = params.get("name")
        arguments = params.get("arguments", {})

        result = await call_tool(name, arguments)

        return {
            "jsonrpc": "2.0",
            "id": body.get("id"),
            "result": {
                "content": [
                    {"type": c.type, "text": c.text}
                    for c in result
                ]
            }
        }

    return {"error": "Unknown method"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 3.4 安装依赖

```bash
pip install fastapi uvicorn
```

### 3.5 启动服务器

```bash
python server.py
```

服务器将在 `http://localhost:8000` 启动。

### 3.6 Claude Desktop 配置

```json
{
  "mcpServers": {
    "sse-example": {
      "url": "http://localhost:8000/sse"
    }
  }
}
```

**配置说明**：

- `url`：SSE 端点的完整 URL
- 支持 HTTP 和 HTTPS
- 可以是远程服务器地址

### 3.7 添加认证（推荐）

```python
from fastapi import Header, HTTPException

API_KEY = "your-secret-key"

@app.get("/sse")
async def sse_endpoint(
    request: Request,
    authorization: str = Header(None)
):
    # 验证 API Key
    if authorization != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    # ... 原有逻辑
```

Claude Desktop 配置：

```json
{
  "mcpServers": {
    "sse-example": {
      "url": "http://localhost:8000/sse",
      "headers": {
        "Authorization": "Bearer your-secret-key"
      }
    }
  }
}
```

### 3.8 部署到生产环境

#### 使用 systemd 管理服务

创建 `/etc/systemd/system/mcp-server.service`：

```ini
[Unit]
Description=MCP SSE Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/mcp-server
ExecStart=/opt/mcp-server/venv/bin/python server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable mcp-server
sudo systemctl start mcp-server
```

#### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name mcp.example.com;

    location /sse {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # SSE 特定配置
        proxy_buffering off;
        proxy_read_timeout 86400;
    }

    location /message {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3.9 优势与限制

**优势**：

1. **远程访问**：可以部署在任何服务器上
2. **多客户端**：支持多个 Claude Desktop 同时连接
3. **灵活部署**：支持负载均衡、高可用
4. **集中管理**：统一管理和监控
5. **跨平台**：任何支持 HTTP 的客户端都可以使用

**限制**：

1. **复杂度高**：需要配置 HTTP 服务器
2. **网络依赖**：需要稳定的网络连接
3. **延迟较高**：相比 stdio 有网络开销
4. **安全配置**：需要考虑认证、加密等

### 3.10 适用场景

- ✅ 远程服务器访问
- ✅ 企业内部服务
- ✅ 多用户共享
- ✅ 云服务集成
- ✅ 需要负载均衡
- ✅ 微服务架构
- ❌ 简单本地工具
- ❌ 对延迟极度敏感

---

## 4. 对比总结

### 4.1 详细对比表

| 维度 | stdio | SSE |
|------|-------|-----|
| **通信方式** | 标准输入/输出 | HTTP/SSE |
| **部署位置** | 本地 | 本地或远程 |
| **网络要求** | 无 | 需要 HTTP 服务器 |
| **并发支持** | 单客户端 | 多客户端 |
| **延迟** | 极低（微秒级） | 较低（毫秒级） |
| **安全性** | 进程隔离 | 需要配置认证 |
| **配置复杂度** | 简单 | 中等 |
| **调试难度** | 容易 | 中等 |
| **资源消耗** | 低 | 中等 |
| **可扩展性** | 低 | 高 |
| **监控** | 困难 | 容易 |
| **日志管理** | stderr | 集中式日志 |

### 4.2 选择决策树

```
需要远程访问？
    ├─ 是 → 使用 SSE
    └─ 否 → 需要多客户端？
            ├─ 是 → 使用 SSE
            └─ 否 → 需要集中管理？
                    ├─ 是 → 使用 SSE
                    └─ 否 → 使用 stdio
```

### 4.3 混合使用

在实际项目中，可以同时使用两种方式：

```json
{
  "mcpServers": {
    "local-files": {
      "command": "python",
      "args": ["/path/to/file-server.py"]
    },
    "remote-database": {
      "url": "https://db.example.com/sse",
      "headers": {
        "Authorization": "Bearer token"
      }
    }
  }
}
```

---

## 5. 性能优化建议

### 5.1 stdio 优化

**1. 减少日志输出**

```python
# 避免在 stdout 输出任何内容
# 所有日志都应该输出到 stderr 或文件
import logging

logging.basicConfig(
    filename='/var/log/mcp-server.log',
    level=logging.INFO
)
```

**2. 异步处理**

```python
# 使用异步 I/O 提高性能
async def call_tool(name: str, arguments: dict):
    # 异步操作
    result = await async_operation()
    return result
```

### 5.2 SSE 优化

**1. 连接池**

```python
# 使用连接池管理数据库连接
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    "postgresql://...",
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20
)
```

**2. 缓存**

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def expensive_operation(param):
    # 缓存结果
    return result
```

**3. 限流**

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/message")
@limiter.limit("100/minute")
async def message_endpoint(request: Request):
    # 限制每分钟 100 次请求
    pass
```

---

## 6. 安全最佳实践

### 6.1 stdio 安全

1. **路径验证**：严格验证文件路径
2. **权限控制**：使用最小权限原则
3. **输入验证**：验证所有输入参数

### 6.2 SSE 安全

1. **使用 HTTPS**：加密传输数据
2. **API Key 认证**：验证客户端身份
3. **速率限制**：防止滥用
4. **CORS 配置**：限制跨域访问
5. **日志审计**：记录所有操作

---

## 7. 下一步

现在你已经深入理解了 MCP 的两种传输方式，接下来可以：

1. **[Claude 配置指南](./claude-config.md)**：学习更多配置技巧
2. **[构建 MCP 服务器](./build-server.md)**：开发生产级服务器
3. **[运维实战](./devops-practice.md)**：实际场景应用

---

**提示**：选择合适的传输方式是成功的关键，根据实际需求做出明智的选择。
