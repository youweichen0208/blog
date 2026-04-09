# M07: 彩色输出模块 — 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M07-TC01 | Running 绿色 | StatusColor("Running") | 绿色文字 | 手动测试 |
| M07-TC02 | 管道无颜色 | `hwrds instance list | cat` | 无 ANSI 转义码 | 手动测试 |
