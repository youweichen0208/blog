# M09 · waiter — 等待机制

## 做什么

**一句话描述**：轮询实例状态直到目标状态或超时，等待过程有 Spinner 动画反馈。

**业务规则**
- 轮询间隔 10s，默认超时 15 分钟
- 到达目标状态输出耗时
- 超时给出提示而非挂起
- 状态变为 Error 立即停止
- Ctrl+C 可中断

---

## 怎么做

**涉及文件**
```
service/waiter.go   — WaitForStatus 方法
ui/spinner.go       — Spinner 动画
```

**状态机**
```
WaitForStatus(id, "Running", 15m)
  │
  ├─ 每 10s 调 ShowInstance
  │   ├─ Status == "Running"  → ✓ 成功
  │   ├─ Status == "Error"    → ✗ 失败，立即返回
  │   └─ 其他                 → 继续等待
  │
  ├─ 超过 15m → ⚠ 超时
  └─ Ctrl+C   → 中断，输出当前状态
```

**依赖关系**
- 依赖 M03（SDK Client）调 ShowInstance API
- 被 M08（create）、M13（restart）调用

---

## 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M09-T01 | 定义 WaitForStatus(id, target, timeout) | P0 | 2h | M03 |
| M09-T02 | 实现 10s 轮询间隔 | P0 | 含T01 | — |
| M09-T03 | 实现 15m 默认超时 | P0 | 含T01 | — |
| M09-T04 | Spinner 动画 | P0 | 1h | 无 |
| M09-T05 | 成功输出耗时 | P0 | 0.5h | T01 |
| M09-T06 | 超时提示 | P0 | 0.5h | T01 |
| M09-T07 | Error 状态立即停止 | P0 | 0.5h | T01 |
| M09-T08 | Ctrl+C 中断处理 | P1 | 1h | T01 |

---

## 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M09-TC01 | 正常等待成功 | Mock: Creating→Running | `✓ 实例就绪 (耗时 20s)` | 单元测试(Mock) |
| M09-TC02 | 超时 | Mock: 一直 Creating | `⚠ 等待超时` | 单元测试(Mock) |
| M09-TC03 | Error 中断 | Mock: Creating→Error | `✗ 实例异常` | 单元测试(Mock) |
| M09-TC04 | Ctrl+C | 等待中发 SIGINT | `已中断等待` | 手动测试 |
