# M14: 错误处理 + 体验打磨 + 测试 — 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M14-TC01 | 认证错误提示 | Mock 401 | `AK/SK 认证失败，请运行 hwrds configure` | 单元测试 |
| M14-TC02 | 版本号 | `hwrds --version` | `hwrds v1.0.0 (go1.22, linux/amd64)` | 集成测试 |
| M14-TC03 | 自动补全 | `source <(hwrds completion bash)` + Tab | 补全可用 | 手动测试 |
| M14-TC04 | 覆盖率 | `go test ./... -cover` | Service 层 > 70% | CI |
| M14-TC05 | CI 通过 | Push 代码 | Lint + Test + Build 全绿 | CI |
| M14-TC06 | 全部测试 | `go test ./...` | 0 failures | CI |
