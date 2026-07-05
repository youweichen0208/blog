---
lang: zh-CN
title: 技术教程
description: 收录 VPS、代理、CI/CD、Linux 排障等可复现的工程实践教程。
date: 2026-05-10
---

# 技术教程

这里收录了各类技术教程和实践指南。

## 推荐阅读顺序

| 场景 | 文章 | 适合解决的问题 |
| --- | --- | --- |
| 服务器基础 | [Linux 实用指南](../linux/) | 进程管理、端口排查、磁盘与系统运维 |
| 网络代理 | [基于 Hysteria2 的高性能代理服务器搭建指南](./build-vpn.md) | 用 VPS 和 Hysteria2 搭建可用代理链路 |
| LLM API 代理 | [海外 VPS 部署多 LLM API 代理](./vps-llm-proxy.md) | 用 Nginx 反向代理搭建 OpenAI/Claude/Gemini 统一入口 |
| 自动部署 | [Jenkins CI/CD 从入门到实战：部署项目到阿里云](./jenkins-cicd.md) | 从 Jenkins 安装到 Pipeline 部署的完整流程 |
| 博客同步 | [Obsidian + GitHub 多端同步博客方案](./obsidian-github-sync.md) | 让电脑、手机 Obsidian 和 GitHub Pages 共享同一批 Markdown |
| 内容规范 | [博客内容同步与附件规则](./blog-content-rules.md) | 约定 Obsidian 配置、图片路径和手机只读同步边界 |
| 缓存与运维 | [Redis 实战：服务器部署、日常使用与可观测性](./redis-guide.md) | 部署 Redis、数据类型、配置与 INFO/SLOWLOG/MONITOR 观测 |
| 数据库与运维 | [PostgreSQL 实战：Linux 部署、日常使用与可观测性](./postgres-guide.md) | apt/Docker 部署、角色库表、配置与 pg_stat_activity/pg_stat_statements 观测 |

## 实战检查清单

- 每篇教程尽量保留"环境信息、关键命令、验证方式、常见错误"四个部分。
- 命令类文章优先写可复制的最小路径，再补原理和延伸阅读。
- 运维类文章需要明确危险操作，例如防火墙、端口暴露、`kill -9`、证书和密钥权限。

## 后续计划

- ✅ ~~补一篇 Nginx 反向代理和 HTTPS 证书配置~~（已完成：[LLM API 代理](./vps-llm-proxy.md)，专题见 [DNS 与代理](../dns-proxy/)）
- ✅ ~~补一篇 Obsidian + GitHub 多端同步方案~~（已完成：[Obsidian + GitHub 多端同步博客方案](./obsidian-github-sync.md)）
- ✅ ~~Linux 高频命令扩展~~（已迁移至 [Linux 实用指南](../linux/)，按场景组织）
- 补一篇 Docker Compose 常用排障清单。
