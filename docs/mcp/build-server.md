---
lang: zh-CN
title: 构建生产级 MCP 服务器
description: 从零开始开发功能完整、安全可靠的 MCP 服务器
date: 2026-01-28
---

# 构建生产级 MCP 服务器

## 1. 服务器开发基础

### 1.1 开发环境准备

**Python 环境**:
```bash
# 创建项目目录
mkdir my-mcp-server
cd my-mcp-server

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install mcp pydantic python-dotenv
```

**Node.js 环境**:
```bash
# 创建项目目录
mkdir my-mcp-server
cd my-mcp-server

# 初始化项目
npm init -y

# 安装依赖
npm install @modelcontextprotocol/sdk zod dotenv
npm install -D typescript @types/node
```

### 1.2 项目结构

```
my-mcp-server/
├── src/
│   ├── __init__.py
│   ├── server.py          # 主服务器文件
│   ├── tools/             # 工具实现
│   │   ├── __init__.py
│   │   ├── file_tools.py
│   │   └── db_tools.py
│   ├── resources/         # 资源实现
│   │   ├── __init__.py
│   │   └── file_resources.py
│   └── utils/             # 工具函数
│       ├── __init__.py
│       ├── validation.py
│       └── logging.py
├── tests/                 # 测试文件
│   ├── test_tools.py
│   └── test_resources.py
├── config/
│   └── config.yaml        # 配置文件
├── .env.example           # 环境变量示例
├── requirements.txt       # Python 依赖
├── README.md
└── setup.py
```

---

## 2. 实战：构建数据库查询服务器

### 2.1 需求分析

我们将构建一个 PostgreSQL 查询服务器，提供以下功能：

1. **Tools（工具）**：
   - 执行 SQL 查询
   - 列出所有表
   - 查看表结构
   - 执行数据统计

2. **Resources（资源）**：
   - 数据库 schema 信息
   - 表元数据

3. **安全特性**：
   - SQL 注入防护
   - 只读查询限制
   - 查询超时控制
   - 结果集大小限制

### 2.2 完整实现（Python）

**Step 1: 安装依赖**

```bash
pip install mcp psycopg2-binary python-dotenv pydantic
```

**Step 2: 创建 `.env` 文件**

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
MAX_ROWS=1000
QUERY_TIMEOUT=30
```

**Step 3: 创建服务器代码**

```python
#!/usr/bin/env python3
"""
PostgreSQL MCP 服务器
提供安全的数据库查询功能
"""

import os
import asyncio
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any
from dotenv import load_dotenv
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, Resource, TextContent, EmbeddedResource
import json
import re

# 加载环境变量
load_dotenv()

# 配置
DATABASE_URL = os.getenv("DATABASE_URL")
MAX_ROWS = int(os.getenv("MAX_ROWS", "1000"))
QUERY_TIMEOUT = int(os.getenv("QUERY_TIMEOUT", "30"))

# 创建服务器
app = Server("postgres-mcp")

# 数据库连接池
class DatabasePool:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self._connection = None

    def get_connection(self):
        """获取数据库连接"""
        if self._connection is None or self._connection.closed:
            self._connection = psycopg2.connect(
                self.connection_string,
                cursor_factory=RealDictCursor
            )
        return self._connection

    def close(self):
        """关闭连接"""
        if self._connection and not self._connection.closed:
            self._connection.close()

# 全局数据库池
db_pool = DatabasePool(DATABASE_URL)


def validate_sql(query: str) -> tuple[bool, str]:
    """
    验证 SQL 查询安全性
    返回: (是否有效, 错误信息)
    """
    # 转换为小写以便检查
    query_lower = query.lower().strip()

    # 禁止的关键字
    forbidden_keywords = [
        'drop', 'delete', 'truncate', 'insert', 'update',
        'alter', 'create', 'grant', 'revoke', 'exec',
        'execute', 'xp_', 'sp_', 'into outfile', 'into dumpfile'
    ]

    for keyword in forbidden_keywords:
        if keyword in query_lower:
            return False, f"禁止使用关键字: {keyword}"

    # 必须是 SELECT 查询
    if not query_lower.startswith('select'):
        return False, "只允许 SELECT 查询"

    # 检查是否有多条语句（防止注入）
    if ';' in query and not query.strip().endswith(';'):
        return False, "不允许执行多条 SQL 语句"

    return True, ""


def format_query_result(rows: List[Dict], limit: int = MAX_ROWS) -> str:
    """格式化查询结果为 Markdown 表格"""
    if not rows:
        return "查询结果为空"

    # 限制行数
    limited_rows = rows[:limit]
    has_more = len(rows) > limit

    # 获取列名
    columns = list(limited_rows[0].keys())

    # 构建 Markdown 表格
    result = "| " + " | ".join(columns) + " |\n"
    result += "| " + " | ".join(["---"] * len(columns)) + " |\n"

    for row in limited_rows:
        values = [str(row.get(col, "NULL")) for col in columns]
        result += "| " + " | ".join(values) + " |\n"

    if has_more:
        result += f"\n*注意: 结果已限制为 {limit} 行，实际返回 {len(rows)} 行*"

    return result


@app.list_tools()
async def list_tools() -> List[Tool]:
    """列出可用工具"""
    return [
        Tool(
            name="execute_query",
            description="执行 SQL 查询（仅支持 SELECT）",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "SQL 查询语句"
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="list_tables",
            description="列出数据库中的所有表",
            inputSchema={
                "type": "object",
                "properties": {
                    "schema": {
                        "type": "string",
                        "description": "Schema 名称（默认为 public）",
                        "default": "public"
                    }
                }
            }
        ),
        Tool(
            name="describe_table",
            description="查看表结构（列名、类型、约束等）",
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "表名"
                    },
                    "schema": {
                        "type": "string",
                        "description": "Schema 名称（默认为 public）",
                        "default": "public"
                    }
                },
                "required": ["table_name"]
            }
        ),
        Tool(
            name="table_stats",
            description="获取表的统计信息（行数、大小等）",
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "表名"
                    },
                    "schema": {
                        "type": "string",
                        "description": "Schema 名称（默认为 public）",
                        "default": "public"
                    }
                },
                "required": ["table_name"]
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """处理工具调用"""
    try:
        conn = db_pool.get_connection()
        cursor = conn.cursor()

        if name == "execute_query":
            # 执行自定义查询
            query = arguments["query"]

            # 验证 SQL
            is_valid, error_msg = validate_sql(query)
            if not is_valid:
                return [TextContent(
                    type="text",
                    text=f"❌ SQL 验证失败: {error_msg}"
                )]

            # 设置查询超时
            cursor.execute(f"SET statement_timeout = {QUERY_TIMEOUT * 1000}")

            # 执行查询
            cursor.execute(query)
            rows = cursor.fetchall()

            # 格式化结果
            result = format_query_result(rows)

            return [TextContent(
                type="text",
                text=f"✅ 查询成功\n\n{result}\n\n总行数: {len(rows)}"
            )]

        elif name == "list_tables":
            # 列出所有表
            schema = arguments.get("schema", "public")

            query = """
                SELECT table_name, table_type
                FROM information_schema.tables
                WHERE table_schema = %s
                ORDER BY table_name
            """
            cursor.execute(query, (schema,))
            rows = cursor.fetchall()

            if not rows:
                return [TextContent(
                    type="text",
                    text=f"Schema '{schema}' 中没有找到表"
                )]

            result = "## 数据库表列表\n\n"
            for row in rows:
                result += f"- **{row['table_name']}** ({row['table_type']})\n"

            return [TextContent(type="text", text=result)]

        elif name == "describe_table":
            # 查看表结构
            table_name = arguments["table_name"]
            schema = arguments.get("schema", "public")

            query = """
                SELECT
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                ORDER BY ordinal_position
            """
            cursor.execute(query, (schema, table_name))
            rows = cursor.fetchall()

            if not rows:
                return [TextContent(
                    type="text",
                    text=f"❌ 表 '{schema}.{table_name}' 不存在"
                )]

            result = f"## 表结构: {schema}.{table_name}\n\n"
            result += "| 列名 | 类型 | 可空 | 默认值 |\n"
            result += "| --- | --- | --- | --- |\n"

            for row in rows:
                col_type = row['data_type']
                if row['character_maximum_length']:
                    col_type += f"({row['character_maximum_length']})"

                result += f"| {row['column_name']} | {col_type} | "
                result += f"{row['is_nullable']} | {row['column_default'] or '-'} |\n"

            return [TextContent(type="text", text=result)]

        elif name == "table_stats":
            # 获取表统计信息
            table_name = arguments["table_name"]
            schema = arguments.get("schema", "public")

            # 获取行数
            cursor.execute(
                f"SELECT COUNT(*) as count FROM {schema}.{table_name}"
            )
            count_result = cursor.fetchone()
            row_count = count_result['count']

            # 获取表大小
            cursor.execute("""
                SELECT
                    pg_size_pretty(pg_total_relation_size(%s)) as total_size,
                    pg_size_pretty(pg_relation_size(%s)) as table_size,
                    pg_size_pretty(pg_indexes_size(%s)) as indexes_size
            """, (f"{schema}.{table_name}",) * 3)
            size_result = cursor.fetchone()

            result = f"## 表统计: {schema}.{table_name}\n\n"
            result += f"- **总行数**: {row_count:,}\n"
            result += f"- **表大小**: {size_result['table_size']}\n"
            result += f"- **索引大小**: {size_result['indexes_size']}\n"
            result += f"- **总大小**: {size_result['total_size']}\n"

            return [TextContent(type="text", text=result)]

        return [TextContent(
            type="text",
            text=f"❌ 未知工具: {name}"
        )]

    except psycopg2.Error as e:
        return [TextContent(
            type="text",
            text=f"❌ 数据库错误: {str(e)}"
        )]
    except Exception as e:
        return [TextContent(
            type="text",
            text=f"❌ 错误: {str(e)}"
        )]
    finally:
        if cursor:
            cursor.close()


@app.list_resources()
async def list_resources() -> List[Resource]:
    """列出可用资源"""
    return [
        Resource(
            uri="postgres://schema",
            name="数据库 Schema 信息",
            mimeType="application/json",
            description="数据库的完整 schema 信息"
        )
    ]


@app.read_resource()
async def read_resource(uri: str) -> str:
    """读取资源内容"""
    if uri == "postgres://schema":
        try:
            conn = db_pool.get_connection()
            cursor = conn.cursor()

            # 获取所有表和列信息
            query = """
                SELECT
                    t.table_schema,
                    t.table_name,
                    c.column_name,
                    c.data_type,
                    c.is_nullable
                FROM information_schema.tables t
                JOIN information_schema.columns c
                    ON t.table_schema = c.table_schema
                    AND t.table_name = c.table_name
                WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY t.table_schema, t.table_name, c.ordinal_position
            """
            cursor.execute(query)
            rows = cursor.fetchall()

            # 组织数据
            schema_info = {}
            for row in rows:
                schema = row['table_schema']
                table = row['table_name']

                if schema not in schema_info:
                    schema_info[schema] = {}

                if table not in schema_info[schema]:
                    schema_info[schema][table] = []

                schema_info[schema][table].append({
                    "column": row['column_name'],
                    "type": row['data_type'],
                    "nullable": row['is_nullable'] == 'YES'
                })

            cursor.close()
            return json.dumps(schema_info, indent=2)

        except Exception as e:
            return json.dumps({"error": str(e)})

    return json.dumps({"error": "Resource not found"})


async def main():
    """启动服务器"""
    try:
        async with stdio_server() as (read_stream, write_stream):
            await app.run(
                read_stream,
                write_stream,
                app.create_initialization_options()
            )
    finally:
        db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
```

### 2.3 测试服务器

**创建测试脚本 `test_server.py`**:

```python
#!/usr/bin/env python3
"""测试 PostgreSQL MCP 服务器"""

import subprocess
import json
import sys

def send_request(method: str, params: dict = None):
    """发送 JSON-RPC 请求"""
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or {}
    }

    # 启动服务器进程
    proc = subprocess.Popen(
        ["python", "server.py"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    # 发送请求
    request_str = json.dumps(request) + "\n"
    stdout, stderr = proc.communicate(input=request_str, timeout=5)

    print("STDERR:", stderr)
    print("STDOUT:", stdout)

    return json.loads(stdout) if stdout else None


# 测试列出工具
print("=== 测试: 列出工具 ===")
response = send_request("tools/list")
print(json.dumps(response, indent=2))

# 测试执行查询
print("\n=== 测试: 执行查询 ===")
response = send_request("tools/call", {
    "name": "list_tables",
    "arguments": {}
})
print(json.dumps(response, indent=2))
```

### 2.4 Claude Desktop 配置

```json
{
  "mcpServers": {
    "postgres": {
      "command": "/path/to/venv/bin/python",
      "args": ["/path/to/server.py"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/mydb"
      }
    }
  }
}
```

---

## 3. 错误处理与日志

### 3.1 结构化日志

```python
import logging
import sys
from datetime import datetime

# 配置日志（输出到 stderr，不干扰 stdout）
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr),
        logging.FileHandler('/var/log/mcp-server.log')
    ]
)

logger = logging.getLogger(__name__)

# 在工具调用中使用
@app.call_tool()
async def call_tool(name: str, arguments: dict):
    logger.info(f"Tool called: {name} with args: {arguments}")

    try:
        # 处理逻辑
        result = process_tool(name, arguments)
        logger.info(f"Tool {name} succeeded")
        return result
    except Exception as e:
        logger.error(f"Tool {name} failed: {str(e)}", exc_info=True)
        raise
```

### 3.2 自定义异常

```python
class MCPError(Exception):
    """MCP 服务器基础异常"""
    pass

class ValidationError(MCPError):
    """输入验证错误"""
    pass

class DatabaseError(MCPError):
    """数据库操作错误"""
    pass

class PermissionError(MCPError):
    """权限错误"""
    pass

# 使用示例
def validate_input(data):
    if not data:
        raise ValidationError("输入不能为空")

try:
    validate_input(arguments)
except ValidationError as e:
    return [TextContent(
        type="text",
        text=f"❌ 验证错误: {str(e)}"
    )]
```

---

## 4. 性能优化

### 4.1 连接池管理

```python
from psycopg2 import pool

class DatabasePool:
    def __init__(self, connection_string: str, min_conn=1, max_conn=10):
        self.pool = pool.ThreadedConnectionPool(
            min_conn,
            max_conn,
            connection_string
        )

    def get_connection(self):
        return self.pool.getconn()

    def return_connection(self, conn):
        self.pool.putconn(conn)

    def close_all(self):
        self.pool.closeall()
```

### 4.2 缓存机制

```python
from functools import lru_cache
from datetime import datetime, timedelta

class CachedResult:
    def __init__(self, ttl_seconds=300):
        self.cache = {}
        self.ttl = timedelta(seconds=ttl_seconds)

    def get(self, key):
        if key in self.cache:
            value, timestamp = self.cache[key]
            if datetime.now() - timestamp < self.ttl:
                return value
            else:
                del self.cache[key]
        return None

    def set(self, key, value):
        self.cache[key] = (value, datetime.now())

# 使用示例
cache = CachedResult(ttl_seconds=300)

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "list_tables":
        # 尝试从缓存获取
        cache_key = f"tables_{arguments.get('schema', 'public')}"
        cached = cache.get(cache_key)

        if cached:
            return cached

        # 执行查询
        result = fetch_tables(arguments)

        # 缓存结果
        cache.set(cache_key, result)

        return result
```

### 4.3 异步优化

```python
import asyncio
import asyncpg

class AsyncDatabasePool:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.pool = None

    async def initialize(self):
        self.pool = await asyncpg.create_pool(
            self.connection_string,
            min_size=1,
            max_size=10
        )

    async def execute_query(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def close(self):
        await self.pool.close()
```

---

## 5. 测试

### 5.1 单元测试

```python
import unittest
from unittest.mock import Mock, patch
from server import validate_sql, format_query_result

class TestSQLValidation(unittest.TestCase):
    def test_valid_select(self):
        is_valid, _ = validate_sql("SELECT * FROM users")
        self.assertTrue(is_valid)

    def test_invalid_drop(self):
        is_valid, error = validate_sql("DROP TABLE users")
        self.assertFalse(is_valid)
        self.assertIn("drop", error.lower())

    def test_invalid_delete(self):
        is_valid, error = validate_sql("DELETE FROM users")
        self.assertFalse(is_valid)

class TestResultFormatting(unittest.TestCase):
    def test_empty_result(self):
        result = format_query_result([])
        self.assertEqual(result, "查询结果为空")

    def test_format_rows(self):
        rows = [
            {"id": 1, "name": "Alice"},
            {"id": 2, "name": "Bob"}
        ]
        result = format_query_result(rows)
        self.assertIn("Alice", result)
        self.assertIn("Bob", result)

if __name__ == "__main__":
    unittest.main()
```

### 5.2 集成测试

```python
import pytest
import asyncio
from server import app, db_pool

@pytest.mark.asyncio
async def test_list_tables():
    """测试列出表功能"""
    tools = await app.list_tools()
    assert any(t.name == "list_tables" for t in tools)

@pytest.mark.asyncio
async def test_execute_query():
    """测试执行查询"""
    result = await app.call_tool("execute_query", {
        "query": "SELECT 1 as test"
    })
    assert len(result) > 0
    assert "test" in result[0].text.lower()
```

---

## 6. 部署

### 6.1 打包为可执行文件

**使用 PyInstaller**:

```bash
# 安装 PyInstaller
pip install pyinstaller

# 打包
pyinstaller --onefile --name mcp-postgres server.py

# 生成的可执行文件在 dist/ 目录
```

**Claude Desktop 配置**:
```json
{
  "mcpServers": {
    "postgres": {
      "command": "/path/to/dist/mcp-postgres",
      "env": {
        "DATABASE_URL": "postgresql://..."
      }
    }
  }
}
```

### 6.2 Docker 部署

**Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "server.py"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/mydb
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

---

## 7. 下一步

现在你已经学会了如何构建生产级 MCP 服务器，接下来可以：

1. **[运维实战](./devops-practice.md)**：查看实际运维场景中的 MCP 应用
2. 探索更多[官方示例](https://github.com/modelcontextprotocol/servers)
3. 为你的团队开发自定义 MCP 服务器

---

**提示**：生产环境中务必重视安全性、性能和可维护性。
