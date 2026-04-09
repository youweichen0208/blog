# M01: hwrds configure — 怎么做

## 涉及文件
```
cmd/configure.go      — Cobra 命令定义 + 交互逻辑
config/store.go       — 配置读写（M02 提供）
```

## 交互流程
```
用户执行 hwrds configure
  │
  ├─ 1. 提示输入 AK        → survey.Input
  ├─ 2. 提示输入 SK        → survey.Password（不回显）
  ├─ 3. 选择 Region        → survey.Select（列表选择）
  ├─ 4. 提示输入 ProjectID → survey.Input
  │
  ├─ 5. 调用 config.Save(cfg, profile)
  │
  └─ 6. 输出 ✓ 配置已保存到 ~/.hwrds/config.yaml
```

## Region 预定义列表
```
cn-north-4      北京四
cn-east-3       上海一
cn-south-1      广州
cn-north-1      北京一
ap-southeast-1  香港
```

## 依赖关系
- 依赖 M02（config/store.go）提供 Save 方法
- 被所有后续命令依赖（M03-M14）

## 技术决策
- 交互库选择 `AlecAivazis/survey/v2`，成熟稳定
- 不做非交互式参数传入（`--ak xxx --sk xxx`），避免 SK 出现在 shell history 中
