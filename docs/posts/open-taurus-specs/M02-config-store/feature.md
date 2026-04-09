# M02: 配置存储模块 — 做什么

## 一句话描述
管理 `~/.hwrds/config.yaml` 的读写，支持多 Profile 和环境变量覆盖。

## 用户故事
> 作为运维工程师，我需要管理多套环境（dev/staging/prod）的认证信息，并且希望环境变量可以临时覆盖配置文件的值。

## 业务规则
- 配置目录 `~/.hwrds/`，权限 0700
- 配置文件 `config.yaml`，权限 0600
- 环境变量优先级 > 配置文件：`HW_AK` / `HW_SK` / `HW_REGION` / `HW_PROJECT_ID`
- Profile 不存在时返回友好错误，引导用户执行 `hwrds configure`
