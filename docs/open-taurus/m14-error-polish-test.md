# M14 · error-polish-test — 错误处理 + 体验打磨 + 测试

## 做什么

**一句话描述**：统一错误处理、输出风格打磨、自动补全、CI 集成，让 CLI 达到生产级质量。

**三个子目标**
1. **错误码映射**：华为云 API 错误码 → 人类可读中文提示 + 下一步建议
2. **体验优化**：版本号、自动补全、帮助示例、统一图标
3. **测试覆盖**：Service 层覆盖率 > 70%，CI 自动化

---

## 怎么做

**错误码映射表（sdk/errors.go）**

| 华为云错误码 | 翻译 | 建议 |
|---|---|---|
| APIGW.0301 | AK/SK 认证失败 | 运行 `hwrds configure` 重新配置 |
| DBS.200001 | 资源不存在 | 运行 `hwrds instance list` 查看 |
| DBS.200019 | 规格不存在 | 运行 `hwrds flavor list` 查看 |
| DBS.200040 | 配额超限 | 联系华为云提升配额 |
| DBS.200108 | 密码不合规 | 需包含大小写+数字，≥8 位 |
| 网络超时 | 请求超时 | 检查网络后重试 |
| 429 | 请求频繁 | 已自动重试 |

**CI 流水线（.github/workflows/ci.yml）**
```
Push / PR → Lint → Test → Coverage → Build
Tag push  → goreleaser → 5 平台二进制 → GitHub Release
```

**Mock 策略**
- 定义 SDK 接口 `RdsClientInterface`
- 测试时注入 MockClient
- Service 层测试不依赖真实 API

---

## 任务拆分

**错误处理（10 项）**

| 任务 ID | 任务描述 | 优先级 | 预估 |
|---|---|---|---|
| M14-T01 | 认证错误翻译 | P0 | 0.5h |
| M14-T02 | 权限错误翻译 | P0 | 0.5h |
| M14-T03 | 资源不存在翻译 | P0 | 0.5h |
| M14-T04 | 规格不存在翻译 + 列出可用规格 | P0 | 0.5h |
| M14-T05 | 配额超限翻译 | P1 | 0.5h |
| M14-T06 | 余额不足翻译 | P1 | 0.5h |
| M14-T07 | 参数错误翻译 | P0 | 1h |
| M14-T08 | 网络超时翻译 | P0 | 0.5h |
| M14-T09 | 限流翻译 | P1 | 0.5h |
| M14-T10 | 未知错误兜底 | P0 | 0.5h |

**体验优化（7 项）**

| 任务 ID | 任务描述 | 优先级 | 预估 |
|---|---|---|---|
| M14-T11 | `hwrds --version` | P0 | 0.5h |
| M14-T12 | `hwrds completion bash/zsh/fish` | P1 | 1h |
| M14-T13 | 每个命令 --help 包含用法示例 | P0 | 2h |
| M14-T14 | 根命令无参数时展示帮助 | P0 | 0.5h |
| M14-T15 | 统一 ✓/✗/⚠ 图标 | P0 | 1h |
| M14-T16 | `--no-color` flag | P2 | 0.5h |
| M14-T17 | 非 TTY 自动禁用颜色 | P1 | 0.5h |

**测试覆盖（10 项）**

| 任务 ID | 任务描述 | 优先级 | 预估 |
|---|---|---|---|
| M14-T18 | InstanceService 单元测试 | P0 | 4h |
| M14-T19 | FlavorService 单元测试 | P0 | 1h |
| M14-T20 | WaiterService 单元测试 | P0 | 2h |
| M14-T21 | ConfigStore 单元测试 | P0 | 1h |
| M14-T22 | SDK 签名单元测试 | P0 | 1h |
| M14-T23 | 错误码映射单元测试 | P0 | 1h |
| M14-T24 | Mock SDK 接口定义 | P0 | 2h |
| M14-T25 | 覆盖率报告生成 | P0 | 0.5h |
| M14-T26 | GitHub Actions CI 配置 | P0 | 2h |
| M14-T27 | 覆盖率门禁 > 70% | P0 | 0.5h |

---

## 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M14-TC01 | 认证错误提示 | Mock 401 | `AK/SK 认证失败，请运行 hwrds configure` | 单元测试 |
| M14-TC02 | 版本号 | `hwrds --version` | `hwrds v1.0.0 (go1.22, linux/amd64)` | 集成测试 |
| M14-TC03 | 自动补全 | `source <(hwrds completion bash)` + Tab | 补全可用 | 手动测试 |
| M14-TC04 | 覆盖率 | `go test ./... -cover` | Service 层 > 70% | CI |
| M14-TC05 | CI 通过 | Push 代码 | Lint + Test + Build 全绿 | CI |
| M14-TC06 | 全部测试 | `go test ./...` | 0 failures | CI |
