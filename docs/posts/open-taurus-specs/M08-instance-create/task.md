# M08: hwrds instance create — 任务拆分

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
