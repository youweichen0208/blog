# M09: Waiter 等待机制 — 怎么做

## 涉及文件
```
service/waiter.go   — WaitForStatus 方法
ui/spinner.go       — Spinner 动画
```

## 状态机
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

## 依赖关系
- 依赖 M03（SDK Client）调 ShowInstance API
- 被 M08（create）、M13（restart）调用
