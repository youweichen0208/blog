# M09: Waiter 等待机制 — 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M09-TC01 | 正常等待成功 | Mock: Creating→Running | `✓ 实例就绪 (耗时 20s)` | 单元测试(Mock) |
| M09-TC02 | 超时 | Mock: 一直 Creating | `⚠ 等待超时` | 单元测试(Mock) |
| M09-TC03 | Error 中断 | Mock: Creating→Error | `✗ 实例异常` | 单元测试(Mock) |
| M09-TC04 | Ctrl+C | 等待中发 SIGINT | `已中断等待` | 手动测试 |
