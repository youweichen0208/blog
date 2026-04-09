# M13: hwrds instance restart — 怎么做

## 涉及文件
```
cmd/instance_restart.go    — Cobra 命令
service/instance.go        — InstanceService.Restart(id)
```

## 流程
```
确认重启 "prod-mysql"？(Y/n) → Y
  → 调 RestartInstance API
  → Waiter 等待 Running
  → ✓ 实例已重启 (耗时 2m 15s)
```

## 依赖关系
- 依赖 M03（SDK）、M09（Waiter）
