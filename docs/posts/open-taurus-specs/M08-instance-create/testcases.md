# M08: hwrds instance create — 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M08-TC01 | 全参数创建成功 | 所有必填参数 | `✓ 实例创建中...` → 等待 → `✓ 实例就绪` | 集成测试 |
| M08-TC02 | 缺少 engine | 不传 --engine | `缺少必填参数 --engine` | 单元测试 |
| M08-TC03 | flavor 不存在 | `--flavor rds.xxx` | `规格不存在` + 可用列表 | 单元测试(Mock) |
| M08-TC04 | 密码不合规 | `--password 123` | `密码需包含大小写字母和数字，至少 8 位` | 单元测试 |
| M08-TC05 | --no-wait | 全参数 + --no-wait | 创建后直接返回 ID | 集成测试 |
| M08-TC06 | --output json | 全参数 + --output json | JSON 格式输出 | 集成测试 |
| M08-TC07 | 等待就绪 | 正常创建 | Spinner → Running → 连接命令 | 集成测试 |
| M08-TC08 | API 失败 | Mock 500 | 翻译后的错误提示 | 单元测试(Mock) |
