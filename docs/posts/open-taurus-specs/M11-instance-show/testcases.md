# M11: hwrds instance show — 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M11-TC01 | MySQL 详情 | 有效 MySQL 实例 | 详情 + `mysql -h ...` | 集成测试 |
| M11-TC02 | PG 连接命令 | 有效 PG 实例 | `psql -h ...` | 单元测试(Mock) |
| M11-TC03 | 不存在 | 无效 ID | `实例 "xxx" 不存在` | 单元测试(Mock) |
