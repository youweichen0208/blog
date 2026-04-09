# M08: hwrds instance create — 怎么做

## 涉及文件
```
cmd/instance_create.go     — Cobra 命令 + 参数定义
service/instance.go        — InstanceService.Create()
service/waiter.go          — WaiterService（M09）
sdk/rds.go                 — CreateInstance API 定义
types/instance.go          — Instance / CreateInput 结构体
```

## 调用链路
```
cmd/instance_create.go
  → 校验必填参数
  → service.FlavorService.List(engine)  // 校验 flavor
  → service.InstanceService.Create(input)
    → sdk.RdsClient.Post("/v3/{project}/instances", body)
      → 华为云 API
    ← Instance{ID, Status: "Creating"}
  → service.WaiterService.Wait(instanceID, "Running", 15m)
  → 输出实例 ID + 连接信息
```

## 错误处理映射
```
参数缺失        → "缺少 --engine，用法: ..."
flavor 不存在   → "规格不存在" + 列出可用规格
密码不合规      → "密码需包含大小写字母和数字，至少 8 位"
VPC 不存在      → "VPC xxx 不存在"
余额不足        → "账户余额不足，请充值"
```

## 依赖关系
- 依赖 M03（SDK Client）、M05（flavor 校验）、M06（格式化）、M09（Waiter）
