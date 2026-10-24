---
lang: zh-CN
title: Neon 入门指南
description: Neon 是一个 Serverless Postgres 平台，介绍其核心概念、与自建 Postgres 的区别以及上手实践。
date: 2026-04-28
---

# Neon 入门指南

> Neon 是一个 **Serverless PostgreSQL** 平台，提供开箱即用的 Postgres 数据库，
> 支持计算与存储分离、自动扩缩容、数据库分支（Branching）等特性。

## 是什么

Neon 兼容标准 PostgreSQL（而非重写的协议），你可以用任何 Postgres 客户端、ORM（如 Prisma、Drizzle）直接连接。它主要解决的是传统自建/托管 Postgres 的几个痛点：

- **按需计算**：空闲时自动挂起（scale to zero），有请求时几百毫秒内唤醒，省钱
- **存储计算分离**：存储层是多副本的，数据安全不依赖单机磁盘
- **数据库分支**：像 git 分支一样复制一份数据库，用于开发、测试、预览环境

## 核心概念

### Project / Branch

- **Project**：一个项目对应一套存储，包含多个分支
- **Branch**：每个分支是一个独立的数据库副本，`main` 是默认分支
- 分支可以基于某个分支的**任意时间点**创建（copy-on-write，秒级完成）

### Compute

计算节点负责实际执行 SQL。可以配置：

- 自动挂起（idle 后暂停，请求到达自动唤醒）
- 最小/最大计算规格（CU，Compute Unit）

### Connection String

每个分支有自己的连接串，形如：

```
postgresql://user:password@ep-xxx-xxx.aws-region.aws.neon.tech/neondb?sslmode=require
```

## 与自建 Postgres 的区别

| 维度 | 自建 Postgres | Neon |
|------|--------------|------|
| 运维 | 自己负责备份、升级、监控 | 平台托管 |
| 扩容 | 手动迁移、停机 | 弹性伸缩 |
| 环境隔离 | 手动 dump/restore | 分支秒级复制 |
| 计费 | 固定服务器成本 | 按用量（存储 + 计算时间） |
| 延迟 | 稳定 | 冷启动有几百毫秒唤醒延迟 |

## 上手实践

### 1. 创建项目

注册 [neon.tech](https://neon.tech) 后创建项目，免费额度包含 0.5GB 存储，对个人项目足够。

### 2. 连接数据库

```bash
psql "postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require"
```

### 3. 使用分支做开发隔离

```bash
# 创建开发分支
neon branches create --name dev

# 获取分支连接串
neon connection-string dev
```

本地开发、CI 测试、PR 预览环境各用各的分支，互不干扰。

### 4. 冷启动注意

首次连接可能有几百毫秒的唤醒延迟：

- 对延迟敏感的服务，可用连接池保持活跃（或设置最小 CU > 0）
- Serverless 函数场景建议使用 Neon 的 **pooler** 端点（连接串里 `-pooler` 后缀），避免频繁建连

## 适用场景

✅ 适合：

- 个人项目、Side Project、Demo
- Serverless / 边缘函数后端
- 需要 PR 预览环境的多分支开发流程

⚠️ 需要权衡：

- 对延迟极其敏感、QPS 稳定的高流量服务（自建/常驻实例可能更划算、更稳）
- 数据合规要求必须自托管的场景

## 参考

- [Neon 官方文档](https://neon.tech/docs)
- [Branching 概念](https://neon.tech/docs/introduction/branching)
