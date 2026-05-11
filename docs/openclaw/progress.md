---
lang: zh-CN
title: OpenClaw Progress
description: 记录 OpenClaw、Browser Relay、BOSS 自动采集和 Excel 落表工作流的阶段进展。
date: 2026-05-09
tags:
  - OpenClaw
  - Progress
---

# OpenClaw Progress

## 2026-05-09

### 已完成：把 student intake 路由收敛成 school gate first，并增加漏回复巡检

目标：解决两类真实问题。

1. 学生主动来聊时，消息里带 `Java`、`后端` 这类关键词，会先被误分流成 `tech_stack_question`，导致学校通过也不自动回复。
2. 页面显示 `已读` 不代表真的回复过；需要单独有一个“院校达标但可能漏回”的巡检。

完成内容：

- 在 `INTAKE_ONLY=true` 下，把学生消息路由改成优先且只走 school gate，不再被 `java`、`go`、`python`、`后端` 这类关键词提前分流。
- 修正了 `resume_question` 路径里清空原消息的问题，避免学校信息明明在候选人原文里却被丢掉。
- 为 `student-recruiting-policy.json` 补了中文海外学校 alias，例如 `加州大学伯克利分校 -> University of California, Berkeley`。
- 新增“最近 20 个院校达标会话是否已回复”巡检脚本，并加到 `boss-recruiting` 的 `npm scripts`。
- 新增一个独立 `launchd` 定时任务，每 5 分钟刷新一次巡检结果 JSON。

当前结论：

- 在这套 BOSS 场景里，“已读”不能等价于“已回复”。
- 回复巡检应采用保守策略：只有明确识别出自己发出的消息，才算 `replied`；否则宁可算 `pending_reply`。

### 已完成：把 BOSS 自动采集切到 Browser Relay 常驻守护

目标：让 Docker 里的 OpenClaw Gateway 继续复用宿主机已登录的 Chrome + BOSS 标签页，不再依赖单独 Chrome profile，同时把“学校命中 -> 信息采集 -> Excel 落表”做成后台持续监听。

完成内容：

- 把 `boss-event-loop` 从 `launchPersistentContext()` 独立 Chrome 方案改成 relay / CDP 方案，直接连接宿主机 `ws://127.0.0.1:18792/cdp`。
- 保留 `launchd` 守护方式，但浏览器控制层改成复用此前已跑通的 `openclaw browser serve + Chrome 扩展 relay`。
- 新增 intake-first 行为：学生主动来聊时，不再先发岗位介绍，学校命中后直接发送基础信息采集模板。
- 新增系统提示过滤：`对方想发送附件简历给您`、`拒绝`、`同意`、`点击预览附件简历`、`pdf` 等文案不再参与消息分类，避免误发“后续不打扰你了”。
- 修正了“可以发一份简历看看吗”这类主动求职消息的路由：在 `INTAKE_ONLY=true` 时，直接进入信息采集，而不是先走岗位介绍。

真实踩坑：

- 当前版本 `openclaw browser serve` 在初始化 Chrome 扩展 relay 时，需要能读到 `gateway.auth.token` 或 `OPENCLAW_GATEWAY_TOKEN`，否则 `18792` 起不来。
- 本机如果默认跑的是 Node 20，`openclaw-cn` 会直接拒绝启动；实际需要 Node 22。
- `127.0.0.1:18792` 端口监听不代表一定能给 agent 用；如果扩展还没有附加当前 BOSS 标签页，`/cdp` WebSocket 可能返回 `503`。

当前结论：

- 更稳的链路不是单独 Chrome，而是：
  `launchd boss-event-loop -> ws://127.0.0.1:18792/cdp -> Browser Relay 扩展 -> 当前已登录 BOSS 标签页`
- 这层恢复后，后台就可以持续做：
  学校筛选 -> 自动发采集模板 -> 信息收齐后落 Excel。

### 已完成：新增 BOSS 直聘低频自动化实战教程

目标：把一次真实跑通的 OpenClaw + Browser Relay + BOSS 直聘工作流整理成一篇可复现的实战教程，而不是只写概念说明。

完成内容：

- 新增 [boss-recruiting-practice.md](./boss-recruiting-practice.md)。
- 记录了完整链路：Docker Gateway -> 宿主机 Browser Relay -> Chrome 扩展 -> BOSS 直聘标签页。
- 记录了当前页未读筛选、低频打招呼、真实发送确认、信息采集问题发送、候选人回复后 Excel 落表。
- 专门写清楚了几个关键踩坑：
  - 学校简称和句子内别名导致的 school gate 误判
  - 点击了外层容器但平台没有真正发送
  - `[草稿]` 和 `送达` 不能混为一谈
  - 候选人附件简历提示会拦住后续消息发送
- 在 `openclaw/index.md` 里加入了这篇实战教程的入口。

注意事项：

- 文中避免写入真实 token、邮箱、电话等敏感信息。
- 候选人姓名和聊天片段来自真实工作流，后续如需公开发布，建议再做一轮脱敏。
- 这篇教程强调的是低频、可验证、可暂停的自动化，不建议把它直接扩展成高频群发。

## 2026-04-25

### 已完成：新增 Docker 部署下 Chrome Browser Relay 配置文章

目标：记录 OpenClaw Gateway 跑在 Docker 中时，如何通过宿主机 Chrome 扩展接管 BOSS 直聘等已登录标签页。

完成内容：

- 新增 `/Users/youweichen/projects/blog/openclaw/browser-relay-docker.md`。
- 说明了 `openclaw browser serve` 为什么不建议放进 Docker：Chrome 扩展 relay 只接受 loopback 连接，Docker 端口映射会破坏这个假设。
- 梳理了正确链路：Chrome 扩展连接宿主机 `127.0.0.1:18792`，Docker Gateway 通过 `host.docker.internal:18791` 访问宿主机 Browser Control。
- 补充了扩展安装、Chrome 加载、扩展选项、BOSS 直聘标签页附加、验证命令和常见错误。
- 记录了 `--token` 后换行导致 `argument missing` 的排查方式。

注意事项：

- 文章中的 token 示例应按部署环境替换，不建议在公开博客中保留真实 token。
- Browser Relay 能读取和操作附加标签页，建议使用独立 Chrome 配置文件，不要附加银行、支付、邮箱等敏感页面。
- 2026-04-25 追加修正：本机 Docker + 本机 Chrome 场景下，推荐 `openclaw browser serve --bind 127.0.0.1 --port 18791`，不要加 `--token`；否则 `18792/json/version` 可能返回 `401 Unauthorized`，导致 Agent browser 工具失败。

### 已完成：新增 boss-recruiting skill-only 插件

目标：给本地 Docker 部署的 OpenClaw 增加一个招聘方使用的 BOSS 直聘 skill，让 Agent 能低频筛选候选人、写主动联系话术、回复候选人问题。

完成内容：

- 在 `/Users/youweichen/projects/openclaw-docker/data/.openclaw/extensions/boss-recruiting` 创建本地 OpenClaw 扩展。
- 新增 `openclaw.plugin.json`，通过 `skills: ["./skills"]` 暴露 skill 目录。
- 新增 `package.json` 和 `index.ts`，满足 OpenClaw 插件发现和加载要求。
- 新增 `skills/boss-recruiting/SKILL.md`，定义招聘方工作流、发送门槛、停止条件和汇报格式。
- 新增 `references/job-profile-template.md`，用于收集岗位配置。
- 新增 `references/boss-recruiting-playbook.md`，用于候选人评分、首联话术和候选人回复。
- 通过 `plugins enable boss-recruiting` 启用插件。
- 在 `openclaw.json` 中加入 `plugins.allow`，白名单包括 `openclaw-weixin`、`boss-recruiting`、`memory-core`。
- 重启 `openclaw-cn-gateway` 让插件生效。

验证结果：

- `plugins list --enabled --json` 显示 `boss-recruiting` 为 `loaded`。
- skill snapshot 显示 `hasBoss: true` 和 `promptHasBoss: true`。
- `health` 命令最终通过，OpenClaw Gateway 正常响应。
- `security audit` 剩余 2 个 warn：反向代理信任配置和状态目录权限；插件 allow list 警告已消除。

注意事项：

- 不把真实 token、API key、候选人个人信息写入博客或长期记忆。
- 该 skill 只指导 OpenClaw 使用正常 UI/工具能力，不绕过验证码、登录、风控或平台限制。
- 自动发送被限制为低频小批量，默认每轮最多 5 人；遇到拒绝、风险提示或敏感承诺问题时停止。

后续可做：

- 公开发布前，再做一轮候选人姓名、聊天内容和截图素材的脱敏。
- 为 `boss-recruiting` 增加一个脱敏后的岗位配置样例，方便读者直接照着改。
- 如果后续需要多岗位，可以把每个岗位配置拆成独立 reference 或 workspace 文档。
