# M08 · instance-create — 创建实例命令

## 做什么

**一句话描述**：创建 RDS 实例，支持全参数传入，创建后默认等待实例就绪。

**用户故事**
> 作为 DevOps 工程师，我想通过一条命令创建数据库实例，不需要登录控制台手动操作。

**命令格式**
```bash
hwrds instance create \
  --engine MySQL \
  --engine-version 8.0 \
  --flavor rds.mysql.m6.large.8 \
  --volume-size 200 \
  --name prod-mysql \
  --vpc-id vpc-xxx \
  --subnet-id subnet-xxx \
  --password 'MyPass123!'

hwrds instance create ... --no-wait
hwrds instance create ... --output json
```

**参数定义**

| 参数 | 必填 | 类型 | 默认值 | 说明 |
|---|---|---|---|---|
| --engine | 是 | enum | — | MySQL / PostgreSQL / SQLServer |
| --engine-version | 否 | string | 最新稳定版 | 引擎版本 |
| --flavor | 是 | string | — | 规格代码 |
| --volume-size | 是 | int | — | 存储大小 (GB) |
| --volume-type | 否 | enum | ULTRAHIGH | 存储类型 |
| --name | 是 | string | — | 实例名称 |
| --vpc-id | 是 | string | — | VPC ID |
| --subnet-id | 是 | string | — | 子网 ID |
| --password | 是 | string | — | root 密码 |
| --az | 否 | string | 随机 | 可用区 |
| --no-wait | 否 | bool | false | 跳过等待 |

**业务规则**
- 必填参数缺失时逐个提示缺哪个
- 创建前校验 flavor 是否存在
- 密码格式：大小写字母 + 数字，至少 8 位
- 创建成功后默认调 Waiter 等待 Running
- 就绪后输出连接信息

---

## 怎么做

**涉及文件**
```
cmd/instance_create.go     — Cobra 命令 + 参数定义
service/instance.go        — InstanceService.Create()
service/waiter.go          — WaiterService（M09）
sdk/rds.go                 — CreateInstance API 定义
types/instance.go          — Instance / CreateInput 结构体
```

**调用链路**
```
cmd/instance_create.go
  → 校验必填参数
  → service.FlavorService.List(engine)  // 校验 flavor
  → service.InstanceService.Create(input)
    → sdk.RdsClient.Post("/v3/{project}/instances", body)
      → 华为云 API
    ← Instance{ID, Status: "Creating"}
  → service.WaiterService.Wait(instanceID, "Running", 15m)
  → 输出实例 ID + 连接信息
```

**错误处理映射**
```
参数缺失        → "缺少 --engine，用法: ..."
flavor 不存在   → "规格不存在" + 列出可用规格
密码不合规      → "密码需包含大小写字母和数字，至少 8 位"
VPC 不存在      → "VPC xxx 不存在"
余额不足        → "账户余额不足，请充值"
```

**依赖关系**
- 依赖 M03（SDK Client）、M05（flavor 校验）、M06（格式化）、M09（Waiter）

---

## 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M08-T01 | 定义 Instance / CreateInput 结构体 | P0 | 0.5h | 无 |
| M08-T02 | 定义所有 flags | P0 | 1h | 无 |
| M08-T03 | 实现必填参数校验 | P0 | 1h | T02 |
| M08-T04 | 实现 flavor 预校验 | P1 | 1h | M05 |
| M08-T05 | 实现密码格式校验 | P1 | 0.5h | 无 |
| M08-T06 | 定义 CreateInstance API 请求体 | P0 | 1h | M03 |
| M08-T07 | 实现 InstanceService.Create() | P0 | 2h | T06 |
| M08-T08 | 创建成功后输出实例 ID | P0 | 0.5h | T07 |
| M08-T09 | 默认调 Waiter 等待就绪 | P0 | 0.5h | M09 |
| M08-T10 | `--no-wait` flag 跳过等待 | P0 | 0.5h | T09 |
| M08-T11 | 就绪后输出连接命令 | P0 | 1h | T09 |
| M08-T12 | `--engine-version` 可选 | P1 | 0.5h | T02 |
| M08-T13 | `--volume-type` 可选 | P1 | 0.5h | T02 |
| M08-T14 | `--az` 可选 | P2 | 0.5h | T02 |
| M08-T15 | `--output json` | P0 | 0.5h | M06 |
| M08-T16 | 错误: flavor 不存在 → 列出可用规格 | P0 | 0.5h | T04 |
| M08-T17 | 错误: 密码不合规 → 提示格式 | P1 | 0.5h | T05 |
| M08-T18 | 错误: VPC/Subnet 不存在 → 提示 | P0 | 0.5h | T07 |

---

## 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M08-TC01 | 全参数创建成功 | 所有必填参数 | `✓ 实例创建中...` → 等待 → `✓ 实例就绪` | 集成测试 |
| M08-TC02 | 缺少 engine | 不传 --engine | `缺少必填参数 --engine` | 单元测试 |
| M08-TC03 | flavor 不存在 | `--flavor rds.xxx` | `规格不存在` + 可用列表 | 单元测试(Mock) |
| M08-TC04 | 密码不合规 | `--password 123` | `密码需包含大小写字母和数字，至少 8 位` | 单元测试 |
| M08-TC05 | --no-wait | 全参数 + --no-wait | 创建后直接返回 ID | 集成测试 |
| M08-TC06 | --output json | 全参数 + --output json | JSON 格式输出 | 集成测试 |
| M08-TC07 | 等待就绪 | 正常创建 | Spinner → Running → 连接命令 | 集成测试 |
| M08-TC08 | API 失败 | Mock 500 | 翻译后的错误提示 | 单元测试(Mock) |
