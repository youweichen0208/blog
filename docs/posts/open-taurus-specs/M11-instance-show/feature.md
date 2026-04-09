# M11: hwrds instance show — 做什么

## 一句话描述
查看单个实例完整详情，包含连接信息。

## 命令格式
```
hwrds instance show i-abc123
hwrds instance show i-abc123 --output json
```

## 展示区块
- 基础信息：ID / 名称 / 状态 / 引擎 / 规格 / 存储
- 网络信息：Region / AZ / VPC / IP / 端口
- 备份策略：自动备份 / 保留天数 / 备份窗口
- 连接信息：直接输出可用的连接命令

## 业务规则
- 连接命令根据引擎类型自动生成
- 实例不存在时友好提示
