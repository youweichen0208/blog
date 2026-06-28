# Sentry 集成指南：从错误监控到根因定位

## 概述

Sentry 是一个实时的应用错误监控和性能追踪平台。线上服务发生异常时，自动捕获并上报到 Sentry，它会自动聚合相同类型的错误为 issue，记录堆栈追踪、用户影响范围、性能指标等关键信息。

**核心价值**：
- **实时告警**：异常秒级上报，支持邮件/Slack/钉钉告警
- **智能聚合**：相同错误自动分组，避免告警风暴
- **完整上下文**：堆栈、环境变量、用户会话、性能数据一应俱全
- **Claude 集成**：使用 `error-log-locator` skill 从线上堆栈直接定位代码根因

**适用场景**：
- Go/Python/Node.js/Java 等服务部署在 DigitalOcean、国内 ECS
- 需要快速响应线上问题，从堆栈追踪定位代码缺陷
- 需要追踪性能瓶颈和用户影响范围

---

## 第一部分：安装和基础配置

### 1.1 Sentry 账户和项目创建

1. **访问 Sentry**：https://sentry.io
2. **创建账户**（或使用现有账户）
3. **创建项目**：选择你的编程语言（如 Python、Go、Node.js 等）
4. **获取 DSN**（Data Source Name）
   - 项目设置 → Client Keys (DSN)
   - 格式：`https://<public>@<host>/<project-id>`
   - 这是连接服务到 Sentry 的唯一标识

### 1.2 Python 服务集成（FastAPI 示例）

**安装 SDK**：
```bash
pip install sentry-sdk[fastapi]
```

**初始化（应用启动时）**：
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from fastapi import FastAPI

sentry_sdk.init(
    dsn="your-sentry-dsn-here",
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,  # 采样率 10%，性能影响最小
    profiles_sample_rate=0.1,  # 性能分析采样率
    environment="production",  # 环境标签
)

app = FastAPI()

# Sentry 会自动捕获：
# - 未处理异常
# - HTTP 错误响应
# - 性能瓶颈
```

**自定义捕获异常**：
```python
from fastapi import HTTPException

@app.get("/api/users/{user_id}")
async def get_user(user_id: int):
    try:
        # 业务逻辑
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        return user
    except Exception as e:
        # 方式1：让 Sentry 自动捕获（推荐）
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail=str(e))
```

**添加上下文信息**：
```python
with sentry_sdk.push_scope() as scope:
    scope.set_tag("payment_id", payment.id)
    scope.set_context("payment_details", {
        "amount": payment.amount,
        "currency": payment.currency,
        "status": payment.status,
    })
    # 此作用域内的异常都会携带这些信息
    process_payment(payment)
```

### 1.3 Go 服务集成（标准 HTTP 示例）

**安装 SDK**：
```bash
go get github.com/getsentry/sentry-go
```

**初始化**：
```go
package main

import (
	"github.com/getsentry/sentry-go"
	"time"
)

func init() {
	err := sentry.Init(sentry.ClientOptions{
		Dsn:             "your-sentry-dsn-here",
		Environment:     "production",
		TracesSampleRate: 0.1,
		ProfilesSampleRate: 0.1,
	})
	if err != nil {
		panic(err)
	}
	defer sentry.Flush(2 * time.Second)
}
```

**在 HTTP 中间件中捕获**：
```go
import (
	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
)

func main() {
	// 创建带 Sentry 的 HTTP 客户端
	sentryClient := sentryhttp.NewClient(sentry.GetCurrentClient())
	
	// 或在 mux 中使用中间件
	mux := http.NewServeMux()
	handler := sentryhttp.New(sentryhttp.Options{}).Handle(mux)
	
	// 所有未处理异常和 panic 都会自动捕获
}
```

**手动上报**：
```go
func processOrder(orderID string) error {
	defer func() {
		if err := recover(); err != nil {
			sentry.CaptureException(err.(error))
		}
	}()
	
	// 业务逻辑
	order, err := db.GetOrder(orderID)
	if err != nil {
		// 上报异常并附加上下文
		sentry.WithScope(func(scope *sentry.Scope) {
			scope.SetTag("order_id", orderID)
			scope.SetContext("order_details", map[string]interface{}{
				"id": orderID,
				"status": order.Status,
			})
			sentry.CaptureException(err)
		})
		return err
	}
	return nil
}
```

### 1.4 配置环境变量

避免将 DSN 硬编码。使用环境变量：

**Dockerfile**：
```dockerfile
FROM python:3.11
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
ENV SENTRY_DSN=${SENTRY_DSN}
ENV ENVIRONMENT=production
CMD ["python", "-m", "uvicorn", "main:app"]
```

**Kubernetes ConfigMap**：
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  SENTRY_DSN: "https://xxx@xxx.ingest.sentry.io/xxx"
  ENVIRONMENT: "production"
```

---

## 第二部分：Sentry 中的错误聚合和分析

### 2.1 Issue 界面详解

登录 Sentry 后，访问 Issues 列表：

| 字段 | 含义 |
|------|------|
| **Error Title** | 错误类型和简短描述 |
| **Users Affected** | 受影响的用户数 |
| **Events** | 该错误发生的总次数 |
| **Last Seen** | 最后一次发生的时间 |
| **Assignee** | 分配给谁解决 |
| **Status** | Unresolved / Resolved / Archived / Ignored |

### 2.2 Issue 详情页

点击任何 Issue，查看：

**Breadcrumbs（事件轨迹）**：
```
2024-06-20 10:15:23.456 [http] GET /api/users/123
2024-06-20 10:15:23.457 [db] Query executed: SELECT * FROM users
2024-06-20 10:15:23.789 [error] PostgreSQL connection timeout
2024-06-20 10:15:23.790 [exception] ConnectionError: connection refused
```

**堆栈追踪**：
```
Traceback (most recent call last):
  File "/app/handlers.py", line 45, in get_user
    user = db.query(User).filter(...).first()
  File "/app/database.py", line 120, in query
    return self.session.query(model)
  File "/venv/lib/python3.11/site-packages/sqlalchemy/orm/session.py", line 1234, in query
    return self._query_cls(self, entities, ...)
...
psycopg2.OperationalError: could not connect to server
```

**Tags（标签）**：快速筛选
```
environment: production
server_name: api-server-001
level: error
version: 2.1.0
```

**Release Tracking**：追踪哪个版本引入的问题

### 2.3 告警和通知

**设置告警规则**：
1. Alerts → Create Alert Rule
2. 选择触发条件：如果 5 分钟内同一错误发生 >10 次
3. 选择通知方式：Email、Slack、钉钉等

**最佳实践**：
- 不要为每个错误设置告警（会导致告警风暴）
- 为关键业务流程设置告警（支付、登录、订单等）
- 使用不同的告警级别（warning/error/critical）

---

## 第三部分：与 Claude 的集成

### 3.1 使用 error-log-locator Skill

安装完 Sentry 后，你已经有 `error-log-locator` skill。它能做什么：

1. **自动拉取 Sentry issue**：连接 Sentry API，获取最新错误
2. **解析堆栈追踪**：从 Sentry issue 提取完整堆栈
3. **定位代码位置**：在你的本地代码仓库中找到引发错误的确切行
4. **提供修复建议**：根据上下文给出修复思路

### 3.2 使用流程

**Scenario 1：线上报错，快速定位**

1. Sentry 收到新 issue 并发出告警（邮件/Slack）
2. 打开 Cowork，在聊天中说：
   ```
   Sentry 上线上报错，错误消息是"connection timeout on payment processing"，
   帮我找到代码里对应的位置并给出修复建议。
   ```
3. Cowork 调用 `error-log-locator` skill，自动：
   - 连接你的 Sentry 数据源
   - 查找该错误的最新 issue
   - 获取完整堆栈追踪
   - 在你的代码仓库中定位问题行
   - 分析根因并建议修复方案

**Scenario 2：追踪特定用户的错误**

```
有个用户投诉说支付一直失败，
追踪用户 ID user_12345 在 Sentry 中的所有错误。
```

Skill 会：
- 筛选 `user_id: user_12345` 的所有事件
- 按时间线展示该用户遇到的所有错误
- 帮助识别是该用户独有的问题，还是普遍问题

### 3.3 Sentry 连接器配置

在 Cowork 中配置 Sentry 连接器：

1. **Settings → Connectors**
2. **搜索 Sentry**
3. **授权**：
   - 输入你的 Sentry 账户 API Token
   - 选择要监控的组织和项目
4. **测试连接**：确认能正确拉取数据

获取 API Token：
- Sentry Settings → Auth Tokens
- 创建新 token，勾选 `event:read` 和 `issue:read` 权限

---

## 第四部分：最佳实践

### 4.1 采样策略（避免成本爆炸）

Sentry 按事件数量收费，采样可以降低成本：

```python
sentry_sdk.init(
    dsn="...",
    traces_sample_rate=0.1,  # 只采样 10% 的请求
    # 但对特定操作保留 100% 采样
    before_send=lambda event, hint: event if event.get("tags", {}).get("critical") else (None if random.random() > 0.1 else event),
)
```

### 4.2 敏感信息过滤

防止 Sentry 上报密钥、用户密码等：

```python
def scrub_sensitive_data(event, hint):
    # 移除 headers 中的 Authorization
    if "request" in event:
        del event["request"]["headers"].get("Authorization", None)
    # 移除 POST body 中的敏感字段
    if "request" in event and "data" in event["request"]:
        event["request"]["data"].pop("password", None)
        event["request"]["data"].pop("credit_card", None)
    return event

sentry_sdk.init(
    dsn="...",
    before_send=scrub_sensitive_data,
)
```

### 4.3 性能监控配置

监控关键业务函数的性能：

```python
from sentry_sdk import start_transaction

@app.post("/api/checkout")
async def checkout(order: Order):
    with start_transaction(
        op="checkout",
        name="Process Checkout",
        tags={"order_id": order.id}
    ):
        # 这个事务的性能会被追踪
        payment = await process_payment(order)
        await update_order_status(order.id, "paid")
    return {"status": "success"}
```

### 4.4 Release Tracking

关联错误与代码版本，快速判断是新引入的还是遗留问题：

```python
import sentry_sdk

sentry_sdk.init(
    dsn="...",
    release="2.1.0",  # 从 git tag 或 package.json 读取
    environment="production",
)
```

在部署时也设置：
```bash
# 告知 Sentry 新版本已部署
curl -X POST https://sentry.io/api/0/organizations/{org}/releases/ \
  -H 'Authorization: Bearer your-token' \
  -d '{"version":"2.1.0","projects":["project-id"]}'
```

### 4.5 源地图（Source Maps）支持

如果使用 TypeScript 或压缩的 JavaScript，上传源地图便于调试：

```bash
sentry-cli releases files upload-sourcemaps dist/ \
  --release 2.1.0 \
  --url-prefix '~/static/'
```

### 4.6 创建有用的 issue 规则

自动将相关错误分组，避免告警噪音：

- **按异常类型分组**：`DatabaseError`、`ValidationError` 等
- **按用户影响分组**：只关注影响 >100 用户的错误
- **按环境分组**：生产环境的错误优先级更高

### 4.7 定期 Review

建立周期性工作流：

| 周期 | 行动 |
|------|------|
| **每日** | 检查 Critical 级别错误，分配给开发者修复 |
| **每周** | 回顾本周新增错误，评估系统稳定性 |
| **每月** | 分析错误趋势，识别需要重构的模块 |

---

## 第五部分：案例分析

### 案例：支付流程超时问题

**线上现象**：用户反映支付经常超时，Sentry 报告 PostgreSQL 连接超时。

**问题定位流程**：

1. **Sentry 看到**：
   ```
   Exception: psycopg2.OperationalError: could not connect to server
   File: /app/handlers.py, line 45, in get_user
   File: /app/database.py, line 120, in query
   Tags: environment=production, payment_id=pay_xxx
   ```

2. **使用 error-log-locator**：
   ```
   告诉我支付相关的最新错误在代码里的具体位置
   ```

3. **Claude 分析**：
   - 定位到 `/app/database.py` 第 120 行的连接池配置
   - 发现连接池大小设置过小（只有 5 个连接）
   - 在高并发时无空闲连接，导致超时

4. **修复**：
   ```python
   # before
   pool = create_pool(max_size=5, timeout=10)
   
   # after
   pool = create_pool(max_size=20, timeout=30)
   ```

5. **验证**：
   - 部署新版本，上传 release 标记
   - 监控该错误的发生次数下降
   - 一周后该错误彻底解决，Sentry issue 标记为 Resolved

---

## 第六部分：故障排查

### Q1：Sentry 未收到异常

**检查清单**：
```python
# 1. 确认 DSN 正确
print(sentry_sdk.get_client().dsn)

# 2. 确认错误等级高于阈值（默认 >= error）
sentry_sdk.capture_message("test", level="error")

# 3. 检查防火墙是否阻止了到 sentry.io 的出站连接
# 4. 检查是否设置了 before_send 过滤器导致丢弃
```

### Q2：性能下降明显

**可能原因和优化**：
- **采样率过高**：降低 `traces_sample_rate` 到 0.01-0.05
- **过多的 breadcrumbs**：设置 `max_breadcrumbs=50`
- **频繁的 push_scope**：改用上下文管理器

```python
sentry_sdk.init(
    dsn="...",
    traces_sample_rate=0.05,  # 降到 5%
    max_breadcrumbs=50,
)
```

### Q3：存储成本高

**降低成本的方法**：
1. 不采样关键业务函数（`traces_sample_rate=1.0`）
2. 采样非关键函数（`traces_sample_rate=0.01`）
3. 使用动态采样规则：
   ```python
   def sample_transaction(sampling_context):
       if sampling_context["transaction_context"]["op"] == "checkout":
           return 1.0  # 100% 采样支付流程
       return 0.1  # 其他 10% 采样
   
   sentry_sdk.init(
       dsn="...",
       traces_sampler=sample_transaction,
   )
   ```

---

## 总结

**Sentry + Claude Code 的工作流**：

```
线上异常发生
    ↓
Sentry 自动捕获并聚合
    ↓
告警通知（邮件/Slack）
    ↓
打开 Claude Code，调用 error-log-locator
    ↓
自动定位代码、分析根因、建议修复
    ↓
修复、部署、标记版本
    ↓
Sentry 追踪该错误消失
```

这个闭环让你从告警到修复的平均时间从小时级降到分钟级。
