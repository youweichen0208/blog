# OpenClaw Progress

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

- 把 `openclaw/index.md` 移入 `docs/openclaw/` 并接入 VitePress 导航。
- 为 `boss-recruiting` 增加一个岗位配置样例，但不要包含真实公司隐私。
- 如果后续需要多岗位，可以把每个岗位配置拆成独立 reference 或 workspace 文档。
