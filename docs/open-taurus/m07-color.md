# M07 · color — 彩色输出模块

## 做什么

**一句话描述**：终端彩色输出，用颜色区分实例状态和操作结果。

**业务规则**
- Running=绿 / Creating=黄 / Error=红 / 其他=灰
- 成功 `✓` 绿色 / 错误 `✗` 红色 / 警告 `⚠` 黄色
- 非 TTY 环境自动禁用颜色

---

## 怎么做

**涉及文件**
```
ui/color.go    — StatusColor / SuccessIcon / ErrorIcon 函数
```

**状态颜色映射**
```go
var statusColors = map[string]color.Attribute{
    "Running":    color.FgGreen,
    "Active":     color.FgGreen,
    "Creating":   color.FgYellow,
    "Rebooting":  color.FgYellow,
    "Error":      color.FgRed,
    "Deleting":   color.FgRed,
}
```

**依赖关系**
- 被 M10（instance list）、M11（instance show）等命令使用

---

## 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M07-T01 | 状态颜色映射 | P0 | 1h | 无 |
| M07-T02 | ✓ / ✗ / ⚠ 图标函数 | P0 | 0.5h | 无 |
| M07-T03 | 非 TTY 自动禁用颜色 | P1 | 0.5h | T01 |
| M07-T04 | `--no-color` flag | P2 | 0.5h | T01 |

---

## 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M07-TC01 | Running 绿色 | StatusColor("Running") | 绿色文字 | 手动测试 |
| M07-TC02 | 管道无颜色 | `hwrds instance list \| cat` | 无 ANSI 转义码 | 手动测试 |
