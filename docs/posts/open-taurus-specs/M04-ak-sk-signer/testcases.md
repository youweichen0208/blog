# M04: AK/SK 签名 — 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M04-TC01 | GET 签名正确 | GET /v3/{project}/flavors | 华为云 API 返回 200 | 集成测试 |
| M04-TC02 | POST 签名正确 | POST /v3/{project}/instances + body | 华为云 API 返回 200 | 集成测试 |
| M04-TC03 | 带 Query 参数签名 | GET ?database_name=MySQL | 签名包含排序后的 Query | 单元测试 |
