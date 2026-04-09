# M01: hwrds configure — 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M01-T01 | 创建 `cmd/configure.go`，注册 Cobra 子命令 | P0 | 0.5h | 无 |
| M01-T02 | 实现 AK 输入（survey.Input） | P0 | 0.5h | T01 |
| M01-T03 | 实现 SK 输入（survey.Password，不回显） | P0 | 0.5h | T01 |
| M01-T04 | 实现 Region 选择（survey.Select，预定义列表） | P0 | 1h | T01 |
| M01-T05 | 实现 ProjectID 输入 + 调用 config.Save | P0 | 0.5h | T01, M02 |
| M01-T06 | 实现 `--profile` flag，支持保存到指定 Profile | P0 | 1h | T05 |
