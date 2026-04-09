# M01: hwrds configure — 做什么

## 一句话描述
让客户通过交互式命令配置华为云认证信息，保存到本地，作为所有后续命令的前提。

## 用户故事
> 作为华为云客户，我想通过一条命令完成认证配置，这样后续所有操作都不需要重复输入 AK/SK。

## 使用场景
- 首次使用 HWRDS CLI，需要初始化认证
- 切换不同华为云账号或项目
- 管理多套环境（开发/测试/生产）

## 命令格式
```
hwrds configure
hwrds configure --profile prod
```

## 业务规则
- AK/SK/Region/ProjectID 四项信息缺一不可
- SK 输入时不回显（安全）
- Region 从预定义列表中选择，不允许手输错误值
- 配置文件必须严格保护权限（0600）
- 支持多 Profile 管理，默认 Profile 为 "default"
