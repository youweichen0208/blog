# RDS CLI 开发教程：Go + Cobra 从零开始

---

## 什么是 CLI？

CLI（Command Line Interface）是命令行界面，通过在终端输入文本命令来操作程序，而不是用鼠标点击图形界面（GUI）。

你日常用的很多工具都是 CLI：

```bash
git push origin main          # Git：代码版本管理
docker run -d nginx           # Docker：容器管理
kubectl get pods              # Kubernetes：集群管理
aws s3 ls                     # AWS CLI：云服务管理
```

CLI 的核心特点：

- **输入是文本命令**：`命令 子命令 --参数 值` 这种结构
- **输出也是文本**：返回 JSON、表格、或纯文本
- **可编程**：命令可以写进脚本，实现自动化
- **可组合**：多个命令可以通过管道串联

### CLI vs GUI vs API

|              | CLI                        | GUI（控制台）           | API                  |
| ------------ | -------------------------- | ----------------------- | -------------------- |
| **使用方式** | 终端敲命令                 | 浏览器点击              | 代码调用             |
| **学习成本** | 需要记命令                 | 直观，上手快            | 需要看文档           |
| **自动化**   | 天然支持脚本               | 不支持                  | 支持                 |
| **AI 友好**  | 文本输入输出，LLM 天然理解 | 需要视觉识别，AI 难操作 | 需要理解 JSON Schema |
| **适合谁**   | 开发者、运维、Agent        | 所有人                  | 开发者               |

**关键洞察**：CLI 是最适合 AI Agent 的交互方式。LLM 本质是文本模型，CLI 的输入输出都是文本，天然契合。相比之下，让 AI 操作 GUI 需要"看屏幕"，调 API 需要理解复杂的 JSON Schema，而 CLI 命令本身就是自然语言——`rds slowlog list` 人和 AI 都能一眼看懂。

---

## 为什么是 CLI + Agent？

传统 CLI 和 AI Agent 结合后，产生了一种新的产品形态：**Agent CLI**。

### 传统 CLI 的问题

用户必须自己知道该敲什么命令。比如"数据库变慢了"，你需要：

```bash
# 第一步：查慢查询
aws rds describe-slow-query-logs --db-instance-identifier prod-db ...

# 第二步：查监控
aws cloudwatch get-metric-statistics --namespace AWS/RDS ...

# 第三步：查连接数
aws rds describe-db-instances --query "DBInstances[0].Endpoint" ...

# 第四步：自己分析结果...
```

你得知道有哪些命令、参数怎么填、结果怎么看、下一步该查什么。这对非专业 DBA 来说门槛很高。

### Agent CLI 的解法

在 CLI 之上加一层 LLM，用户只需要说自然语言：

```
$ rds agent
> 数据库变慢了，帮我看看怎么回事

🤔 正在诊断...
📋 执行: rds slowlog list --instance prod-db --top 10
📋 执行: rds monitor --instance prod-db
📋 执行: rds instance describe --instance prod-db

📊 诊断报告：
1. 发现 3 条慢查询，最慢的是一条全表扫描，耗时 3.2 秒
2. CPU 使用率 85%，偏高
3. 当前连接数 450/500，接近上限

💡 建议：
- 给 orders 表的 status 字段加索引
- 考虑升配到 8C16G
- 检查是否有连接泄漏
```

Agent 自动完成了：意图理解 → 任务拆解 → 命令执行 → 结果分析 → 给出建议。

### Agent CLI 能处理的场景

以 RDS 为例，Agent CLI 可以覆盖以下场景：

**日常运维**

- "帮我看看所有实例的状态" → 自动列出实例、标记异常
- "生产库磁盘还剩多少" → 查询监控指标并预测增长趋势
- "帮我做一次全面巡检" → 自动跑 CPU、内存、磁盘、连接数、慢查询全套检查

**故障诊断**

- "数据库变慢了" → 自动排查慢查询、锁等待、资源瓶颈
- "应用连不上数据库" → 检查实例状态、安全组、连接数上限
- "今天凌晨 3 点数据库 CPU 飙到 100%" → 查历史监控 + 对应时段慢查询

**变更操作**

- "帮我把测试库从 2C4G 升到 4C8G" → 生成变更计划，确认后执行
- "备份一下生产库" → 创建快照
- "把这个参数改成 200" → 展示 diff，确认后修改

**分析报告**

- "给我出一份上周的数据库周报" → 汇总各项指标，生成报告
- "对比一下生产和预发的配置差异" → 拉取两个实例的配置做 diff

这些场景的共同点是：**CLI 提供原子操作能力，Agent 负责编排和决策**。单独的 CLI 需要人来编排，单独的 LLM 没有执行能力，两者结合才是完整方案。

---

## 为什么选 Go + Cobra？

### 为什么用 Go 而不是 Python / Node.js？

| 对比项       | Go                       | Python (Click)     | Node.js (Commander)     |
| ------------ | ------------------------ | ------------------ | ----------------------- | ------------------- |
| **分发方式** | 单个二进制文件，下载即用 | 需要装 Python 环境 | 需要装 Node.js          |
| **启动速度** | ~10ms                    | ~200ms             | ~100ms                  |
| **跨平台**   | 交叉编译一行命令         | 打包成 exe 很麻烦  | 需要 pkg 等工具         |
| **依赖管理** | go.mod，零外部依赖       | pip/venv 依赖冲突  | node_modules 臃肿       |
| **客户体验** | `curl                    | sh` 直接用         | "请先安装 Python 3.10+" | "请先安装 Node 18+" |

**一句话总结**：面向客户分发的 CLI 工具，Go 的零依赖分发是决定性优势。

### 为什么用 Cobra 框架？

Cobra 是 Go 生态最主流的 CLI 框架，以下知名项目都用它：

- **kubectl** (Kubernetes)
- **docker**
- **gh** (GitHub CLI)
- **hugo**

Cobra 帮你处理的事情：

1. **子命令结构**：`rds instance list`、`rds slowlog analyze` 这种多层命令
2. **参数解析**：`--instance prod-db --top 10 --output json`
3. **自动生成 help**：`rds --help`、`rds slowlog --help` 自动生成
4. **参数校验**：必填参数、参数类型、默认值
5. **自动补全**：支持 bash/zsh/fish 自动补全

---

## 环境准备

### 1. 安装 Go

```bash
# macOS
brew install go

# Linux
wget https://go.dev/dl/go1.22.4.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.22.4.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# 验证
go version
# go version go1.22.4 darwin/arm64
```

### 2. 初始化项目

```bash
mkdir rds-cli && cd rds-cli
go mod init github.com/yourorg/rds-cli
```

### 3. 安装 Cobra

```bash
# 安装 Cobra 库
go get github.com/spf13/cobra@latest

# 安装 Cobra CLI 脚手架工具（可选，帮你自动生成命令模板）
go install github.com/spf13/cobra-cli@latest
```

---

## 项目结构

```
rds-cli/
├── main.go              # 入口，只有一行
├── go.mod
├── go.sum
├── cmd/                  # 所有命令
│   ├── root.go          # 根命令 rds
│   ├── instance.go      # rds instance
│   ├── instance_list.go # rds instance list
│   ├── slowlog.go       # rds slowlog
│   ├── slowlog_list.go  # rds slowlog list
│   └── monitor.go       # rds monitor
├── internal/             # 内部业务逻辑
│   ├── api/             # 云厂商 API 调用
│   │   └── client.go
│   └── output/          # 输出格式化
│       └── json.go
└── configs/
    └── config.yaml      # 配置文件（AK/SK、Region 等）
```

---

## 第一步：写入口文件

### main.go

```go
package main

import "github.com/yourorg/rds-cli/cmd"

func main() {
	cmd.Execute()
}
```

就这么简单，所有逻辑都在 cmd 包里。

---

## 第二步：写根命令

### cmd/root.go

```go
package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

// 全局变量：输出格式
var outputFormat string

// 根命令：rds
var rootCmd = &cobra.Command{
	Use:   "rds",
	Short: "RDS 数据库运维 CLI 工具",
	Long: `RDS CLI 是一个数据库运维命令行工具。
支持实例管理、慢查询分析、备份恢复、监控查看等功能。

搭配 RDS Agent 使用，可以用自然语言完成数据库运维操作。`,
}

// Execute 被 main.go 调用
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func init() {
	// 全局 flag，所有子命令都能用
	rootCmd.PersistentFlags().StringVarP(&outputFormat, "output", "o", "json", "输出格式: json | table | text")
}
```

此时运行 `go run main.go --help` 就能看到帮助信息了。

---

## 第三步：写子命令（以 slowlog 为例）

### cmd/slowlog.go — 父命令

```go
package cmd

import "github.com/spf13/cobra"

// rds slowlog（父命令，不能直接执行）
var slowlogCmd = &cobra.Command{
	Use:   "slowlog",
	Short: "慢查询管理",
	Long:  "查看、分析和导出 RDS 实例的慢查询日志",
}

func init() {
	// 挂到根命令下：rds slowlog
	rootCmd.AddCommand(slowlogCmd)
}
```

### cmd/slowlog_list.go — 子命令

```go
package cmd

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/spf13/cobra"
)

var (
	instanceID string
	topN       int
	days       int
)

// rds slowlog list
var slowlogListCmd = &cobra.Command{
	Use:   "list",
	Short: "列出慢查询",
	Long:  "列出指定 RDS 实例的慢查询日志，支持按执行时间排序",
	Example: `  # 查看最近 7 天最慢的 10 条 SQL
  rds slowlog list --instance rm-abc123 --top 10 --days 7

  # 以 table 格式输出
  rds slowlog list --instance rm-abc123 --output table`,
	RunE: func(cmd *cobra.Command, args []string) error {
		return runSlowlogList()
	},
}

func init() {
	// 挂到 slowlog 命令下：rds slowlog list
	slowlogCmd.AddCommand(slowlogListCmd)

	// 定义参数
	slowlogListCmd.Flags().StringVarP(&instanceID, "instance", "i", "", "RDS 实例 ID（必填）")
	slowlogListCmd.Flags().IntVarP(&topN, "top", "t", 10, "返回最慢的 N 条记录")
	slowlogListCmd.Flags().IntVarP(&days, "days", "d", 7, "查询最近 N 天的慢查询")

	// 标记必填参数
	slowlogListCmd.MarkFlagRequired("instance")
}

// SlowLog 慢查询记录
type SlowLog struct {
	SQLID        string  `json:"sql_id"`
	SQL          string  `json:"sql"`
	ExecTime     float64 `json:"exec_time_seconds"`
	RowsExamined int     `json:"rows_examined"`
	RowsSent     int     `json:"rows_sent"`
	Timestamp    string  `json:"timestamp"`
}

// SlowLogResult 返回结果
type SlowLogResult struct {
	Instance   string    `json:"instance"`
	QueryDays  int       `json:"query_days"`
	TotalCount int       `json:"total_count"`
	TopN       int       `json:"top_n"`
	Records    []SlowLog `json:"records"`
}

func runSlowlogList() error {
	// TODO: 这里替换成真实的云厂商 API 调用
	// 现在先用 mock 数据演示
	result := SlowLogResult{
		Instance:   instanceID,
		QueryDays:  days,
		TotalCount: 42,
		TopN:       topN,
		Records: []SlowLog{
			{
				SQLID:        "sql_001",
				SQL:          "SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at",
				ExecTime:     3.24,
				RowsExamined: 1500000,
				RowsSent:     234,
				Timestamp:    time.Now().Add(-2 * time.Hour).Format(time.RFC3339),
			},
			{
				SQLID:        "sql_002",
				SQL:          "SELECT u.*, o.* FROM users u JOIN orders o ON u.id = o.user_id WHERE u.region = 'east'",
				ExecTime:     2.18,
				RowsExamined: 890000,
				RowsSent:     1205,
				Timestamp:    time.Now().Add(-5 * time.Hour).Format(time.RFC3339),
			},
			{
				SQLID:        "sql_003",
				SQL:          "UPDATE products SET stock = stock - 1 WHERE id IN (SELECT product_id FROM cart WHERE user_id = 999)",
				ExecTime:     1.87,
				RowsExamined: 450000,
				RowsSent:     0,
				Timestamp:    time.Now().Add(-8 * time.Hour).Format(time.RFC3339),
			},
		},
	}

	// 输出 JSON（给 Agent 解析用）
	output, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return fmt.Errorf("JSON 序列化失败: %w", err)
	}

	fmt.Println(string(output))
	return nil
}
```

---

## 第四步：编译和测试

```bash
# 直接运行
go run main.go slowlog list --instance rm-abc123 --top 5

# 编译成二进制
go build -o rds

# 使用二进制
./rds slowlog list --instance rm-abc123

# 查看帮助
./rds --help
./rds slowlog --help
./rds slowlog list --help

# 缺少必填参数会自动报错
./rds slowlog list
# Error: required flag(s) "instance" not set
```

输出示例：

```json
{
  "instance": "rm-abc123",
  "query_days": 7,
  "total_count": 42,
  "top_n": 5,
  "records": [
    {
      "sql_id": "sql_001",
      "sql": "SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at",
      "exec_time_seconds": 3.24,
      "rows_examined": 1500000,
      "rows_sent": 234,
      "timestamp": "2026-03-31T22:00:00+08:00"
    }
  ]
}
```

---

## 第五步：继续添加命令

用同样的模式添加更多命令：

### cmd/instance.go

```go
package cmd

import "github.com/spf13/cobra"

var instanceCmd = &cobra.Command{
	Use:   "instance",
	Short: "实例管理",
}

func init() {
	rootCmd.AddCommand(instanceCmd)
}
```

### cmd/instance_list.go

```go
package cmd

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"
)

var instanceListCmd = &cobra.Command{
	Use:     "list",
	Short:   "列出所有 RDS 实例",
	Example: "  rds instance list --output json",
	RunE: func(cmd *cobra.Command, args []string) error {
		// TODO: 调用云厂商 API
		result := map[string]interface{}{
			"total": 3,
			"instances": []map[string]interface{}{
				{
					"id":     "rm-abc123",
					"name":   "prod-db",
					"engine": "MySQL 8.0",
					"spec":   "4C8G",
					"status": "running",
				},
				{
					"id":     "rm-def456",
					"name":   "staging-db",
					"engine": "MySQL 8.0",
					"spec":   "2C4G",
					"status": "running",
				},
			},
		}

		output, _ := json.MarshalIndent(result, "", "  ")
		fmt.Println(string(output))
		return nil
	},
}

func init() {
	instanceCmd.AddCommand(instanceListCmd)
}
```

### cmd/monitor.go

```go
package cmd

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"
)

var monitorInstanceID string

var monitorCmd = &cobra.Command{
	Use:   "monitor",
	Short: "查看监控指标",
	Long:  "查看 RDS 实例的 CPU、内存、连接数、IOPS 等监控数据",
	Example: `  rds monitor --instance rm-abc123`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// TODO: 调用云厂商监控 API
		result := map[string]interface{}{
			"instance": monitorInstanceID,
			"metrics": map[string]interface{}{
				"cpu_percent":     35.2,
				"memory_percent":  68.5,
				"connections":     120,
				"max_connections": 500,
				"iops_read":      1500,
				"iops_write":     800,
				"disk_used_gb":   45.3,
				"disk_total_gb":  100,
			},
		}

		output, _ := json.MarshalIndent(result, "", "  ")
		fmt.Println(string(output))
		return nil
	},
}

func init() {
	rootCmd.AddCommand(monitorCmd)
	monitorCmd.Flags().StringVarP(&monitorInstanceID, "instance", "i", "", "RDS 实例 ID（必填）")
	monitorCmd.MarkFlagRequired("instance")
}
```

---

## 第六步：交叉编译

Go 的交叉编译非常简单，一行命令生成不同平台的二进制：

```bash
# macOS (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -o rds-darwin-arm64

# macOS (Intel)
GOOS=darwin GOARCH=amd64 go build -o rds-darwin-amd64

# Linux
GOOS=linux GOARCH=amd64 go build -o rds-linux-amd64

# Windows
GOOS=windows GOARCH=amd64 go build -o rds-windows-amd64.exe
```

一套代码，编译出所有平台的二进制，客户下载对应版本就能用。

---

## 第七步：对接 TS Agent

CLI 写好后，TS Agent 通过子进程调用：

```typescript
// agent/src/executor.ts
import { execSync } from "child_process";

interface CLIResult {
  success: boolean;
  data: any;
  error?: string;
}

export function runCLI(command: string): CLIResult {
  try {
    const result = execSync(`./rds ${command} --output json`, {
      encoding: "utf-8",
      timeout: 30000,
    });
    return { success: true, data: JSON.parse(result) };
  } catch (err: any) {
    return { success: false, data: null, error: err.message };
  }
}

// 使用示例
const slowlogs = runCLI("slowlog list --instance rm-abc123 --top 10");
const metrics = runCLI("monitor --instance rm-abc123");
```

---

## 设计原则

### 1. 输出永远是 JSON

Agent 需要解析 CLI 的输出，JSON 是最友好的格式。人类想看可读格式时用 `--output table`。

### 2. 错误也要结构化

```go
// 错误输出也用 JSON，方便 Agent 解析
type ErrorResult struct {
    Error   string `json:"error"`
    Code    string `json:"code"`
    Message string `json:"message"`
}
```

### 3. 命令命名语义清晰

```bash
rds slowlog list        # 列出
rds slowlog analyze     # 分析
rds instance describe   # 详情
rds backup create       # 创建
rds config set          # 修改
```

LLM 看到命令名就能理解用途，不需要额外解释。

### 4. 每个命令都有 Example

Cobra 的 `Example` 字段会出现在 `--help` 输出里。这些示例同时也是给 LLM 看的 few-shot examples。

---

## 下一步

1. **替换 mock 数据**：用云厂商 SDK（如阿里云 OpenAPI SDK）替换 `runSlowlogList` 里的假数据
2. **添加配置管理**：用 `viper`（Cobra 的配套库）管理 AK/SK、Region 等配置
3. **写 TS Agent**：实现 Agent loop，把 CLI 命令文档作为 system prompt 喂给 LLM
4. **添加更多命令**：backup、config、diagnose 等
