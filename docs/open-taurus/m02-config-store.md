# M02 · config-store — 配置存储模块

## 做什么

**一句话描述**：管理 `~/.hwrds/config.yaml` 的读写，支持多 Profile 和环境变量覆盖。

**用户故事**
> 作为运维工程师，我需要管理多套环境（dev/staging/prod）的认证信息，并且希望环境变量可以临时覆盖配置文件的值。

**业务规则**
- 配置目录 `~/.hwrds/`，权限 0700
- 配置文件 `config.yaml`，权限 0600
- 环境变量优先级 > 配置文件：`HW_AK` / `HW_SK` / `HW_REGION` / `HW_PROJECT_ID`
- Profile 不存在时返回友好错误，引导用户执行 `hwrds configure`

---

## 怎么做

**涉及文件**
```
config/store.go      — Save / Load / LoadAll 方法
config/profile.go    — 多 Profile 管理
config/constants.go  — 配置目录路径、环境变量名
```

**数据结构**
```go
type HwrdsConfig struct {
    AK        string `yaml:"ak"`
    SK        string `yaml:"sk"`
    Region    string `yaml:"region"`
    ProjectID string `yaml:"project_id"`
}
```

**config.yaml 格式**
```yaml
default:
  ak: "ABCDEFG..."
  sk: "1234567..."
  region: "cn-north-4"
  project_id: "0abc..."

prod:
  ak: "HIJKLMN..."
  sk: "8901234..."
  region: "cn-south-1"
  project_id: "9xyz..."
```

**环境变量覆盖逻辑**
```
Load(profile) → 读 config.yaml → 检查环境变量 → 有则覆盖 → 返回
```

**依赖关系**
- 被 M01（configure）调用写入
- 被 M03（SDK Client）调用读取
- 被所有命令的 `--profile` flag 使用

---

## 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M02-T01 | 定义 HwrdsConfig 结构体 + 常量 | P0 | 0.5h | 无 |
| M02-T02 | 实现 configDir() / configFile() 路径函数 | P0 | 0.5h | T01 |
| M02-T03 | 实现 Save(config, profile)：创建目录 + 写 YAML + 设权限 | P0 | 1h | T02 |
| M02-T04 | 实现 Load(profile)：读 YAML + 反序列化 | P0 | 1h | T02 |
| M02-T05 | 实现 LoadAll()：返回全部 Profile | P1 | 0.5h | T04 |
| M02-T06 | 实现环境变量覆盖：Load 后检查 HW_AK 等变量 | P0 | 1h | T04 |
| M02-T07 | 全局 `--profile` flag 注入 root command | P0 | 0.5h | T04 |

---

## 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M02-TC01 | Save + Load 一致性 | Save(cfg, "test") → Load("test") | 读回的 config 与写入完全一致 | 单元测试 |
| M02-TC02 | Profile 不存在 | Load("不存在") | 错误: `Profile "不存在" 不存在，请先运行: hwrds configure` | 单元测试 |
| M02-TC03 | 环境变量覆盖 | 设置 HW_AK="override" → Load("default") | 返回的 AK 为 "override" | 单元测试 |
| M02-TC04 | 文件权限验证 | Save 后检查文件权限 | 目录 0700，文件 0600 | 单元测试 |
