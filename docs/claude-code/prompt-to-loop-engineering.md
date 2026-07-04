---
lang: zh-CN
title: 从 Prompt 到 Loop：理解 LLM 工程的四层演进
description: 用 Claude Code 多 agent 协作实战，讲透 prompt/context/harness/loop engineering 的演进与工程闭环
date: 2026-07-04
tags:
  - Claude Code
  - Prompt Engineering
  - AI Agent
  - 工程实践
---

# 从 Prompt 到 Loop：理解 LLM 工程的四层演进

## 概述

很多人用 AI 写代码，体验是「时灵不灵」：同一个任务，今天跑通，明天就翻车。问题往往不在模型变笨了，而在你只调了**第一层**——prompt。和 LLM 协作实际上有四层工程，每一层都在上一层的基础上加杠杆：

| 层级 | 关注点 | 一句话 |
| --- | --- | --- |
| Prompt Engineering | 单次请求 | 把一句话说清楚 |
| Context Engineering | 上下文窗口 | 让模型在「对的时候」看到「对的信息」 |
| Harness Engineering | 模型外部骨架 | 用代码保证「该做的事一定做」 |
| Loop Engineering | 迭代闭环 | 行动→反馈→修正，直到达标 |

下面先讲清四层演进，再用一个 Claude Code 多 agent 实战把后两层跑通。

## 一、四层演进

### 1. Prompt Engineering：把单次请求写好

最底层，关注**一次请求**怎么表达：角色设定、few-shot 示例、思维链、结构化输出、明确的成功标准。

痛点：模型是无状态的。你今天让它「按 Conventional Commits 写提交信息」写得好，明天开新会话它又忘了。每轮对话你都要重新交代一遍背景，上下文一长就失焦。

### 2. Context Engineering：管理进入窗口的一切

意识到「prompt 只是上下文的一部分」后，关注点升级为**整个上下文窗口**：system prompt、CLAUDE.md 项目记忆、`@file` 引入的代码、对话历史、工具返回结果、甚至该**清掉**的过期信息。

典型手段：

- `CLAUDE.md`：把项目约定、技术栈、命令固化下来，每次会话自动注入。
- `@文件路径`：按需把代码塞进上下文，而不是让模型瞎猜。
- 子 agent（subagent）：把「读 50 个文件找 bug」这种脏活丢给独立上下文窗口，结果只回传一句话，主上下文不被污染。

关键认知：**模型的上限取决于窗口里有什么**。会管上下文，比会写 prompt 更重要。

### 3. Harness Engineering：模型外部的确定性骨架

Context engineering 仍有个漏洞——它依赖模型「自觉」。你在 CLAUDE.md 写了「改完代码要跑 lint」，模型有时就是会忘。

Harness engineering 关注**模型外部的运行时骨架**：settings、hooks、skills、subagents、MCP。其中 hooks 是核心，因为它是**代码**，不是模型自由裁量：

- `permissions`：白名单/黑名单命令，防止误删。
- `PostToolUse` hook：每次 Edit/Write 之后**强制**跑 lint/format，不靠模型记忆。
- `Stop` hook：模型说「完成了」时，先跑 `build`，失败就阻止它收尾。
- subagents：把不同角色隔离成独立上下文 + 独立系统提示。
- skills：把领域知识打包成「按需加载」的技能包。

一句话：**把「指望模型自觉」变成「代码保证执行」**。这是从「可用」到「可靠」的分水岭。

### 4. Loop Engineering：迭代闭环

模型很少一次做对。Loop engineering 关注**让行动变成闭环**：行动→观察反馈→修正→再验证，直到达成可量化的成功标准。

典型手段：

- Plan mode：先出计划、人工确认，再动手。
- TDD loop：红→绿→重构。
- 子 agent 驱动开发：分派→执行→审查→修复的检查点。
- `verification-before-completion`：声明完成前**必须跑验证命令**并贴出输出。
- `/loop`：让一个任务自定节奏地重复执行，直到条件满足。

一句话：**单次射击 → 迭代收敛**。loop 工程决定了你能否在「不灵」时自动回到「灵」。

## 二、Claude Code 实战：多 agent 协作给博客加「自动摘要」功能

任务：给本 VitePress 博客的所有文章自动生成 `description` 字段，并校验 frontmatter 格式，要求改完 `npm run build` 必须通过。我们用 harness + loop 把它做成工程闭环。

### 2.1 Harness Engineering：搭骨架

**第一步，权限与 hook 配置**（`.claude/settings.json`）：

```json
{
  "permissions": {
    "allow": ["Bash(npm run build)", "Bash(npm run lint)"],
    "deny": ["Bash(rm -rf *)", "Bash(git push *)"]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs -r npx markdownlint-cli2"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "npm run build || exit 2" }
        ]
      }
    ]
  }
}
```

两条 hook 把不确定性钉死：每次改文件后自动 lint，模型想收尾时 build 必须绿——否则 `Stop` hook 退出码非 0，会阻止它宣布完成。这一步不依赖模型「记得」，它是**确定性**的。

**第二步，定义两个子 agent**（`.claude/agents/`）：

`.claude/agents/summary-writer.md`：

```markdown
---
name: summary-writer
description: 为博客文章生成 80 字以内的 frontmatter description
tools: Read, Edit
---
你是技术博客摘要撰写专家。读取指定文章，提炼一句话摘要，
写入 frontmatter 的 description 字段。要求：不超过 80 字，含核心关键词，不堆砌。
```

`.claude/agents/frontmatter-reviewer.md`：

```markdown
---
name: frontmatter-reviewer
description: 校验博客文章 frontmatter 是否符合规范
tools: Read, Grep
---
你是 frontmatter 校验员。检查每篇文章是否包含
lang/title/description/date/tags 五个字段，description 长度是否 ≤80 字。
只回传「问题清单」，不修改文件。
```

每个子 agent 有独立上下文窗口和独立系统提示，互不污染：writer 只管写，reviewer 只管挑刺。

### 2.2 Loop Engineering：闭循环

骨架搭好后，主 agent 的工作变成「编排循环」：

1. **Plan**：先列出要处理的文章清单，人工确认。
2. **分派**：对每篇文章，用 Agent 工具并发派发 `summary-writer` 生成摘要。
3. **审查**：派 `frontmatter-reviewer` 跑一遍，回传问题清单。
4. **修复**：有问题就回到第 2 步重写，直到 reviewer 报零问题。
5. **验证**：主 agent 跑 `npm run build`。如果 `Stop` hook 拦住了——说明 build 没过——读取报错，修断链/语法，再跑。
6. **自检收尾**：所有子 agent 任务完成 + build 绿，才声明完成。

如果任务量大或要盯外部状态（比如等 CI 跑完），可以用 `/loop` 让「检查 CI → 失败则修」这一步按节奏重复，直到 CI 全绿才停。

整条链路里，**没有任何一步是「指望模型自觉」的**：lint 由 hook 强制跑，build 由 hook 强制卡，reviewer 独立挑刺，失败自动回到上一步。

## 三、闭环是怎么形成的

回到开头的问题——为什么「时灵不灵」？因为只在第一层使劲：

- 只用 prompt：模型忘了背景 → 出错。
- 加 context：模型有了背景，但忘了跑 lint → 出错。
- 加 harness：lint/build 一定跑 → 错被**当场抓到**，但你还得手动修。
- 加 loop：抓到错后**自动回到修复**，循环到全绿 → 工程闭环。

**Harness 提供确定性反馈，loop 提供迭代收敛**，二者咬合就是工程闭环：每一次「不灵」都会被 hook 抓成信号，loop 把信号转成下一轮修正，直到达成可验证的成功标准。这就是从「写好一句话」到「可靠交付一个功能」的完整路径。

带着这个四层视角再去用 Claude Code，你会发现 settings、hooks、subagents、`/loop`、plan mode 不是一堆零散功能，而是分别对应 context、harness、loop 三层的工程手段——选对层，问题才解得对。
