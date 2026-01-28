---
lang: zh-CN
title: MCP 快速入门 - 5 分钟搭建第一个服务器
description: 通过实战快速掌握 MCP 的基本使用
date: 2026-01-28
---

# MCP 快速入门

## 1. 目标

在这个教程中，我们将：

1. 创建一个简单的 MCP 服务器（提供文件读取功能）
2. 在 Claude Desktop 中配置并使用它
3. 理解 MCP 的基本工作流程

**预计时间**：5-10 分钟

## 2. 选择你的语言

我们提供两种实现方式，选择你熟悉的语言：

- [Python 实现](#3-python-实现)
- [Node.js 实现](#4-nodejs-实现)

---

## 3. Python 实现

### 3.1 安装依赖

```bash
# 创建项目目录
mkdir mcp-file-server
cd mcp-file-server

# 创建虚拟环境（推荐）
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装 MCP SDK
pip install mcp
```

### 3.2 创建服务器代码

创建文件 `server.py`：

```python
#!/usr/bin/env python3
"""
简单的文件读取 MCP 服务器
提供读取指定目录下文件的功能
"""

import os
import asyncio
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# 创建服务器实例
app = Server("file-reader")

# 定义允许访问的目录（安全考虑）
ALLOWED_DIR = os.path.expanduser("~/Documents")


@app.list_tools()
async def list_tools() -> list[Tool]:
    """列出服务器提供的工具"""
    return [
        Tool(
            name="read_file",
            description="读取指定文件的内容",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "文件路径（相对于 Documents 目录）"
                    }
                },
                "required": ["path"]
            }
        ),
        Tool(
            name="list_files",
            description="列出目录下的所有文件",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "目录路径（相对于 Documents 目录，默认为根目录）",
                        "default": "."
                    }
                }
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """处理工具调用"""

    if name == "read_file":
        # 读取文件
        file_path = os.path.join(ALLOWED_DIR, arguments["path"])

        # 安全检查：确保路径在允许的目录内
        if not os.path.abspath(file_path).startswith(ALLOWED_DIR):
            return [TextContent(
                type="text",
                text="错误：不允许访问该路径"
            )]

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return [TextContent(
                type="text",
                text=f"文件内容：\n\n{content}"
            )]
        except FileNotFoundError:
            return [TextContent(
                type="text",
                text=f"错误：文件不存在 - {arguments['path']}"
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"错误：{str(e)}"
            )]

    elif name == "list_files":
        # 列出文件
        dir_path = os.path.join(ALLOWED_DIR, arguments.get("path", "."))

        # 安全检查
        if not os.path.abspath(dir_path).startswith(ALLOWED_DIR):
            return [TextContent(
                type="text",
                text="错误：不允许访问该路径"
            )]

        try:
            files = os.listdir(dir_path)
            file_list = "\n".join(f"- {f}" for f in sorted(files))
            return [TextContent(
                type="text",
                text=f"目录内容：\n\n{file_list}"
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"错误：{str(e)}"
            )]

    return [TextContent(
        type="text",
        text=f"未知工具：{name}"
    )]


async def main():
    """启动服务器"""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
```

### 3.3 测试服务器

```bash
# 赋予执行权限
chmod +x server.py

# 测试运行（会等待输入）
python server.py
```

按 `Ctrl+C` 退出。如果没有报错，说明服务器代码正常。

---

## 4. Node.js 实现

### 4.1 安装依赖

```bash
# 创建项目目录
mkdir mcp-file-server
cd mcp-file-server

# 初始化项目
npm init -y

# 安装 MCP SDK
npm install @modelcontextprotocol/sdk

# 安装 TypeScript（推荐）
npm install -D typescript @types/node
npx tsc --init
```

### 4.2 创建服务器代码

创建文件 `server.js`：

```javascript
#!/usr/bin/env node

/**
 * 简单的文件读取 MCP 服务器
 * 提供读取指定目录下文件的功能
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

// 定义允许访问的目录
const ALLOWED_DIR = path.join(os.homedir(), "Documents");

// 创建服务器实例
const server = new Server(
  {
    name: "file-reader",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 列出可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_file",
        description: "读取指定文件的内容",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "文件路径（相对于 Documents 目录）",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "list_files",
        description: "列出目录下的所有文件",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "目录路径（相对于 Documents 目录，默认为根目录）",
              default: ".",
            },
          },
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "read_file") {
      // 读取文件
      const filePath = path.join(ALLOWED_DIR, args.path);

      // 安全检查
      if (!filePath.startsWith(ALLOWED_DIR)) {
        return {
          content: [
            {
              type: "text",
              text: "错误：不允许访问该路径",
            },
          ],
        };
      }

      const content = await fs.readFile(filePath, "utf-8");
      return {
        content: [
          {
            type: "text",
            text: `文件内容：\n\n${content}`,
          },
        ],
      };
    } else if (name === "list_files") {
      // 列出文件
      const dirPath = path.join(ALLOWED_DIR, args.path || ".");

      // 安全检查
      if (!dirPath.startsWith(ALLOWED_DIR)) {
        return {
          content: [
            {
              type: "text",
              text: "错误：不允许访问该路径",
            },
          ],
        };
      }

      const files = await fs.readdir(dirPath);
      const fileList = files.sort().map((f) => `- ${f}`).join("\n");

      return {
        content: [
          {
            type: "text",
            text: `目录内容：\n\n${fileList}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `未知工具：${name}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `错误：${error.message}`,
        },
      ],
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP 文件服务器已启动");
}

main().catch((error) => {
  console.error("服务器错误:", error);
  process.exit(1);
});
```

### 4.3 更新 package.json

在 `package.json` 中添加：

```json
{
  "type": "module",
  "bin": {
    "mcp-file-server": "./server.js"
  }
}
```

### 4.4 测试服务器

```bash
# 赋予执行权限
chmod +x server.js

# 测试运行
node server.js
```

---

## 5. 配置 Claude Desktop

### 5.1 找到配置文件

**macOS**:
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows**:
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux**:
```bash
~/.config/Claude/claude_desktop_config.json
```

### 5.2 编辑配置文件

**Python 版本**：

```json
{
  "mcpServers": {
    "file-reader": {
      "command": "python",
      "args": ["/path/to/mcp-file-server/server.py"]
    }
  }
}
```

**Node.js 版本**：

```json
{
  "mcpServers": {
    "file-reader": {
      "command": "node",
      "args": ["/path/to/mcp-file-server/server.js"]
    }
  }
}
```

**重要提示**：
- 将 `/path/to/mcp-file-server` 替换为你的实际路径
- 使用绝对路径，不要使用 `~` 符号
- Python 版本需要确保虚拟环境中的 Python 路径正确

### 5.3 重启 Claude Desktop

完全退出 Claude Desktop 并重新启动。

---

## 6. 测试 MCP 服务器

### 6.1 检查连接状态

在 Claude Desktop 中，点击右下角的 🔌 图标，应该能看到 `file-reader` 服务器。

### 6.2 测试工具调用

在对话框中输入：

```
请帮我列出 Documents 目录下的所有文件
```

Claude 会调用 `list_files` 工具并返回结果。

再试试读取文件：

```
请读取 Documents/test.txt 文件的内容
```

### 6.3 查看调试日志

如果遇到问题，可以查看日志：

**macOS/Linux**:
```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

**Windows**:
```
%APPDATA%\Claude\logs\mcp*.log
```

---

## 7. 代码解析

### 7.1 核心概念

**1. 服务器初始化**

```python
app = Server("file-reader")
```

创建一个名为 `file-reader` 的 MCP 服务器实例。

**2. 工具定义**

```python
@app.list_tools()
async def list_tools() -> list[Tool]:
    return [Tool(...)]
```

定义服务器提供的工具列表，包括：
- 工具名称
- 描述
- 输入参数的 JSON Schema

**3. 工具调用处理**

```python
@app.call_tool()
async def call_tool(name: str, arguments: dict):
    # 根据工具名称执行相应操作
    if name == "read_file":
        # 处理逻辑
```

处理来自 Claude 的工具调用请求。

**4. stdio 传输**

```python
async with stdio_server() as (read_stream, write_stream):
    await app.run(read_stream, write_stream, ...)
```

使用标准输入/输出与 Claude Desktop 通信。

### 7.2 安全考虑

**路径验证**：

```python
if not os.path.abspath(file_path).startswith(ALLOWED_DIR):
    return [TextContent(text="错误：不允许访问该路径")]
```

确保只能访问指定目录，防止路径遍历攻击。

**错误处理**：

```python
try:
    # 操作
except Exception as e:
    return [TextContent(text=f"错误：{str(e)}")]
```

捕获并返回友好的错误信息。

---

## 8. 常见问题

### 8.1 服务器未显示在 Claude Desktop

**检查清单**：

1. 配置文件路径是否正确？
2. JSON 格式是否有效？（使用 [JSONLint](https://jsonlint.com/) 验证）
3. 命令路径是否为绝对路径？
4. 是否重启了 Claude Desktop？

**调试方法**：

```bash
# 手动运行服务器，检查是否有错误
python /path/to/server.py
```

### 8.2 工具调用失败

**可能原因**：

1. 文件路径不存在
2. 权限不足
3. 路径超出允许范围

**解决方法**：

查看服务器日志，检查错误信息。

### 8.3 Python 虚拟环境问题

如果使用虚拟环境，配置文件应该指向虚拟环境中的 Python：

```json
{
  "mcpServers": {
    "file-reader": {
      "command": "/path/to/mcp-file-server/venv/bin/python",
      "args": ["/path/to/mcp-file-server/server.py"]
    }
  }
}
```

---

## 9. 下一步

恭喜！你已经成功创建并运行了第一个 MCP 服务器。

**继续学习**：

1. **[传输协议详解](./transport.md)**：深入理解 stdio 和 SSE 的区别
2. **[Claude 配置指南](./claude-config.md)**：掌握更多配置技巧
3. **[构建复杂服务器](./build-server.md)**：学习如何开发生产级 MCP 服务器

**扩展练习**：

- 添加文件写入功能
- 支持文件搜索（按名称或内容）
- 添加文件统计信息（大小、修改时间等）
- 实现文件监控功能

---

**提示**：完整代码可以在 [GitHub](https://github.com/modelcontextprotocol/servers) 找到更多示例。
