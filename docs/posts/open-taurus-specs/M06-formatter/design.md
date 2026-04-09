# M06: 格式化输出模块 — 怎么做

## 涉及文件
```
ui/formatter.go    — Print 路由函数
ui/table.go        — 表格输出（tablewriter）
```

## 接口设计
```go
func Print(data interface{}, format string) error
// format: "table" | "json" | "yaml"
```

## 依赖关系
- 被所有 list / show 命令调用
