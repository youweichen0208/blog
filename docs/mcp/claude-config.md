---
lang: zh-CN
title: Claude Desktop MCP 配置完全指南
description: 掌握 Claude Desktop 的 MCP 配置技巧和最佳实践
date: 2026-01-28
---

# Claude Desktop MCP 配置完全指南

## 1. 配置文件位置

### 1.1 不同操作系统的配置路径

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

### 1.2 快速访问配置文件

**macOS/Linux**:
```bash
# 使用默认编辑器打开
open ~/Library/Application\ Support/Claude/claude_desktop_config.json

# 或使用 vim
vim ~/Library/Application\ Support/Claude/claude_desktop_config.json

# 查看配置文件内容
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows**:
```powershell
# 使用记事本打开
notepad %APPDATA%\Claude\claude_desktop_config.json

# 或使用 VS Code
code %APPDATA%\Claude\claude_desktop_config.json
```

### 1.3 创建配置文件

如果配置文件不存在，需要手动创建：

```bash
# macOS
mkdir -p ~/Library/Application\ Support/Claude
touch ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Linux
mkdir -p ~/.config/Claude
touch ~/.config/Claude/claude_desktop_config.json
```

---

## 2. 基本配置结构

### 2.1 最小配置

```json
{
  "mcpServers": {}
}
```

### 2.2 单个服务器配置

**stdio 方式**:
```json
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["/absolute/path/to/server.py"]
    }
  }
}
```

**SSE 方式**:
```json
{
  "mcpServers": {
    "my-server": {
      "url": "http://localhost:8000/sse"
    }
  }
}
```

### 2.3 多个服务器配置

```json
{
  "mcpServers": {
    "file-system": {
      "command": "python",
      "args": ["/path/to/file-server.py"]
    },
    "database": {
      "command": "node",
      "args": ["/path/to/db-server.js"]
    },
    "remote-api": {
      "url": "https://api.example.com/mcp/sse",
      "headers": {
        "Authorization": "Bearer your-token"
      }
    }
  }
}
```

---

## 3. stdio 配置详解

### 3.1 Python 服务器配置

**基本配置**:
```json
{
  "mcpServers": {
    "python-server": {
      "command": "python",
      "args": ["/Users/username/mcp-servers/server.py"]
    }
  }
}
```

**使用虚拟环境**:
```json
{
  "mcpServers": {
    "python-server": {
      "command": "/Users/username/mcp-servers/venv/bin/python",
      "args": ["/Users/username/mcp-servers/server.py"]
    }
  }
}
```

**传递环境变量**:
```json
{
  "mcpServers": {
    "python-server": {
      "command": "python",
      "args": ["/path/to/server.py"],
      "env": {
        "DATABASE_URL": "postgresql://localhost/mydb",
        "API_KEY": "your-secret-key",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

### 3.2 Node.js 服务器配置

**基本配置**:
```json
{
  "mcpServers": {
    "node-server": {
      "command": "node",
      "args": ["/Users/username/mcp-servers/server.js"]
    }
  }
}
```

**使用 npx 运行**:
```json
{
  "mcpServers": {
    "node-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-example"]
    }
  }
}
```

**指定工作目录**:
```json
{
  "mcpServers": {
    "node-server": {
      "command": "node",
      "args": ["server.js"],
      "cwd": "/Users/username/mcp-servers"
    }
  }
}
```

### 3.3 二进制可执行文件配置

**Go 编译的服务器**:
```json
{
  "mcpServers": {
    "go-server": {
      "command": "/path/to/mcp-server",
      "args": ["--config", "/path/to/config.yaml"]
    }
  }
}
```

**Rust 编译的服务器**:
```json
{
  "mcpServers": {
    "rust-server": {
      "command": "/path/to/target/release/mcp-server",
      "args": []
    }
  }
}
```

### 3.4 Shell 脚本配置

```json
{
  "mcpServers": {
    "shell-server": {
      "command": "/bin/bash",
      "args": ["/path/to/start-server.sh"]
    }
  }
}
```

---

## 4. SSE 配置详解

### 4.1 本地 SSE 服务器

```json
{
  "mcpServers": {
    "local-sse": {
      "url": "http://localhost:8000/sse"
    }
  }
}
```

### 4.2 远程 SSE 服务器

```json
{
  "mcpServers": {
    "remote-sse": {
      "url": "https://mcp.example.com/sse"
    }
  }
}
```

### 4.3 带认证的 SSE 服务器

**Bearer Token 认证**:
```json
{
  "mcpServers": {
    "authenticated-sse": {
      "url": "https://api.example.com/sse",
      "headers": {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
```

**API Key 认证**:
```json
{
  "mcpServers": {
    "api-key-sse": {
      "url": "https://api.example.com/sse",
      "headers": {
        "X-API-Key": "your-api-key-here"
      }
    }
  }
}
```

**自定义 Headers**:
```json
{
  "mcpServers": {
    "custom-headers": {
      "url": "https://api.example.com/sse",
      "headers": {
        "Authorization": "Bearer token",
        "X-Client-ID": "claude-desktop",
        "X-Environment": "production"
      }
    }
  }
}
```

---

## 5. 高级配置选项

### 5.1 完整配置示例

```json
{
  "mcpServers": {
    "advanced-server": {
      "command": "python",
      "args": [
        "/path/to/server.py",
        "--verbose",
        "--port", "9000"
      ],
      "env": {
        "DATABASE_URL": "postgresql://localhost/mydb",
        "REDIS_URL": "redis://localhost:6379",
        "LOG_LEVEL": "DEBUG",
        "PYTHONUNBUFFERED": "1"
      },
      "cwd": "/path/to/working/directory"
    }
  }
}
```

### 5.2 配置选项说明

| 选项 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `command` | string | stdio 必需 | 可执行文件路径 |
| `args` | array | 可选 | 命令行参数列表 |
| `env` | object | 可选 | 环境变量 |
| `cwd` | string | 可选 | 工作目录 |
| `url` | string | SSE 必需 | SSE 端点 URL |
| `headers` | object | 可选 | HTTP 请求头 |

---

## 6. 实用配置示例

### 6.1 文件系统服务器

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Documents",
        "/Users/username/Projects"
      ]
    }
  }
}
```

### 6.2 Git 操作服务器

```json
{
  "mcpServers": {
    "git": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-git",
        "/Users/username/Projects"
      ]
    }
  }
}
```

### 6.3 PostgreSQL 数据库服务器

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://user:password@localhost:5432/mydb"
      }
    }
  }
}
```

### 6.4 Slack 集成服务器

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-bot-token",
        "SLACK_TEAM_ID": "T1234567890"
      }
    }
  }
}
```

### 6.5 GitHub 集成服务器

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

### 6.6 Google Drive 服务器

```json
{
  "mcpServers": {
    "gdrive": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gdrive"],
      "env": {
        "GDRIVE_CLIENT_ID": "your-client-id",
        "GDRIVE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

---

## 7. 配置验证与调试

### 7.1 验证 JSON 格式

**在线验证**:
- 访问 [JSONLint](https://jsonlint.com/)
- 粘贴配置内容
- 检查语法错误

**命令行验证**:
```bash
# 使用 Python 验证
python -m json.tool ~/Library/Application\ Support/Claude/claude_desktop_config.json

# 使用 jq 验证
jq . ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### 7.2 常见 JSON 错误

**错误 1：缺少逗号**
```json
{
  "mcpServers": {
    "server1": {...}  // ❌ 缺少逗号
    "server2": {...}
  }
}
```

**正确写法**:
```json
{
  "mcpServers": {
    "server1": {...},  // ✅ 添加逗号
    "server2": {...}
  }
}
```

**错误 2：多余的逗号**
```json
{
  "mcpServers": {
    "server1": {...},  // ❌ 最后一项不应有逗号
  }
}
```

**正确写法**:
```json
{
  "mcpServers": {
    "server1": {...}  // ✅ 移除逗号
  }
}
```

**错误 3：使用单引号**
```json
{
  'mcpServers': {  // ❌ JSON 不支持单引号
    'server1': {...}
  }
}
```

**正确写法**:
```json
{
  "mcpServers": {  // ✅ 使用双引号
    "server1": {...}
  }
}
```

### 7.3 查看日志

**macOS**:
```bash
# 查看 Claude Desktop 日志
tail -f ~/Library/Logs/Claude/mcp*.log

# 查看所有日志
ls -la ~/Library/Logs/Claude/
```

**Windows**:
```powershell
# 查看日志目录
dir %APPDATA%\Claude\logs\
```

**Linux**:
```bash
# 查看日志
tail -f ~/.config/Claude/logs/mcp*.log
```

### 7.4 测试服务器连接

**手动运行服务器**:
```bash
# 测试 Python 服务器
python /path/to/server.py

# 测试 Node.js 服务器
node /path/to/server.js

# 测试 SSE 服务器
curl http://localhost:8000/sse
```

---

## 8. 故障排查

### 8.1 服务器未显示

**问题**：配置后服务器未出现在 Claude Desktop 中

**排查步骤**：

1. **检查配置文件路径**
   ```bash
   # 确认文件存在
   ls -la ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **验证 JSON 格式**
   ```bash
   python -m json.tool claude_desktop_config.json
   ```

3. **检查路径是否为绝对路径**
   ```json
   // ❌ 错误：使用相对路径或 ~
   "command": "~/servers/server.py"

   // ✅ 正确：使用绝对路径
   "command": "/Users/username/servers/server.py"
   ```

4. **重启 Claude Desktop**
   - 完全退出应用（不是最小化）
   - 重新启动

### 8.2 服务器启动失败

**问题**：服务器显示但无法连接

**排查步骤**：

1. **检查命令是否可执行**
   ```bash
   # 测试命令
   which python
   which node

   # 测试脚本
   python /path/to/server.py
   ```

2. **检查文件权限**
   ```bash
   # 添加执行权限
   chmod +x /path/to/server.py
   ```

3. **检查依赖是否安装**
   ```bash
   # Python
   pip list | grep mcp

   # Node.js
   npm list @modelcontextprotocol/sdk
   ```

4. **查看错误日志**
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

### 8.3 环境变量问题

**问题**：服务器无法读取环境变量

**解决方案**：

在配置文件中显式设置：
```json
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["/path/to/server.py"],
      "env": {
        "DATABASE_URL": "postgresql://localhost/mydb",
        "PATH": "/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

### 8.4 SSE 连接问题

**问题**：SSE 服务器无法连接

**排查步骤**：

1. **测试服务器是否运行**
   ```bash
   curl http://localhost:8000/sse
   ```

2. **检查防火墙**
   ```bash
   # macOS
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

   # Linux
   sudo ufw status
   ```

3. **检查 HTTPS 证书**（如果使用 HTTPS）
   ```bash
   curl -v https://api.example.com/sse
   ```

---

## 9. 安全最佳实践

### 9.1 敏感信息管理

**❌ 不要直接在配置文件中存储密码**:
```json
{
  "mcpServers": {
    "database": {
      "env": {
        "DB_PASSWORD": "my-secret-password"  // ❌ 不安全
      }
    }
  }
}
```

**✅ 使用环境变量或密钥管理工具**:

**方法 1：使用系统环境变量**
```bash
# 在 ~/.bashrc 或 ~/.zshrc 中设置
export DB_PASSWORD="my-secret-password"
```

```json
{
  "mcpServers": {
    "database": {
      "command": "bash",
      "args": ["-c", "DB_PASSWORD=$DB_PASSWORD python /path/to/server.py"]
    }
  }
}
```

**方法 2：使用密钥文件**
```json
{
  "mcpServers": {
    "database": {
      "command": "python",
      "args": [
        "/path/to/server.py",
        "--credentials-file", "/secure/path/credentials.json"
      ]
    }
  }
}
```

### 9.2 文件权限

```bash
# 限制配置文件权限
chmod 600 ~/Library/Application\ Support/Claude/claude_desktop_config.json

# 限制密钥文件权限
chmod 600 /secure/path/credentials.json
```

### 9.3 路径安全

**限制服务器访问范围**:
```python
# 在服务器代码中限制访问路径
ALLOWED_DIRS = [
    "/Users/username/Documents",
    "/Users/username/Projects"
]

def validate_path(path):
    abs_path = os.path.abspath(path)
    return any(abs_path.startswith(allowed) for allowed in ALLOWED_DIRS)
```

---

## 10. 配置模板

### 10.1 开发环境配置

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Projects"
      ]
    },
    "git": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-git",
        "/Users/username/Projects"
      ]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token"
      }
    }
  }
}
```

### 10.2 数据分析配置

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://localhost/analytics"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/data"
      ]
    }
  }
}
```

### 10.3 运维配置

```json
{
  "mcpServers": {
    "server-monitor": {
      "url": "https://monitor.example.com/mcp/sse",
      "headers": {
        "Authorization": "Bearer monitoring-token"
      }
    },
    "log-analyzer": {
      "command": "python",
      "args": ["/opt/mcp-servers/log-analyzer.py"],
      "env": {
        "LOG_DIR": "/var/log",
        "ELASTICSEARCH_URL": "http://localhost:9200"
      }
    }
  }
}
```

---

## 11. 下一步

现在你已经掌握了 Claude Desktop 的 MCP 配置，接下来可以：

1. **[构建 MCP 服务器](./build-server.md)**：开发自定义服务器
2. **[运维实战](./devops-practice.md)**：实际场景应用
3. 探索[官方服务器示例](https://github.com/modelcontextprotocol/servers)

---

**提示**：建议定期备份配置文件，避免意外丢失。
