---
lang: zh-CN
title: Agent 开发指南
description: 记录 Agent 架构、工具调用、MCP 集成、记忆系统和工程化落地路线。
date: 2026-05-10
---

# Agent 开发指南

欢迎来到 Agent（智能代理）开发专栏。

## 什么是 Agent

Agent（智能代理）是能够感知环境、做出决策并采取行动以实现特定目标的自主实体。在 AI 时代，Agent 通常指基于大语言模型（LLM）的智能代理，能够理解指令、规划任务、使用工具，并与环境交互。

## Agent 的核心能力

- **感知**：理解用户意图和环境状态
- **规划**：制定达成目标的步骤
- **执行**：调用工具和 API 完成任务
- **记忆**：保持上下文和历史信息
- **反思**：评估结果并优化策略

## 专栏内容

本专栏将涵盖以下主题：

### 基础篇
- Agent 架构设计原理
- Prompt 工程与 ReAct 模式
- 工具调用（Function Calling）
- 记忆系统设计

### 框架篇
- LangChain Agent 开发
- AutoGPT 与自主代理
- BabyAGI 任务规划
- 自定义 Agent 框架

### 进阶篇
- 多 Agent 协作系统
- Agent 的评估与优化
- 安全性与可控性
- RAG 增强型 Agent

### 实战篇
- 构建代码助手 Agent
- 构建运维自动化 Agent
- 构建数据分析 Agent
- 构建客服机器人 Agent

### 前沿技术
- MCP（Model Context Protocol）集成
- Agent 的长期记忆
- Agent 的自我进化
- 多模态 Agent

## Agent 开发生态

- **LLM 提供商**：OpenAI、Anthropic、Google
- **开发框架**：LangChain、LlamaIndex、Semantic Kernel
- **工具平台**：Coze、Dify、FastGPT
- **协议标准**：MCP、OpenAPI

## 推荐资源

- [LangChain Documentation](https://python.langchain.com/)
- [Anthropic Claude](https://www.anthropic.com/claude)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)

## 文章列表

当前 Agent 相关内容分散在几个相邻专题里，可以按下面顺序阅读：

- [MCP (Model Context Protocol) 完全指南](../mcp/) - 先理解模型如何连接工具和外部系统。
- [RDS CLI 开发教程：Go + Cobra 从零开始](../cli/) - 理解为什么 CLI 很适合作为 Agent 的工具边界。
- [Skill 实战记录](../claude-code/skill/) - 记录一次 Codex + Skill + MCP 的真实工作流。
- [OpenClaw 实战](../openclaw/boss-recruiting-practice.md) - 一个浏览器自动化和业务流程结合的 Agent 场景。

## 后续写作计划

- ReAct 与 Plan-and-Execute 的差异。
- 工具 schema 设计：如何让模型稳定调用。
- Agent 记忆：短期上下文、长期笔记和可检索知识库。
- 评估与回放：如何判断 Agent 改动有没有变好。
