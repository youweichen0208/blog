# M01 · configure — 认证配置命令

## 做什么

**一句话描述**：让客户通过交互式命令配置华为云认证信息，保存到本地，作为所有后续命令的前提。

**用户故事**
> 作为华为云客户，我想通过一条命令完成认证配置，这样后续所有操作都不需要重复输入 AK/SK。

**使用场景**
- 首次使用 HWRDS CLI，需要初始化认证
- 切换不同华为云账号或项目
- 管理多套环境（开发/测试/生产）

**命令格式**
```
hwrds configure
hwrds configure --profile prod
```

**业务规则**
- AK/SK/Region/ProjectID 四项信息缺一不可
- SK 输入时不回显（安全）
- Region 从预定义列表中选择，不允许手输错误值
- 配置文件必须严格保护权限（0600）
- 支持多 Profile 管理，默认 Profile 为 "default"

---

## 怎么做

**涉及文件**
```
cmd/configure.go      — Cobra 命令定义 + 交互逻辑
config/store.go       — 配置读写（M02 提供）
```

**交互流程**
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

**Region 预定义列表**
```
cn-north-4      北京四
cn-east-3       上海一
cn-south-1      广州
cn-north-1      北京一
ap-southeast-1  香港
```

**依赖关系**
- 依赖 M02（config/store.go）提供 Save 方法
- 被所有后续命令依赖（M03-M14）

**技术决策**
- 交互库选择 `AlecAivazis/survey/v2`，成熟稳定
- 不做非交互式参数传入（`--ak xxx --sk xxx`），避免 SK 出现在 shell history 中

---

## 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M01-T01 | 创建 `cmd/configure.go`，注册 Cobra 子命令 | P0 | 0.5h | 无 |
| M01-T02 | 实现 AK 输入（survey.Input） | P0 | 0.5h | T01 |
| M01-T03 | 实现 SK 输入（survey.Password，不回显） | P0 | 0.5h | T01 |
| M01-T04 | 实现 Region 选择（survey.Select，预定义列表） | P0 | 1h | T01 |
| M01-T05 | 实现 ProjectID 输入 + 调用 config.Save | P0 | 0.5h | T01, M02 |
| M01-T06 | 实现 `--profile` flag，支持保存到指定 Profile | P0 | 1h | T05 |

---

## 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M01-TC01 | 首次配置成功 | AK/SK/Region/ProjectID 全部输入 | `✓ 配置已保存到 ~/.hwrds/config.yaml` | 集成测试 |
| M01-TC02 | SK 不回显 | 输入 SK 时观察终端 | 终端不显示任何字符 | 手动测试 |
| M01-TC03 | 多 Profile 保存 | `hwrds configure --profile prod` | config.yaml 中包含 prod Profile | 集成测试 |
| M01-TC04 | 覆盖已有配置 | 执行两次 configure | 第二次的值覆盖第一次 | 集成测试 |
| M01-TC05 | 配置文件权限 | 执行 configure 后检查文件权限 | `config.yaml` 权限为 0600 | 单元测试 |
