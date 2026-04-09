# M05: hwrds flavor list — 做什么

## 一句话描述
查询指定引擎的可用数据库规格，同时作为整条链路（配置→签名→API→输出）的验证命令。

## 用户故事
> 作为客户，我想在创建实例前查看有哪些规格可选，方便选择合适的 CPU/内存配置。

## 命令格式
```
hwrds flavor list --engine MySQL
hwrds flavor list --engine PostgreSQL --output json
hwrds flavor list --engine MySQL --engine-version 8.0
```

## 业务规则
- `--engine` 必填，可选值：MySQL / PostgreSQL / SQLServer
- 表格展示：规格代码 / vCPUs / 内存(GB)
- 支持 `--output json`
- 无可用规格时输出提示而非空表格
