# M01: hwrds configure — 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M01-TC01 | 首次配置成功 | AK/SK/Region/ProjectID 全部输入 | `✓ 配置已保存到 ~/.hwrds/config.yaml` | 集成测试 |
| M01-TC02 | SK 不回显 | 输入 SK 时观察终端 | 终端不显示任何字符 | 手动测试 |
| M01-TC03 | 多 Profile 保存 | `hwrds configure --profile prod` | config.yaml 中包含 prod Profile | 集成测试 |
| M01-TC04 | 覆盖已有配置 | 执行两次 configure | 第二次的值覆盖第一次 | 集成测试 |
| M01-TC05 | 配置文件权限 | 执行 configure 后检查文件权限 | `config.yaml` 权限为 0600 | 单元测试 |
