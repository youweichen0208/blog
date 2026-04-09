# M10: hwrds instance list — 做什么

## 一句话描述
列出当前账号下所有 RDS 实例，表格展示关键信息，状态彩色标识。

## 命令格式
```
hwrds instance list
hwrds instance list --output json
hwrds instance list --engine MySQL
hwrds instance list --status Running
```

## 表格列
ID / 名称 / 引擎 / 规格(合并CPU+内存) / 状态(彩色) / 创建时间(仅日期)

## 业务规则
- 自动处理分页（单页最大 100）
- 无实例时输出提示
- 底部显示总数
