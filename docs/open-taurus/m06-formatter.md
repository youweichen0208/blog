# M06 · formatter — 格式化输出模块

## 做什么

**一句话描述**：统一的输出格式化组件，所有命令通过它输出结果，支持 table / json / yaml 三种格式。

**业务规则**
- 全局 `--output` / `-o` flag，默认 table
- Table 格式列自动对齐
- JSON 格式带缩进
- 空数据集输出 `暂无数据` 而非空表格

---

## 怎么做

**涉及文件**
```
ui/formatter.go    — Print 路由函数
ui/table.go        — 表格输出（tablewriter）
```

**接口设计**
```go
func Print(data interface{}, format string) error
// format: "table" | "json" | "yaml"
```

**依赖关系**
- 被所有 list / show 命令调用

---

## 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M06-T01 | 实现 Table 格式输出（tablewriter） | P0 | 1h | 无 |
| M06-T02 | 实现 JSON 格式输出（encoding/json 缩进） | P0 | 0.5h | 无 |
| M06-T03 | 实现 YAML 格式输出 | P2 | 0.5h | 无 |
| M06-T04 | 实现 Print 路由函数 | P0 | 0.5h | T01-T03 |
| M06-T05 | 空数据集输出 `暂无数据` | P1 | 0.5h | T04 |

---

## 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M06-TC01 | Table 输出 | Print(flavors, "table") | 列对齐的表格 | 单元测试 |
| M06-TC02 | JSON 输出 | Print(flavors, "json") | 缩进的 JSON | 单元测试 |
| M06-TC03 | 空数据 | Print([], "table") | `暂无数据` | 单元测试 |
