# M13: hwrds instance restart — 做什么

## 一句话描述
重启 RDS 实例，确认后执行，等待恢复 Running。

## 命令格式
```
hwrds instance restart i-abc123
hwrds instance restart i-abc123 --force
```

## 业务规则
- 重启前确认提示
- 重启后等待实例恢复 Running
- 显示重启耗时
