# M10 · instance-list — 列出实例命令

## 做什么

**一句话描述**：列出当前账号下所有 RDS 实例，表格展示关键信息，状态彩色标识。

**命令格式**
```bash
hwrds instance list
hwrds instance list --output json
hwrds instance list --engine MySQL
hwrds instance list --status Running
```

**表格列**

ID / 名称 / 引擎 / 规格（合并 CPU + 内存）/ 状态（彩色）/ 创建时间（仅日期）

**业务规则**
- 自动处理分页（单页最大 100）
- 无实例时输出提示而非空表格
- 底部显示总数

---

## 怎么做

**涉及文件**
```
cmd/instance_list.go    — Cobra 命令
service/instance.go     — InstanceService.List()
```

**分页处理**
```
offset = 0, limit = 100
loop:
  resp = GET /v3/{project}/instances?offset={offset}&limit=100
  results += resp.instances
  if len(resp.instances) < 100 → break
  offset += 100
```

**依赖关系**
- 依赖 M03（SDK Client）发请求
- 依赖 M06（Formatter）格式化输出
- 依赖 M07（Color）彩色状态标识

---

## 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M10-T01 | 实现 InstanceService.List() | P0 | 1h | M03 |
| M10-T02 | 表格列定义 | P0 | 1h | M06 |
| M10-T03 | 状态彩色标识 | P0 | 0.5h | M07 |
| M10-T04 | 自动分页处理 | P0 | 1.5h | T01 |
| M10-T05 | 无实例提示 | P1 | 0.5h | T02 |
| M10-T06 | 底部显示总数 | P1 | 0.5h | T02 |
| M10-T07 | `--output json` | P0 | 0.5h | M06 |
| M10-T08 | `--engine` 可选过滤 | P2 | 0.5h | T01 |
| M10-T09 | `--status` 可选过滤 | P2 | 0.5h | T01 |

---

## 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M10-TC01 | 列出实例 | 账号有 3 个实例 | 表格 3 行，状态有颜色 | 集成测试 |
| M10-TC02 | 无实例 | 账号无实例 | `暂无 RDS 实例` | 单元测试(Mock) |
| M10-TC03 | 分页 | Mock 150 个实例 | 自动 2 页，展示全部 | 单元测试(Mock) |
