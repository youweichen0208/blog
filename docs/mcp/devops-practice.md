---
lang: zh-CN
title: MCP 运维实战 - 提升运维效率的实用案例
description: 真实运维场景下的 MCP 应用，从日志分析到服务器监控
date: 2026-01-28
---

# MCP 运维实战

## 1. 运维场景概述

MCP 可以显著提升运维效率，本文将介绍以下实战场景：

1. **日志分析服务器**：自动分析应用日志，快速定位问题
2. **服务器监控服务器**：查询 Prometheus 指标，生成监控报告
3. **Docker 容器管理**：管理和监控 Docker 容器
4. **数据库运维助手**：数据库健康检查和性能分析
5. **配置文件管理**：安全地读取和更新配置文件

---

## 2. 场景一：日志分析服务器

### 2.1 需求分析

**痛点**：
- 日志文件庞大，手动查找效率低
- 需要快速定位错误和异常
- 需要统计分析日志模式

**解决方案**：
- 提供日志搜索工具
- 自动识别错误模式
- 生成日志统计报告

### 2.2 完整实现

```python
#!/usr/bin/env python3
"""
日志分析 MCP 服务器
提供日志搜索、分析和统计功能
"""

import os
import re
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any
from collections import Counter
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

app = Server("log-analyzer")

# 配置
LOG_DIRS = [
    "/var/log",
    "/var/log/nginx",
    "/var/log/application"
]

# 常见错误模式
ERROR_PATTERNS = {
    "python_exception": r"Traceback \(most recent call last\):.*?(?=\n\S|\Z)",
    "java_exception": r"Exception in thread.*?(?=\n\S|\Z)",
    "http_5xx": r"\s5\d{2}\s",
    "http_4xx": r"\s4\d{2}\s",
    "database_error": r"(database|sql|mysql|postgres).*?(error|failed|timeout)",
    "connection_error": r"(connection|connect).*?(refused|timeout|failed)",
    "out_of_memory": r"(out of memory|oom|memory exhausted)",
}


def search_logs(
    pattern: str,
    log_dir: str,
    hours: int = 24,
    case_sensitive: bool = False
) -> List[Dict[str, Any]]:
    """搜索日志文件"""
    results = []
    cutoff_time = datetime.now() - timedelta(hours=hours)

    flags = 0 if case_sensitive else re.IGNORECASE
    regex = re.compile(pattern, flags)

    for log_file in Path(log_dir).rglob("*.log"):
        # 检查文件修改时间
        if datetime.fromtimestamp(log_file.stat().st_mtime) < cutoff_time:
            continue

        try:
            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                for line_num, line in enumerate(f, 1):
                    if regex.search(line):
                        results.append({
                            "file": str(log_file),
                            "line": line_num,
                            "content": line.strip(),
                            "timestamp": extract_timestamp(line)
                        })
        except Exception as e:
            continue

    return results


def extract_timestamp(line: str) -> str:
    """从日志行中提取时间戳"""
    # 常见时间戳格式
    patterns = [
        r'\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}',  # 2024-01-28 10:30:45
        r'\d{2}/\w{3}/\d{4}:\d{2}:\d{2}:\d{2}',   # 28/Jan/2024:10:30:45
        r'\w{3}\s+\d{1,2}\s\d{2}:\d{2}:\d{2}',    # Jan 28 10:30:45
    ]

    for pattern in patterns:
        match = re.search(pattern, line)
        if match:
            return match.group(0)

    return "Unknown"


def analyze_error_patterns(log_dir: str, hours: int = 24) -> Dict[str, int]:
    """分析错误模式"""
    error_counts = Counter()
    cutoff_time = datetime.now() - timedelta(hours=hours)

    for log_file in Path(log_dir).rglob("*.log"):
        if datetime.fromtimestamp(log_file.stat().st_mtime) < cutoff_time:
            continue

        try:
            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

                for error_type, pattern in ERROR_PATTERNS.items():
                    matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
                    if matches:
                        error_counts[error_type] += len(matches)
        except Exception:
            continue

    return dict(error_counts)


def get_log_stats(log_dir: str) -> Dict[str, Any]:
    """获取日志统计信息"""
    stats = {
        "total_files": 0,
        "total_size": 0,
        "files_by_type": Counter(),
        "largest_files": []
    }

    files_info = []

    for log_file in Path(log_dir).rglob("*.log"):
        stats["total_files"] += 1
        size = log_file.stat().st_size
        stats["total_size"] += size

        # 按类型统计
        file_type = log_file.stem.split('.')[0]
        stats["files_by_type"][file_type] += 1

        files_info.append({
            "path": str(log_file),
            "size": size,
            "modified": datetime.fromtimestamp(log_file.stat().st_mtime)
        })

    # 找出最大的 5 个文件
    files_info.sort(key=lambda x: x["size"], reverse=True)
    stats["largest_files"] = files_info[:5]

    return stats


@app.list_tools()
async def list_tools() -> List[Tool]:
    return [
        Tool(
            name="search_logs",
            description="搜索日志文件中的特定模式",
            inputSchema={
                "type": "object",
                "properties": {
                    "pattern": {
                        "type": "string",
                        "description": "搜索模式（支持正则表达式）"
                    },
                    "log_dir": {
                        "type": "string",
                        "description": "日志目录路径",
                        "default": "/var/log"
                    },
                    "hours": {
                        "type": "integer",
                        "description": "搜索最近 N 小时的日志",
                        "default": 24
                    },
                    "case_sensitive": {
                        "type": "boolean",
                        "description": "是否区分大小写",
                        "default": False
                    }
                },
                "required": ["pattern"]
            }
        ),
        Tool(
            name="analyze_errors",
            description="分析日志中的错误模式并统计",
            inputSchema={
                "type": "object",
                "properties": {
                    "log_dir": {
                        "type": "string",
                        "description": "日志目录路径",
                        "default": "/var/log"
                    },
                    "hours": {
                        "type": "integer",
                        "description": "分析最近 N 小时的日志",
                        "default": 24
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="log_stats",
            description="获取日志文件统计信息",
            inputSchema={
                "type": "object",
                "properties": {
                    "log_dir": {
                        "type": "string",
                        "description": "日志目录路径",
                        "default": "/var/log"
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="tail_log",
            description="查看日志文件的最后 N 行",
            inputSchema={
                "type": "object",
                "properties": {
                    "log_file": {
                        "type": "string",
                        "description": "日志文件路径"
                    },
                    "lines": {
                        "type": "integer",
                        "description": "显示的行数",
                        "default": 50
                    }
                },
                "required": ["log_file"]
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    try:
        if name == "search_logs":
            pattern = arguments["pattern"]
            log_dir = arguments.get("log_dir", "/var/log")
            hours = arguments.get("hours", 24)
            case_sensitive = arguments.get("case_sensitive", False)

            results = search_logs(pattern, log_dir, hours, case_sensitive)

            if not results:
                return [TextContent(
                    type="text",
                    text=f"未找到匹配 '{pattern}' 的日志"
                )]

            # 格式化结果
            output = f"## 搜索结果: '{pattern}'\n\n"
            output += f"找到 {len(results)} 条匹配记录\n\n"

            # 按文件分组
            by_file = {}
            for r in results:
                if r["file"] not in by_file:
                    by_file[r["file"]] = []
                by_file[r["file"]].append(r)

            for file_path, matches in list(by_file.items())[:10]:  # 限制显示文件数
                output += f"### {file_path}\n\n"
                for match in matches[:20]:  # 每个文件最多显示 20 条
                    output += f"**行 {match['line']}** [{match['timestamp']}]\n"
                    output += f"```\n{match['content']}\n```\n\n"

            if len(results) > 200:
                output += f"\n*注意: 结果已限制显示，共 {len(results)} 条*"

            return [TextContent(type="text", text=output)]

        elif name == "analyze_errors":
            log_dir = arguments.get("log_dir", "/var/log")
            hours = arguments.get("hours", 24)

            error_counts = analyze_error_patterns(log_dir, hours)

            if not error_counts:
                return [TextContent(
                    type="text",
                    text="未检测到错误模式"
                )]

            output = f"## 错误分析报告（最近 {hours} 小时）\n\n"
            output += "| 错误类型 | 出现次数 |\n"
            output += "| --- | --- |\n"

            for error_type, count in sorted(
                error_counts.items(),
                key=lambda x: x[1],
                reverse=True
            ):
                output += f"| {error_type} | {count} |\n"

            total_errors = sum(error_counts.values())
            output += f"\n**总错误数**: {total_errors}\n"

            return [TextContent(type="text", text=output)]

        elif name == "log_stats":
            log_dir = arguments.get("log_dir", "/var/log")
            stats = get_log_stats(log_dir)

            output = f"## 日志统计: {log_dir}\n\n"
            output += f"- **总文件数**: {stats['total_files']}\n"
            output += f"- **总大小**: {stats['total_size'] / (1024**2):.2f} MB\n\n"

            output += "### 文件类型分布\n\n"
            for file_type, count in stats['files_by_type'].most_common(10):
                output += f"- **{file_type}**: {count} 个文件\n"

            output += "\n### 最大的文件\n\n"
            for file_info in stats['largest_files']:
                size_mb = file_info['size'] / (1024**2)
                output += f"- **{Path(file_info['path']).name}**: {size_mb:.2f} MB\n"

            return [TextContent(type="text", text=output)]

        elif name == "tail_log":
            log_file = arguments["log_file"]
            lines = arguments.get("lines", 50)

            if not os.path.exists(log_file):
                return [TextContent(
                    type="text",
                    text=f"❌ 文件不存在: {log_file}"
                )]

            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                all_lines = f.readlines()
                tail_lines = all_lines[-lines:]

            output = f"## {log_file} (最后 {len(tail_lines)} 行)\n\n"
            output += "```\n"
            output += "".join(tail_lines)
            output += "\n```"

            return [TextContent(type="text", text=output)]

        return [TextContent(type="text", text=f"未知工具: {name}")]

    except Exception as e:
        return [TextContent(type="text", text=f"❌ 错误: {str(e)}")]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
```

### 2.3 使用示例

在 Claude Desktop 中：

```
请帮我分析 /var/log/nginx 目录下最近 24 小时的错误日志
```

```
搜索包含 "database connection failed" 的日志
```

```
查看 /var/log/application/app.log 的最后 100 行
```

---

## 3. 场景二：Prometheus 监控查询

### 3.1 实现代码

```python
#!/usr/bin/env python3
"""
Prometheus 监控 MCP 服务器
查询 Prometheus 指标并生成报告
"""

import asyncio
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

app = Server("prometheus-monitor")

# Prometheus 配置
PROMETHEUS_URL = "http://localhost:9090"


def query_prometheus(query: str, time: str = None) -> Dict[str, Any]:
    """查询 Prometheus"""
    url = f"{PROMETHEUS_URL}/api/v1/query"
    params = {"query": query}

    if time:
        params["time"] = time

    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()

    return response.json()


def query_range(query: str, start: str, end: str, step: str = "1m") -> Dict[str, Any]:
    """范围查询"""
    url = f"{PROMETHEUS_URL}/api/v1/query_range"
    params = {
        "query": query,
        "start": start,
        "end": end,
        "step": step
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()

    return response.json()


def format_metric_result(data: Dict[str, Any]) -> str:
    """格式化指标结果"""
    if data["status"] != "success":
        return f"❌ 查询失败: {data.get('error', 'Unknown error')}"

    result = data["data"]["result"]

    if not result:
        return "查询结果为空"

    output = "## 查询结果\n\n"

    for item in result:
        metric = item["metric"]
        value = item["value"]

        # 格式化指标标签
        labels = ", ".join(f"{k}={v}" for k, v in metric.items())
        output += f"**{labels}**\n"
        output += f"- 值: {value[1]}\n"
        output += f"- 时间: {datetime.fromtimestamp(float(value[0]))}\n\n"

    return output


@app.list_tools()
async def list_tools() -> List[Tool]:
    return [
        Tool(
            name="query_metric",
            description="查询 Prometheus 指标",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "PromQL 查询语句"
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="cpu_usage",
            description="查询服务器 CPU 使用率",
            inputSchema={
                "type": "object",
                "properties": {
                    "instance": {
                        "type": "string",
                        "description": "实例名称（可选）"
                    }
                }
            }
        ),
        Tool(
            name="memory_usage",
            description="查询服务器内存使用率",
            inputSchema={
                "type": "object",
                "properties": {
                    "instance": {
                        "type": "string",
                        "description": "实例名称（可选）"
                    }
                }
            }
        ),
        Tool(
            name="disk_usage",
            description="查询磁盘使用率",
            inputSchema={
                "type": "object",
                "properties": {
                    "instance": {
                        "type": "string",
                        "description": "实例名称（可选）"
                    }
                }
            }
        ),
        Tool(
            name="service_health",
            description="检查服务健康状态",
            inputSchema={
                "type": "object",
                "properties": {
                    "job": {
                        "type": "string",
                        "description": "Job 名称"
                    }
                },
                "required": ["job"]
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    try:
        if name == "query_metric":
            query = arguments["query"]
            data = query_prometheus(query)
            result = format_metric_result(data)
            return [TextContent(type="text", text=result)]

        elif name == "cpu_usage":
            instance = arguments.get("instance")

            query = '100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'

            if instance:
                query = f'{query}{{instance="{instance}"}}'

            data = query_prometheus(query)
            result = format_metric_result(data)

            return [TextContent(
                type="text",
                text=f"## CPU 使用率\n\n{result}"
            )]

        elif name == "memory_usage":
            instance = arguments.get("instance")

            query = '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100'

            if instance:
                query = f'{query}{{instance="{instance}"}}'

            data = query_prometheus(query)
            result = format_metric_result(data)

            return [TextContent(
                type="text",
                text=f"## 内存使用率\n\n{result}"
            )]

        elif name == "disk_usage":
            instance = arguments.get("instance")

            query = '(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100'

            if instance:
                query = f'{query}{{instance="{instance}"}}'

            data = query_prometheus(query)
            result = format_metric_result(data)

            return [TextContent(
                type="text",
                text=f"## 磁盘使用率\n\n{result}"
            )]

        elif name == "service_health":
            job = arguments["job"]

            query = f'up{{job="{job}"}}'
            data = query_prometheus(query)

            result_data = data["data"]["result"]

            if not result_data:
                return [TextContent(
                    type="text",
                    text=f"❌ 未找到 job: {job}"
                )]

            output = f"## 服务健康状态: {job}\n\n"

            for item in result_data:
                instance = item["metric"].get("instance", "unknown")
                status = "✅ UP" if item["value"][1] == "1" else "❌ DOWN"
                output += f"- **{instance}**: {status}\n"

            return [TextContent(type="text", text=output)]

        return [TextContent(type="text", text=f"未知工具: {name}")]

    except requests.RequestException as e:
        return [TextContent(
            type="text",
            text=f"❌ Prometheus 连接错误: {str(e)}"
        )]
    except Exception as e:
        return [TextContent(type="text", text=f"❌ 错误: {str(e)}")]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
```

### 3.2 Claude Desktop 配置

```json
{
  "mcpServers": {
    "log-analyzer": {
      "command": "python",
      "args": ["/path/to/log-analyzer.py"]
    },
    "prometheus": {
      "command": "python",
      "args": ["/path/to/prometheus-monitor.py"],
      "env": {
        "PROMETHEUS_URL": "http://localhost:9090"
      }
    }
  }
}
```

---

## 4. 场景三：Docker 容器管理

### 4.3 简化实现

```python
#!/usr/bin/env python3
"""Docker 容器管理 MCP 服务器"""

import docker
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

app = Server("docker-manager")
client = docker.from_env()


@app.list_tools()
async def list_tools():
    return [
        Tool(
            name="list_containers",
            description="列出所有容器",
            inputSchema={"type": "object", "properties": {}}
        ),
        Tool(
            name="container_logs",
            description="查看容器日志",
            inputSchema={
                "type": "object",
                "properties": {
                    "container_id": {"type": "string"},
                    "lines": {"type": "integer", "default": 100}
                },
                "required": ["container_id"]
            }
        ),
        Tool(
            name="container_stats",
            description="查看容器资源使用情况",
            inputSchema={
                "type": "object",
                "properties": {
                    "container_id": {"type": "string"}
                },
                "required": ["container_id"]
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict):
    try:
        if name == "list_containers":
            containers = client.containers.list(all=True)

            output = "## Docker 容器列表\n\n"
            output += "| 名称 | 状态 | 镜像 | 端口 |\n"
            output += "| --- | --- | --- | --- |\n"

            for c in containers:
                ports = ", ".join(
                    f"{k}->{v[0]['HostPort']}"
                    for k, v in (c.ports or {}).items()
                    if v
                ) or "-"

                output += f"| {c.name} | {c.status} | {c.image.tags[0] if c.image.tags else 'N/A'} | {ports} |\n"

            return [TextContent(type="text", text=output)]

        elif name == "container_logs":
            container_id = arguments["container_id"]
            lines = arguments.get("lines", 100)

            container = client.containers.get(container_id)
            logs = container.logs(tail=lines).decode('utf-8')

            output = f"## 容器日志: {container.name}\n\n```\n{logs}\n```"

            return [TextContent(type="text", text=output)]

        elif name == "container_stats":
            container_id = arguments["container_id"]
            container = client.containers.get(container_id)
            stats = container.stats(stream=False)

            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                        stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                          stats['precpu_stats']['system_cpu_usage']
            cpu_percent = (cpu_delta / system_delta) * 100.0

            mem_usage = stats['memory_stats']['usage'] / (1024**2)
            mem_limit = stats['memory_stats']['limit'] / (1024**2)
            mem_percent = (mem_usage / mem_limit) * 100

            output = f"## 容器资源使用: {container.name}\n\n"
            output += f"- **CPU**: {cpu_percent:.2f}%\n"
            output += f"- **内存**: {mem_usage:.2f} MB / {mem_limit:.2f} MB ({mem_percent:.2f}%)\n"

            return [TextContent(type="text", text=output)]

    except docker.errors.NotFound:
        return [TextContent(type="text", text="❌ 容器不存在")]
    except Exception as e:
        return [TextContent(type="text", text=f"❌ 错误: {str(e)}")]
```

---

## 5. 最佳实践总结

### 5.1 安全性

1. **输入验证**：严格验证所有用户输入
2. **权限控制**：使用最小权限原则
3. **路径限制**：限制文件访问范围
4. **命令白名单**：只允许安全的命令

### 5.2 性能优化

1. **缓存结果**：缓存频繁查询的数据
2. **异步处理**：使用异步 I/O
3. **限制结果集**：避免返回过大的数据
4. **超时控制**：设置合理的超时时间

### 5.3 可维护性

1. **结构化日志**：使用统一的日志格式
2. **错误处理**：提供友好的错误信息
3. **文档完善**：为每个工具提供清晰的描述
4. **版本管理**：使用语义化版本号

---

## 6. 下一步

恭喜！你已经完成了 MCP 完整教程。现在你可以：

1. 根据实际需求开发自定义 MCP 服务器
2. 探索[官方服务器示例](https://github.com/modelcontextprotocol/servers)
3. 加入 [Discord 社区](https://discord.gg/anthropic)与其他开发者交流
4. 为 MCP 生态贡献代码

---

**提示**：MCP 是一个快速发展的协议，建议关注官方文档获取最新信息。
