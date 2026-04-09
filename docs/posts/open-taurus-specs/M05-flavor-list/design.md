# M05: hwrds flavor list — 怎么做

## 涉及文件
```
cmd/flavor_list.go        — Cobra 命令
service/flavor.go         — FlavorService.List()
sdk/rds.go                — ListFlavors API 定义
types/flavor.go           — Flavor 结构体
```

## 调用链路
```
cmd/flavor_list.go
  → service.FlavorService.List(engine)
    → sdk.RdsClient.Get("/v3/{project}/flavors?database_name={engine}")
      → 华为云 API
    ← []Flavor
  ← ui.Formatter.Print(flavors, output)
```

## API
```
GET /v3/{project_id}/flavors?database_name=MySQL
```

## 依赖关系
- 依赖 M03（SDK Client）发请求
- 依赖 M06（Formatter）格式化输出
- 被 M08（instance create）调用做 flavor 校验
