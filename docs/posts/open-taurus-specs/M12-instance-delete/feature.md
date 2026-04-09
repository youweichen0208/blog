# M12: hwrds instance delete — 做什么

## 一句话描述
删除 RDS 实例，必须二次确认（输入实例名称）防止误删。

## 命令格式
```
hwrds instance delete i-abc123
hwrds instance delete i-abc123 --force
```

## 确认流程
1. 展示实例名称和 ID
2. 警告：此操作不可逆，所有数据将丢失
3. 要求输入实例名称确认
4. 匹配 → 执行删除；不匹配 → 取消

## 业务规则
- `--force` 跳过所有确认（脚本自动化场景）
- 实例不存在时友好提示
