# M07: 彩色输出模块 — 怎么做

## 涉及文件
```
ui/color.go    — StatusColor / SuccessIcon / ErrorIcon 函数
```

## 状态颜色映射
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

## 依赖关系
- 被 M10（instance list）、M11（instance show）等命令使用
