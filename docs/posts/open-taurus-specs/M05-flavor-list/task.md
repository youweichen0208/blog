# M05: hwrds flavor list — 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M05-T01 | 定义 Flavor 结构体（types/flavor.go） | P0 | 0.5h | 无 |
| M05-T02 | 实现 FlavorService.List(engine) | P0 | 1h | M03 |
| M05-T03 | 定义 ListFlavors API 请求（sdk/rds.go） | P0 | 0.5h | M03 |
| M05-T04 | 实现 cmd/flavor_list.go：--engine 必填 + 调 Service + 输出 | P0 | 1h | T02, M06 |
| M05-T05 | 无结果时输出 `暂无可用规格` | P1 | 0.5h | T04 |
| M05-T06 | `--engine-version` 可选过滤 | P2 | 1h | T04 |
