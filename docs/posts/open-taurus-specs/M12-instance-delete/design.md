# M12: hwrds instance delete — 怎么做

## 涉及文件
```
cmd/instance_delete.go    — Cobra 命令 + 确认逻辑
service/instance.go       — InstanceService.Delete(id)
```

## 确认流程
```
hwrds instance delete i-abc123
  │
  ├─ 调 ShowInstance 获取实例名称
  ├─ 展示 ⚠ 即将删除实例 "prod-mysql" (i-abc123)
  ├─ 展示 ⚠ 此操作不可逆，所有数据将丢失
  ├─ 提示 请输入实例名称确认: ____
  │   ├─ 匹配 → 执行删除
  │   └─ 不匹配 → 取消
  └─ --force → 跳过所有确认
```

## 依赖关系
- 依赖 M11（ShowInstance 获取名称）
- 依赖 M03（SDK）、M07（彩色警告）
