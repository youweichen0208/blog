# M02: 配置存储模块 — 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M02-TC01 | Save + Load 一致性 | Save(cfg, "test") → Load("test") | 读回的 config 与写入完全一致 | 单元测试 |
| M02-TC02 | Profile 不存在 | Load("不存在") | 错误: `Profile "不存在" 不存在，请先运行: hwrds configure` | 单元测试 |
| M02-TC03 | 环境变量覆盖 | 设置 HW_AK="override" → Load("default") | 返回的 AK 为 "override" | 单元测试 |
| M02-TC04 | 文件权限验证 | Save 后检查文件权限 | 目录 0700，文件 0600 | 单元测试 |
