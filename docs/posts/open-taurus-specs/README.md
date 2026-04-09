# HWRDS CLI — SDD 需求规格目录

> 每个模块 4 个文件：feature.md（做什么）→ design.md（怎么做）→ task.md（任务拆分）→ testcases.md（怎么验收）

## 目录结构

```
specs/
├── M01-configure/           W1 · 认证配置命令         (6 任务 · 5 用例)
├── M02-config-store/        W1 · 配置存储模块         (7 任务 · 4 用例)
├── M03-sdk-client/          W1 · SDK HTTP 客户端      (5 任务 · 4 用例)
├── M04-ak-sk-signer/        W1 · AK/SK 签名           (5 任务 · 3 用例)
├── M05-flavor-list/         W2 · 规格查询命令         (6 任务 · 4 用例)
├── M06-formatter/           W2 · 格式化输出           (5 任务 · 3 用例)
├── M07-color/               W2 · 彩色输出             (4 任务 · 2 用例)
├── M08-instance-create/     W3 · 创建实例命令         (18 任务 · 8 用例)
├── M09-waiter/              W3 · 等待机制             (8 任务 · 4 用例)
├── M10-instance-list/       W4 · 列出实例命令         (9 任务 · 3 用例)
├── M11-instance-show/       W4 · 实例详情命令         (9 任务 · 3 用例)
├── M12-instance-delete/     W5 · 删除实例命令         (10 任务 · 5 用例)
├── M13-instance-restart/    W5 · 重启实例命令         (6 任务 · 3 用例)
└── M14-error-polish-test/   W6 · 错误处理+体验+测试   (27 任务 · 6 用例)

共 14 个模块 · 56 个文件 · 125 个任务 · 57 条测试用例
```

## 开发流程

每个模块按以下顺序推进：

```
1. 阅读 feature.md    → 理解要做什么
2. 阅读 design.md     → 理解怎么做
3. 按 task.md 逐项开发 → 先 P0 再 P1 再 P2
4. 对照 testcases.md  → 验证是否做对
```

## 周次对照

| 周次 | 模块 | 主题 |
|---|---|---|
| W1 | M01 + M02 + M03 + M04 | 认证配置 + SDK 基座 |
| W2 | M05 + M06 + M07 | 规格查询 + 输出格式化 |
| W3 | M08 + M09 | 创建实例 + 等待机制 |
| W4 | M10 + M11 | 列出实例 + 实例详情 |
| W5 | M12 + M13 | 删除 + 重启 |
| W6 | M14 | 错误处理 + 体验打磨 + 测试 |
