# M02: 配置存储模块 — 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M02-T01 | 定义 HwrdsConfig 结构体 + 常量 | P0 | 0.5h | 无 |
| M02-T02 | 实现 configDir() / configFile() 路径函数 | P0 | 0.5h | T01 |
| M02-T03 | 实现 Save(config, profile)：创建目录 + 写 YAML + 设权限 | P0 | 1h | T02 |
| M02-T04 | 实现 Load(profile)：读 YAML + 反序列化 | P0 | 1h | T02 |
| M02-T05 | 实现 LoadAll()：返回全部 Profile | P1 | 0.5h | T04 |
| M02-T06 | 实现环境变量覆盖：Load 后检查 HW_AK 等变量 | P0 | 1h | T04 |
| M02-T07 | 全局 `--profile` flag 注入 root command | P0 | 0.5h | T04 |
