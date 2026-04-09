# M11: hwrds instance show — 怎么做

## 涉及文件
```
cmd/instance_show.go    — Cobra 命令
service/instance.go     — InstanceService.Show(id)
```

## 连接命令生成
```go
switch engine {
case "MySQL":    fmt.Sprintf("mysql -h %s -P %d -u root -p", ip, port)
case "PostgreSQL": fmt.Sprintf("psql -h %s -p %d -U root -d postgres", ip, port)
case "SQLServer":  fmt.Sprintf("sqlcmd -S %s,%d -U root", ip, port)
}
```

## Key-Value 展示格式
```
ID:          i-abc123
Name:        prod-mysql
Status:      Running ●
```
冒号后统一缩进到第 14 列。

## 依赖关系
- 依赖 M03（SDK）、M06（格式化）、M07（彩色）
- 被 M12（delete）调用获取实例名称
