# M05: hwrds flavor list — 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M05-TC01 | 查询 MySQL 规格 | `--engine MySQL` | 表格展示规格列表 | 集成测试 |
| M05-TC02 | JSON 输出 | `--engine MySQL --output json` | JSON 格式规格列表 | 集成测试 |
| M05-TC03 | 不支持的引擎 | `--engine Oracle` | `不支持的引擎类型，可选: MySQL, PostgreSQL, SQLServer` | 单元测试 |
| M05-TC04 | 链路验证 | 首次执行 | 配置→签名→API→解析→输出 全链路跑通 | 集成测试 |
