# M13: hwrds instance restart — 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M13-T01 | 参数：实例 ID 位置参数 | P0 | 0.5h | 无 |
| M13-T02 | 重启前确认提示 | P0 | 0.5h | 无 |
| M13-T03 | 实现 InstanceService.Restart(id) | P0 | 1h | M03 |
| M13-T04 | 重启后调 Waiter 等待恢复 | P0 | 0.5h | M09 |
| M13-T05 | 输出重启耗时 | P0 | 0.5h | T04 |
| M13-T06 | `--force` flag 跳过确认 | P1 | 0.5h | 无 |
