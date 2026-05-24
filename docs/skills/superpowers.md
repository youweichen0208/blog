---
lang: zh-CN
title: Superpowers Skills 使用指南
description: Superpowers 是一套增强 Claude Code 能力的 Skills 系统，帮助更高效地完成任务。
date: 2026-05-24
---
# Superpowers 完全指南：给你的 Coding Agent 装上"工程师本能"

> Superpowers 是一套面向编码 Agent 的**软件开发方法论 + 可组合技能库**。它不只是一堆 Prompt 模板，而是一套自动触发、彼此协作的工作流：从需求澄清、计划拆解、TDD 实现、子代理执行、代码评审到分支收尾，全程自动接管。
> 
> 仓库：[https://github.com/obra/superpowers](https://github.com/obra/superpowers) · 作者：Jesse Vincent ([Prime Radiant](https://primeradiant.com/)) License：MIT · 当前最新版本：v5.1.0

---

## 目录

- [一、为什么需要 Superpowers](https://claude.ai/chat/f1b89dfe-87c2-4956-bce8-0ef476e7fca4#%E4%B8%80%E4%B8%BA%E4%BB%80%E4%B9%88%E9%9C%80%E8%A6%81-superpowers)
- [二、核心概念：Skill 是什么](https://claude.ai/chat/f1b89dfe-87c2-4956-bce8-0ef476e7fca4#%E4%BA%8C%E6%A0%B8%E5%BF%83%E6%A6%82%E5%BF%B5skill-%E6%98%AF%E4%BB%80%E4%B9%88)
- [三、支持的平台与安装](https://claude.ai/chat/f1b89dfe-87c2-4956-bce8-0ef476e7fca4#%E4%B8%89%E6%94%AF%E6%8C%81%E7%9A%84%E5%B9%B3%E5%8F%B0%E4%B8%8E%E5%AE%89%E8%A3%85)
- [四、标准工作流（7 步）](https://claude.ai/chat/f1b89dfe-87c2-4956-bce8-0ef476e7fca4#%E5%9B%9B%E6%A0%87%E5%87%86%E5%B7%A5%E4%BD%9C%E6%B5%817-%E6%AD%A5)
- [五、Skills 速查表](https://claude.ai/chat/f1b89dfe-87c2-4956-bce8-0ef476e7fca4#%E4%BA%94skills-%E9%80%9F%E6%9F%A5%E8%A1%A8)
- [六、命令参考](https://claude.ai/chat/f1b89dfe-87c2-4956-bce8-0ef476e7fca4#%E5%85%AD%E5%91%BD%E4%BB%A4%E5%8F%82%E8%80%83)
- [七、四条设计哲学](https://claude.ai/chat/f1b89dfe-87c2-4956-bce8-0ef476e7fca4#%E4%B8%83%E5%9B%9B%E6%9D%A1%E8%AE%BE%E8%AE%A1%E5%93%B2%E5%AD%A6)
- [八、实战案例：从想法到合并](https://claude.ai/chat/f1b89dfe-87c2-4956-bce8-0ef476e7fca4#%E5%85%AB%E5%AE%9E%E6%88%98%E6%A1%88%E4%BE%8B%E4%BB%8E%E6%83%B3%E6%B3%95%E5%88%B0%E5%90%88%E5%B9%B6)
- [九、常见陷阱与最佳实践](https://claude.ai/chat/f1b89dfe-87c2-4956-bce8-0ef476e7fca4#%E4%B9%9D%E5%B8%B8%E8%A7%81%E9%99%B7%E9%98%B1%E4%B8%8E%E6%9C%80%E4%BD%B3%E5%AE%9E%E8%B7%B5)
- [十、扩展与相关项目](https://claude.ai/chat/f1b89dfe-87c2-4956-bce8-0ef476e7fca4#%E5%8D%81%E6%89%A9%E5%B1%95%E4%B8%8E%E7%9B%B8%E5%85%B3%E9%A1%B9%E7%9B%AE)
- [十一、FAQ](https://claude.ai/chat/f1b89dfe-87c2-4956-bce8-0ef476e7fca4#%E5%8D%81%E4%B8%80faq)

---

## 一、为什么需要 Superpowers

直接用裸 Claude Code / Codex / Cursor 写代码，典型问题是：

- **跳过澄清直接动手**——需求理解只有 30% 就开始写，返工成本高
- **没有真正的 TDD**——号称写了测试，其实先写实现再补测试
- **大上下文崩溃**——长任务里 Agent 越写越偏，丢失原始目标
- **声称完成但没验证**——"我已经修好了"，实际上测试都没跑
- **修复 bug 靠猜**——盲改一通，治标不治本

Superpowers 用一套**强制流程 + 自动触发 + 子代理隔离**的组合解决这些问题。一旦装上，Agent 在你输入需求的那一刻就会自动切换到"工程师模式"：先问清楚，再拆计划，再分子任务跑 TDD，每步可验证。

---

## 二、核心概念：Skill 是什么

一个 **Skill** = 一份 `SKILL.md` 文件，里面定义了：

|字段|作用|
|---|---|
|**触发描述（description）**|Agent 根据用户请求自动判断是否激活|
|**执行流程**|严格的步骤序列，Agent 必须按顺序执行|
|**检查清单**|每步的验收标准，防止跳步|
|**输出规范**|最终交付物的形态（设计文档 / 计划 / 测试 / PR）|

Skills 分两类：

- **Rigid Skill（刚性）**——必须严格遵守，例如 `test-driven-development`、`systematic-debugging`、`verification-before-completion`。Agent 不能"灵活变通"。
- **Flexible Skill（柔性）**——原则固定但方法可调，例如 `brainstorming`、`writing-plans`。

**关键认知**：Skills 是 Agent 的**默认行为覆盖层**。当 Skill 与平台默认行为冲突时，Skill 优先；当 `CLAUDE.md` / `AGENTS.md` 等用户配置与 Skill 冲突时，**用户配置优先**——你始终在驾驶位。

---

## 三、支持的平台与安装

Superpowers 不绑定单一 Agent，目前支持 8 个主流编码代理。如果你同时用多个，**每个都要分别安装**。

### Claude Code（推荐入门路径）

**方式 1：Anthropic 官方插件市场**

```bash
/plugin install superpowers@claude-plugins-official
```

**方式 2：Superpowers 自有市场**（更新更快，含周边插件）

```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

安装后输入 `/help`，应能看到 `/superpowers:brainstorm`、`/superpowers:write-plan`、`/superpowers:execute-plan` 等命令。

### Codex CLI

```bash
/plugins
# 搜索 superpowers，选 Install Plugin
```

### Codex App

侧边栏 → Plugins → Coding 分类 → 点 Superpowers 旁的 `+`。

### Factory Droid

```bash
droid plugin marketplace add https://github.com/obra/superpowers
droid plugin install superpowers@superpowers
```

### Gemini CLI

```bash
gemini extensions install https://github.com/obra/superpowers
gemini extensions update superpowers   # 后续更新
```

### Cursor

在 Agent chat 里：

```
/add-plugin superpowers
```

### GitHub Copilot CLI

```bash
copilot plugin marketplace add obra/superpowers-marketplace
copilot plugin install superpowers@superpowers-marketplace
```

### OpenCode

OpenCode 使用独立插件机制。在 OpenCode 里告诉 Agent：

```
Fetch and follow instructions from https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/.opencode/INSTALL.md
```

---

## 四、标准工作流（7 步）

这是 Superpowers 的"主流程"，Skills 会按顺序自动接力。理解这 7 步，你就理解了整个系统。

```
┌──────────────────┐      ┌───────────────────┐      ┌──────────────────┐
│ 1. brainstorming │ ───▶ │ 2. git-worktrees  │ ───▶ │ 3. writing-plans │
│  澄清需求与设计   │      │  隔离工作分支      │      │  拆分小任务计划    │
└──────────────────┘      └───────────────────┘      └──────────────────┘
                                                              │
                                                              ▼
┌─────────────────────────┐      ┌─────────────────────────────────┐
│ 7. finishing-a-branch   │ ◀─── │ 4. subagent-driven-development  │
│   合并 / PR / 清理       │      │   或 executing-plans 批次执行    │
└─────────────────────────┘      └─────────────────────────────────┘
                                                              │
                                                              ▼
                              ┌──────────────────────┐    ┌──────────────────────────┐
                              │ 6. requesting-       │ ◀──│ 5. test-driven-          │
                              │    code-review       │    │    development (RED→     │
                              │   按严重度报告问题    │    │    GREEN→REFACTOR)       │
                              └──────────────────────┘    └──────────────────────────┘
```

### 各步详解

**1. brainstorming（头脑风暴）** 开写之前先苏格拉底式提问，把模糊的"我想做个登录"挖到"OAuth2 + Google/GitHub + 30 天会话 + 速率限制"。最后生成可签字的设计文档。

**2. using-git-worktrees（隔离工作区）** 在新分支上创建独立的 worktree，跑一遍 setup 验证测试基线干净，避免污染主分支。

**3. writing-plans（写计划）** 把设计拆成 **2–5 分钟一个的小任务**。每个任务必须有：精确文件路径、完整代码、验证步骤。给"判断力差、没上下文、还讨厌写测试的初级工程师"也能照着做。

**4. subagent-driven-development / executing-plans（执行）** 两种执行模式：

- **subagent-driven**：每个任务派一个全新子代理，做完后两阶段评审（先看是否符合 spec，再看代码质量）
- **executing-plans**：批量执行，关键节点插入人工 checkpoint

子代理隔离的好处：主上下文不被污染，长任务可以连续跑几小时不偏。

**5. test-driven-development（TDD）** 强制 RED-GREEN-REFACTOR：

1. 写一个**会失败**的测试
2. 跑一遍**确认**它失败（这步很多人跳，Skill 不允许）
3. 写**最少**的代码让它通过
4. 跑一遍确认通过
5. 重构 + commit

**任何在测试之前写的实现代码会被直接删掉。**

**6. requesting-code-review（代码评审）** 任务间自动评审，按严重度（critical / major / minor）报告。critical 问题阻塞后续进度。

**7. finishing-a-development-branch（收尾）** 全部任务完成后，验证测试 → 给出选项（合并 / 创建 PR / 保留分支 / 丢弃）→ 清理 worktree。

---

## 五、Skills 速查表

按官方仓库分类整理。这是当前完整列表（v5.1.0）。

### Testing

|Skill|触发场景|关键产出|
|---|---|---|
|`test-driven-development`|实现新功能、修 bug|RED-GREEN-REFACTOR 循环、测试反模式提示|

### Debugging

|Skill|触发场景|关键产出|
|---|---|---|
|`systematic-debugging`|遇到 bug、测试失败|4 阶段根因分析（root-cause-tracing、defense-in-depth、condition-based-waiting）|
|`verification-before-completion`|声称"完成"前|跑测试 + 构建 + 清单检查，避免假完成|

### Collaboration

|Skill|触发场景|关键产出|
|---|---|---|
|`brainstorming`|任何创意/设计工作前|设计文档|
|`writing-plans`|设计已批准、需要多步实施|小任务清单|
|`executing-plans`|已有书面计划|分批执行 + 检查点|
|`dispatching-parallel-agents`|多个独立任务可并行|并发子代理调度|
|`requesting-code-review`|任务完成、准备合并|评审报告|
|`receiving-code-review`|收到评审意见|反馈响应流程|
|`using-git-worktrees`|开始新功能开发|隔离工作分支|
|`finishing-a-development-branch`|所有测试通过|合并 / PR / 清理决策|
|`subagent-driven-development`|执行实施计划|两阶段评审子代理流程|

### Meta

|Skill|触发场景|关键产出|
|---|---|---|
|`writing-skills`|想自己写新 Skill|创建 Skill 的最佳实践（含测试方法）|
|`using-superpowers`|入门或重新熟悉系统|系统总览与导览|

---

## 六、命令参考

Superpowers 的核心命令在 Claude Code 中以 `/superpowers:` 为前缀。

|命令|作用|
|---|---|
|`/superpowers:brainstorm`|启动交互式设计澄清|
|`/superpowers:write-plan`|基于已有设计生成实施计划|
|`/superpowers:execute-plan`|分批执行已有计划|
|`/help`|列出所有可用命令|

**自动触发 vs 手动调用**：日常使用中几乎不需要手敲命令，Skills 会根据你的自然语言请求自动激活。只有在你想**精确控制流程**或**重启某一步**时才手动调用。

---

## 七、四条设计哲学

理解这四条，你就理解了 Superpowers 为什么这样设计。

1. **Test-Driven Development**——测试先行，永远。这不是建议，是硬约束。
2. **Systematic over ad-hoc**——用流程替代靠猜。Debug、Review、Plan 全部走系统化路径。
3. **Complexity reduction**——简单是首要目标。YAGNI、DRY 内嵌在 `writing-plans` 里。
4. **Evidence over claims**——验证后再宣称成功。`verification-before-completion` 就是这一条的物理化身。

---

## 八、实战案例：从想法到合并

下面用一个真实场景演示 Skills 如何接力。假设你想给一个 Web 应用加"忘记密码"功能。

**第 1 步：你说出想法**

```
帮我加个忘记密码的功能
```

**第 2 步：brainstorming 自动激活**

Agent 不会立刻开写，而是反问：

- 用邮件验证还是短信？
- token 有效期？
- 一小时内最多发几封？
- 用户改完密码后，所有现有会话是否失效？

聊完，它生成一份设计文档让你签字。

**第 3 步：worktree + plan**

你说"go"。Agent 自动：

- 用 `using-git-worktrees` 开一个 `feature/password-reset` worktree
- 用 `writing-plans` 把设计拆成 8 个小任务，比如：
    - 任务 1：添加 `password_reset_tokens` 数据表（含 migration 测试）
    - 任务 2：实现 token 生成服务（先写 3 个失败测试）
    - 任务 3：实现邮件发送
    - …

**第 4 步：subagent-driven-development**

每个任务派一个新子代理：

- 子代理先写测试 → 跑 → 确认失败（RED）
- 写实现 → 跑 → 确认通过（GREEN）
- 重构 → 跑 → 确认仍通过（REFACTOR）
- 主 Agent 做两阶段评审，通过才进下一任务

**第 5 步：collisions/review/finish**

每个任务后 `requesting-code-review` 自动跑。全部完成后 `finishing-a-development-branch` 跑完整测试套件，问你：合并 / 开 PR / 留着 / 删掉？

**整个过程**：可以连续运行 1–2 小时，你只需要在设计阶段和最终决策点介入。

---

## 九、常见陷阱与最佳实践

### 应避免的做法

**跳过 brainstorming 直接让 Agent 写代码**

即使是"加一个按钮"这种小事，让 Skill 跑一遍也比直接动手强。简单任务经常会暴露未说出口的约束。

**跳过 verification-before-completion**

"我修好了"是最便宜也最不可信的话。让 Skill 跑测试套件再说。

**把 CLAUDE.md / AGENTS.md 写成"绕过 Skill"的指令**

可以这样写，但要明白你在关掉一道安全网。建议只在**充分理解某 Skill 在做什么之后**才覆盖它。

### 推荐的做法

**信任自动触发**

Superpowers 的精髓是"你不需要记命令"。你描述意图，Skills 自己接力。手动调用应该是例外，不是常态。

**用 worktree 隔离实验**

对探索性任务，强烈推荐让 `using-git-worktrees` 介入。主分支永远干净。

**长任务里中途读一下计划**

即使 Agent 自动执行，你随时可以让它"展示当前计划和进度"。这是免费的安全检查。

---

## 十、扩展与相关项目

Superpowers 不止主仓库，还有一个小生态：

|仓库|作用|
|---|---|
|[`obra/superpowers`](https://github.com/obra/superpowers)|主仓库，核心 Skills 库|
|[`obra/superpowers-marketplace`](https://github.com/obra/superpowers-marketplace)|插件市场（含周边插件）|
|[`obra/superpowers-skills`](https://github.com/obra/superpowers-skills)|社区可编辑的 Skill 集合|
|[`obra/superpowers-lab`](https://github.com/obra/superpowers-lab)|实验性 Skills（如 `windows-vm`）|
|[`obra/superpowers-developing-for-claude-code`](https://github.com/obra/superpowers-developing-for-claude-code)|开发 Claude Code 插件的 Skill 包|
|[`obra/the-elements-of-style`](https://github.com/obra/the-elements-of-style)|Strunk《The Elements of Style》风格写作 Skill|

---

## 十一、FAQ

**Q：Superpowers 和原生 Claude Code 是什么关系？** A：Superpowers 是一个**插件**，安装后扩展 Claude Code（以及其它 7 个平台）的默认行为。不是替代品，是增强层。

**Q：会拖慢响应吗？** A：单次响应会稍慢（因为多了澄清和验证），但整体项目交付**显著更快**——返工少、bug 少、调试时间少。

**Q：能在闭源项目里用吗？** A：可以。Superpowers 本身是 MIT 协议，运行在你本地的 Agent 里，不会把你的代码发到第三方。

**Q：我可以写自己的 Skill 吗？** A：可以。读 `skills/writing-skills/SKILL.md`。但官方仓库**一般不接受新 Skill 的贡献**——他们要保证跨 8 个平台都能跑，门槛很高。建议放在 `obra/superpowers-skills`（社区可编辑）或自己 fork。

**Q：和 Anthropic 官方的 Agent Skills 有什么区别？** A：Agent Skills 是平台级机制（任何人可以写 Skill 文件夹）。Superpowers 是**一套精心调试的、面向软件开发的 Skill 合集**，已经被打磨成一个连贯方法论。两者互补：Agent Skills 是底层能力，Superpowers 是上层最佳实践包。

**Q：v5.1.0 之后还在维护吗？** A：是。截至本文写作（2026 年 5 月），项目活跃维护中，主仓库 203k+ stars，最新 release v5.1.0 发布于 2026-05-04。

---

## 资源链接

- 主仓库：[https://github.com/obra/superpowers](https://github.com/obra/superpowers)
- 发布博客：[https://blog.fsck.com/2025/10/09/superpowers/](https://blog.fsck.com/2025/10/09/superpowers/)
- Discord 社区：[https://discord.gg/35wsABTejz](https://discord.gg/35wsABTejz)
- Issues：[https://github.com/obra/superpowers/issues](https://github.com/obra/superpowers/issues)
- 作者博客：[https://blog.fsck.com](https://blog.fsck.com/)

---

