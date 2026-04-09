# M11 · instance-show — 查看实例详情命令

## 做什么

**一句话描述**：查看单个实例完整详情，包含连接信息。

**命令格式**
```bash
hwrds instance show i-abc123
hwrds instance show i-abc123 --output json
```

**展示区块**
- 基础信息：ID / 名称 / 状态 / 引擎 / 规格 / 存储
- 网络信息：Region / AZ / VPC / IP / 端口
- 备份策略：自动备份 / 保留天数 / 备份窗口
- 连接信息：直接输出可用的连接命令

**业务规则**
- 连接命令根据引擎类型自动生成
- 实例不存在时友好提示

---

## 怎么做

**涉及文件**
```
cmd/instance_show.go    — Cobra 命令
service/instance.go     — InstanceService.Show(id)
```

**连接命令生成**
```go
switch engine {
case "MySQL":     fmt.Sprintf("mysql -h %s -P %d -u root -p", ip, port)
case "PostgreSQL": fmt.Sprintf("psql -h %s -p %d -U root -d postgres", ip, port)
case "SQLServer":  fmt.Sprintf("sqlcmd -S %s,%d -U root", ip, port)
}
```

**Key-Value 展示格式**
```
ID:          i-abc123
Name:        prod-mysql
Status:      Running ●
```
冒号后统一缩进到第 14 列。

**依赖关系**
- 依赖 M03（SDK Client）发请求
- 依赖 M06（Formatter）格式化输出
- 依赖 M07（Color）彩色状态标识
- 被 M12（instance delete）调用获取实例名称

---

## 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M11-T01 | 实现 InstanceService.Show(id) | P0 | 1h | M03 |
| M11-T02 | 基础信息区块展示 | P0 | 1h | T01 |
| M11-T03 | 网络信息区块展示 | P0 | 1h | T01 |
| M11-T04 | 备份策略区块展示 | P1 | 0.5h | T01 |
| M11-T05 | 连接命令自动生成 | P0 | 1h | T01 |
| M11-T06 | Key-Value 对齐（冒号后第 14 列） | P0 | 0.5h | T02 |
| M11-T07 | 实例不存在友好提示 | P0 | 0.5h | T01 |
| M11-T08 | `--output json` | P0 | 0.5h | M06 |
| M11-T09 | Status 彩色标识 | P0 | 0.5h | M07 |

---

## 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M11-TC01 | MySQL 详情 | 有效 MySQL 实例 | 详情 + `mysql -h ...` | 集成测试 |
| M11-TC02 | PG 连接命令 | 有效 PG 实例 | `psql -h ...` | 单元测试(Mock) |
| M11-TC03 | 不存在 | 无效 ID | `实例 "xxx" 不存在` | 单元测试(Mock) |
