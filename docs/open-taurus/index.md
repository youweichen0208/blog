# Open Taurus — HWRDS CLI 开发实录

> 一个完整的华为云 RDS 命令行工具，从零到生产级 CLI 的完整规格说明。

## 项目简介

**HWRDS CLI** 是一款面向华为云 RDS（关系型数据库服务）的命令行工具，覆盖认证配置、实例生命周期管理（创建/查询/删除/重启）等核心功能。

本专栏记录了完整的需求规格说明（SDD），按模块拆分，每个模块包含：

- **做什么**（Feature）— 用户故事与业务规则
- **怎么做**（Design）— 技术方案与架构决策
- **任务拆分**（Task）— 优先级与工时估算
- **验收用例**（Test Cases）— 功能验证标准

## 模块总览

共 14 个模块 · 125 个任务 · 57 条测试用例

| 周次 | 模块 | 主题 |
|---|---|---|
| W1 | M01 + M02 + M03 + M04 | 认证配置 + SDK 基座 |
| W2 | M05 + M06 + M07 | 规格查询 + 输出格式化 |
| W3 | M08 + M09 | 创建实例 + 等待机制 |
| W4 | M10 + M11 | 列出实例 + 实例详情 |
| W5 | M12 + M13 | 删除 + 重启 |
| W6 | M14 | 错误处理 + 体验打磨 + 测试 |

## 开发流程

每个模块按以下顺序推进：

```
1. 阅读 Feature   → 理解要做什么
2. 阅读 Design    → 理解怎么做
3. 按 Task 逐项开发 → 先 P0 再 P1 再 P2
4. 对照 Test Cases → 验证是否做对
```

## 模块列表

### W1 — 认证配置 + SDK 基座

- [M01 · configure — 认证配置命令](./m01-configure)
- [M02 · config-store — 配置存储模块](./m02-config-store)
- [M03 · sdk-client — SDK HTTP 客户端](./m03-sdk-client)
- [M04 · ak-sk-signer — AK/SK 签名](./m04-ak-sk-signer)

### W2 — 规格查询 + 输出格式化

- [M05 · flavor-list — 规格查询命令](./m05-flavor-list)
- [M06 · formatter — 格式化输出](./m06-formatter)
- [M07 · color — 彩色输出](./m07-color)

### W3 — 创建实例

- [M08 · instance-create — 创建实例命令](./m08-instance-create)
- [M09 · waiter — 等待机制](./m09-waiter)

### W4 — 实例查询

- [M10 · instance-list — 列出实例命令](./m10-instance-list)
- [M11 · instance-show — 实例详情命令](./m11-instance-show)

### W5 — 实例操作

- [M12 · instance-delete — 删除实例命令](./m12-instance-delete)
- [M13 · instance-restart — 重启实例命令](./m13-instance-restart)

### W6 — 质量收尾

- [M14 · error-polish-test — 错误处理 + 体验打磨 + 测试](./m14-error-polish-test)
