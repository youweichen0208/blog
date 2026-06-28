---
lang: zh-CN
title: DNS 与代理
description: 域名解析、Nginx 反向代理、SSL 证书与网络架构实践。
date: 2026-06-06
---

# DNS 与代理

欢迎来到 DNS 与代理专栏。

## 什么是 DNS？

DNS（Domain Name System）是互联网的「电话簿」。人类记忆域名（如 `example.com`），网络却只认 IP 地址。DNS 的职责就是将域名翻译成对应的 IP，让请求找到正确的服务器。

核心概念：
- **A 记录**：域名 → IPv4 地址
- **CNAME 记录**：域名 → 另一个域名
- **TTL**：缓存时间，越短生效越快
- **权威服务器**：最终决定解析结果的服务器

## 什么是代理？

代理（Proxy）是流量路径上的中间人，按位置分为两类：

| 类型 | 方向 | 典型场景 |
|------|------|---------|
| **正向代理** | 客户端侧 | VPN、翻墙、隐藏客户端 IP |
| **反向代理** | 服务端侧 | 负载均衡、HTTPS 卸载、API 网关 |

反向代理的核心价值链：**域名 → DNS 解析 → Nginx 反向代理 → 后端服务**。

## 专栏内容

### 理论篇
- [Nginx 反向代理：从概念到实战](./nginx-reverse-proxy.md) - 理解代理的本质，掌握 Nginx 核心指令与配置模式
- [SSL 证书：为什么你的网站需要 HTTPS](./ssl-certificate.md) - TLS 握手原理、Let's Encrypt + Certbot 申请与自动续期

### 实战篇
- [域名解析与反向代理部署](./deploy-dns-nginx.md) - 阿里云域名 + DigitalOcean + Nginx + Let's Encrypt 全流程
- [海外 VPS 部署多 LLM API 代理](../tutorials/vps-llm-proxy.md) - 用 Nginx 统一代理 OpenAI / Anthropic / Gemini
- [基于 Hysteria2 的高性能代理服务器](../tutorials/build-vpn.md) - QUIC 协议正向代理实践

## 推荐阅读顺序

1. 先读 [Nginx 反向代理：从概念到实战](./nginx-reverse-proxy.md)，建立代理认知框架
2. 再读 [SSL 证书：为什么你的网站需要 HTTPS](./ssl-certificate.md)，理解证书原理与申请流程
3. 跟 [域名解析与反向代理部署](./deploy-dns-nginx.md)，完成一次端到端部署
4. 按需阅读 LLM API 代理和 Hysteria2 的专项实践

## 后续计划

- Cloudflare Tunnel 与 Nginx 对比
- Nginx 负载均衡策略详解
- API Gateway 选型：Kong / APISIX / Nginx

## 前置知识

本专栏假设你对 IP 地址和 DNS 有基本了解。如果需要补充网络层基础：

→ [网络协议与 IP 地址](/internet/) — IPv4/IPv6 地址结构、子网划分、Linux 网络配置

如果需要深入理解 DNS 协议本身（解析流程、报文格式、DNSSEC、DoH/DoT、自建 DNS）：

→ [DNS 全面指南](/internet/dns-fundamentals.html) — DNS 协议原理与运维深度指南
