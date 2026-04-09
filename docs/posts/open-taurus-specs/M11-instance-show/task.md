# M11: hwrds instance show — 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M11-T01 | 实现 InstanceService.Show(id) | P0 | 1h | M03 |
| M11-T02 | 基础信息区块展示 | P0 | 1h | T01 |
| M11-T03 | 网络信息区块展示 | P0 | 1h | T01 |
| M11-T04 | 备份策略区块展示 | P1 | 0.5h | T01 |
| M11-T05 | 连接命令自动生成 | P0 | 1h | T01 |
| M11-T06 | Key-Value 对齐 | P0 | 0.5h | T02 |
| M11-T07 | 实例不存在友好提示 | P0 | 0.5h | T01 |
| M11-T08 | `--output json` | P0 | 0.5h | M06 |
| M11-T09 | Status 彩色标识 | P0 | 0.5h | M07 |
