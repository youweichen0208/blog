# M08: hwrds instance create — 做什么

## 一句话描述
创建 RDS 实例，支持全参数传入，创建后默认等待实例就绪。

## 用户故事
> 作为 DevOps 工程师，我想通过一条命令创建数据库实例，不需要登录控制台手动操作。

## 命令格式
```bash
hwrds instance create \
  --engine MySQL \
  --engine-version 8.0 \
  --flavor rds.mysql.m6.large.8 \
  --volume-size 200 \
  --name prod-mysql \
  --vpc-id vpc-xxx \
  --subnet-id subnet-xxx \
  --password 'MyPass123!'

hwrds instance create ... --no-wait
hwrds instance create ... --output json
```

## 参数定义

| 参数 | 必填 | 类型 | 默认值 | 说明 |
|---|---|---|---|---|
| --engine | 是 | enum | — | MySQL / PostgreSQL / SQLServer |
| --engine-version | 否 | string | 最新稳定版 | 引擎版本 |
| --flavor | 是 | string | — | 规格代码 |
| --volume-size | 是 | int | — | 存储大小 (GB) |
| --volume-type | 否 | enum | ULTRAHIGH | 存储类型 |
| --name | 是 | string | — | 实例名称 |
| --vpc-id | 是 | string | — | VPC ID |
| --subnet-id | 是 | string | — | 子网 ID |
| --password | 是 | string | — | root 密码 |
| --az | 否 | string | 随机 | 可用区 |
| --no-wait | 否 | bool | false | 跳过等待 |

## 业务规则
- 必填参数缺失时逐个提示缺哪个
- 创建前校验 flavor 是否存在
- 密码格式：大小写字母 + 数字，至少 8 位
- 创建成功后默认调 Waiter 等待 Running
- 就绪后输出连接信息
