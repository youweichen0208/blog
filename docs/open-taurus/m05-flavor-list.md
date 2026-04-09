# M05 · flavor-list — 规格查询命令

## 做什么

**一句话描述**：查询指定引擎的可用数据库规格，同时作为整条链路（配置→签名→API→输出）的验证命令。

**用户故事**
> 作为客户，我想在创建实例前查看有哪些规格可选，方便选择合适的 CPU/内存配置。

**命令格式**
```
hwrds flavor list --engine MySQL
hwrds flavor list --engine PostgreSQL --output json
hwrds flavor list --engine MySQL --engine-version 8.0
```

**业务规则**
- `--engine` 必填，可选值：MySQL / PostgreSQL / SQLServer
- 表格展示：规格代码 / vCPUs / 内存(GB)
- 支持 `--output json`
- 无可用规格时输出提示而非空表格

---

## 怎么做

**涉及文件**
```
cmd/flavor_list.go        — Cobra 命令
service/flavor.go         — FlavorService.List()
sdk/rds.go                — ListFlavors API 定义
types/flavor.go           — Flavor 结构体
```

**调用链路**
```
cmd/flavor_list.go
  → service.FlavorService.List(engine)
    → sdk.RdsClient.Get("/v3/{project}/flavors?database_name={engine}")
      → 华为云 API
    ← []Flavor
  → ui.Formatter.Print(flavors, output)
```

**API**
```
GET /v3/{project_id}/flavors?database_name=MySQL
```

**依赖关系**
- 依赖 M03（SDK Client）发请求
- 依赖 M06（Formatter）格式化输出
- 被 M08（instance create）调用做 flavor 校验

---

## 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M05-T01 | 定义 Flavor 结构体（types/flavor.go） | P0 | 0.5h | 无 |
| M05-T02 | 实现 FlavorService.List(engine) | P0 | 1h | M03 |
| M05-T03 | 定义 ListFlavors API 请求（sdk/rds.go） | P0 | 0.5h | M03 |
| M05-T04 | 实现 cmd/flavor_list.go：--engine 必填 + 调 Service + 输出 | P0 | 1h | T02, M06 |
| M05-T05 | 无结果时输出 `暂无可用规格` | P1 | 0.5h | T04 |
| M05-T06 | `--engine-version` 可选过滤 | P2 | 1h | T04 |

---

## 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M05-TC01 | 查询 MySQL 规格 | `--engine MySQL` | 表格展示规格列表 | 集成测试 |
| M05-TC02 | JSON 输出 | `--engine MySQL --output json` | JSON 格式规格列表 | 集成测试 |
| M05-TC03 | 不支持的引擎 | `--engine Oracle` | `不支持的引擎类型，可选: MySQL, PostgreSQL, SQLServer` | 单元测试 |
| M05-TC04 | 链路验证 | 首次执行 | 配置→签名→API→解析→输出 全链路跑通 | 集成测试 |
