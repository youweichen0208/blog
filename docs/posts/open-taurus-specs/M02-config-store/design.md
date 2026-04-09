# M02: 配置存储模块 — 怎么做

## 涉及文件
```
config/store.go      — Save / Load / LoadAll 方法
config/profile.go    — 多 Profile 管理
config/constants.go  — 配置目录路径、环境变量名
```

## 数据结构
```go
type HwrdsConfig struct {
    AK        string `yaml:"ak"`
    SK        string `yaml:"sk"`
    Region    string `yaml:"region"`
    ProjectID string `yaml:"project_id"`
}
```

## config.yaml 格式
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

## 环境变量覆盖逻辑
```
Load(profile) → 读 config.yaml → 检查环境变量 → 有则覆盖 → 返回
```

## 依赖关系
- 被 M01（configure）调用写入
- 被 M03（SDK Client）调用读取
- 被所有命令的 `--profile` flag 使用
