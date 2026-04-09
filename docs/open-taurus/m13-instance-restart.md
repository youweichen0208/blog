# M13 · instance-restart — 重启实例命令

## 做什么

**一句话描述**：重启 RDS 实例，确认后执行，等待恢复 Running。

**命令格式**
```bash
hwrds instance restart i-abc123
hwrds instance restart i-abc123 --force
```

**业务规则**
- 重启前确认提示（Y/n）
- 重启后等待实例恢复 Running
- 显示重启耗时
- `--force` 跳过确认（脚本自动化场景）

---

## 怎么做

**涉及文件**
```
cmd/instance_restart.go    — Cobra 命令
service/instance.go        — InstanceService.Restart(id)
```

**执行流程**
```
确认重启 "prod-mysql"？(Y/n) → Y
  → 调 RestartInstance API
  → Waiter 等待 Running
  → ✓ 实例已重启 (耗时 2m 15s)
```

**依赖关系**
- 依赖 M03（SDK Client）发请求
- 依赖 M09（Waiter）等待恢复就绪

---

## 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M13-T01 | 参数：实例 ID 位置参数 | P0 | 0.5h | 无 |
| M13-T02 | 重启前确认提示 | P0 | 0.5h | 无 |
| M13-T03 | 实现 InstanceService.Restart(id) | P0 | 1h | M03 |
| M13-T04 | 重启后调 Waiter 等待恢复 | P0 | 0.5h | M09 |
| M13-T05 | 输出重启耗时 | P0 | 0.5h | T04 |
| M13-T06 | `--force` flag 跳过确认 | P1 | 0.5h | 无 |

---

## 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M13-TC01 | 确认重启 | 输入 Y | `✓ 实例已重启 (耗时 2m 15s)` | 集成测试 |
| M13-TC02 | 拒绝重启 | 输入 N | `重启已取消` | 集成测试 |
| M13-TC03 | --force | `--force` | 跳过确认直接重启 | 集成测试 |
