# OpenClaw 实战：在 BOSS 直聘里做低频打招呼、信息采集和 Excel 落表

这篇不是概念介绍，而是一篇从真实踩坑里整理出来的实战教程。目标很具体：

- OpenClaw Gateway 跑在 Docker 里
- 宿主机 Chrome 已登录 BOSS 直聘
- 通过 Browser Relay 把当前标签页接给 OpenClaw
- 对当前未读候选人做低频筛选
- 给通过筛选的人发送首条沟通
- 候选人回复后，继续追问最小信息集
- 信息补全后自动写入 Excel

前提说明：

- 这套流程只适合低频、小批量、人工盯盘的招聘工作流
- 不适合无约束群发
- 不绕过登录、验证码、平台风控，也不碰隐藏 API

## 1. 最终跑通的链路

```text
Docker 里的 OpenClaw Gateway
  -> host.docker.internal:18791
  -> 宿主机 openclaw browser serve
  -> 127.0.0.1:18792 Chrome Extension Relay / CDP Relay
  -> 宿主机 Chrome 里的 BOSS 直聘标签页
```

对应端口：

```text
18789: OpenClaw Gateway
18790: OpenClaw Bridge
18791: Browser Control
18792: Chrome Extension Relay / CDP Relay
```

如果你还没把 Docker Gateway 和 Browser Relay 这层打通，先看：

- [OpenClaw Docker 部署下如何配置 Chrome Browser Relay](./browser-relay-docker.md)

## 2. 这次真正解决了什么

这次落地的不是“理论上能控制浏览器”，而是把下面几步都做成了可执行脚本：

1. 读取当前 BOSS 直聘未读候选人列表
2. 按学校门槛做第一轮筛选
3. 生成低频打招呼草稿
4. 真实点击 BOSS 的发送按钮，而不是只写进草稿框
5. 给候选人发送最小信息采集模板
6. 等候选人补全后，把信息写入当天 Excel

## 3. 目录和脚本位置

这套脚本放在本地 OpenClaw 扩展目录里：

```text
data/.openclaw/extensions/boss-recruiting/
```

本文提到的关键脚本有：

- `scripts/screen-current-unread.mjs`
- `scripts/batch-greet-current-unread.mjs`
- `scripts/send-current-intake-request.mjs`
- `scripts/process-current-chat-intake.mjs`
- `scripts/boss-event-loop.mjs`

对应的 npm 入口：

```bash
npm run screen-current-unread
npm run batch-greet-current-unread
npm run send-current-intake-request
npm run process-current-chat-intake
```

如果你想把“学生主动来聊 -> 学校筛选 -> 自动发采集模板 -> 收齐后落 Excel”做成常驻后台，还可以运行：

```bash
npm run boss-event-loop
```

后面实测更稳的方式不是单独起一个 Chrome profile，而是让 `boss-event-loop` 直接连已经跑通的 Browser Relay：

```text
launchd boss-event-loop
  -> ws://127.0.0.1:18792/cdp
  -> Clawdbot Browser Relay 扩展
  -> 当前已登录的 BOSS 标签页
```

这样不会再遇到“独立 Chrome 没登录 / 起不来 / profile 不稳定”的问题。

## 4. 第一步：当前页未读候选人筛选

先只读筛选，不发消息：

```bash
npm run screen-current-unread -- --top 5
```

这一步会做三件事：

1. 读取当前 BOSS 直聘页面里未读会话
2. 提取候选人名字、职位和消息预览
3. 用本地 school gate 判断：

- `已通过`
- `待复核`
- `已跳过`

### 这一步踩过的坑

#### 坑 1：候选人简称导致误判

例如候选人写的是：

```text
保研北邮
```

如果别名字典里没有：

```json
"北邮": "北京邮电大学"
```

就会被误判成 `school_fail`。

#### 坑 2：只做整串匹配不够

如果学校归一化逻辑只支持：

```text
输入值 == 别名
```

那 `保研北邮` 这种句子内简称也不会命中。

这次修正方式是两步：

1. 在策略文件里补别名
2. 学校归一化支持句子内替换，而不是只做整串等值匹配

## 5. 第二步：低频批量打招呼

只生成草稿，不发消息：

```bash
npm run batch-greet-current-unread -- --top 5 --limit 3
```

真正发送：

```bash
npm run batch-greet-current-unread -- --top 12 --limit 2 --send true
```

约束说明：

- 默认 `dry-run`
- 只有显式传 `--send true` 才会发
- `--limit` 仍然会被脚本限制在最多 `5`

### 真实踩坑：为什么一开始“看起来发了”，但聊天里没看到

一开始脚本只是做了两件事：

1. 把文案写进 `#boss-chat-editor-input`
2. 点击了一个包含“发送”字样的外层容器

问题在于，BOSS 真正可发送的元素不是整个容器，而是：

```html
<div class="submit active">发送</div>
```

也就是：

```text
.conversation-editor .submit.active
```

如果你点的是外层 `.conversation-editor`，可能会出现三种假成功：

- 输入框里有文案，但没发出去
- 列表里出现 `[草稿]`
- 脚本返回“点击成功”，但平台没有真正发送

### 后来怎么修

后面把发送动作改成了：

1. 精确定位 `.submit.active`
2. 触发 `mousedown` / `mouseup` / `click`
3. 发送后再做确认，而不是只看点击有没有执行

确认标准改成：

- 聊天区里出现我方新消息
- 或者列表预览更新成已发送内容
- 且不是 `[草稿]`

这样才把“脚本点了按钮”和“平台真的发出去了”分开。

## 6. 第三步：当前聊天发送信息采集问题

当候选人已经回复，并且你想进入最小信息集采集时，选中当前聊天后运行：

```bash
npm run send-current-intake-request
```

默认模板是：

```text
同学你好，感谢你回复。
为了方便进一步沟通华为云软件研发岗位，麻烦你补充以下信息：
姓名：
联系电话：
毕业时间：
毕业院校：
专业：
邮箱：
谢谢。
```

### 真实踩坑：附件简历提示会挡住继续发消息

这次在一个真实会话里，页面先出现了：

```text
对方想发送附件简历给您，您是否同意
拒绝 / 同意
```

如果不先处理这个状态，后续采集消息虽然被脚本写进了输入区，但不会真正发出去。

后面脚本加了一步：

1. 如果当前聊天里出现 `同意`
2. 先点 `同意`
3. 再发送采集问题

这样才能真正把采集模板发出去，并在聊天里看到：

```text
送达
同学你好，感谢你回复...
```

### 继续踩坑：系统提示不能当作候选人真实回复

后面做常驻自动采集时，还遇到过一个更隐蔽的问题。BOSS 页面里的下面这些文案：

```text
对方想发送附件简历给您，您是否同意
拒绝 / 同意
点击预览附件简历
黄帅博简历.pdf
```

本质上是系统提示，不是候选人真正发给你的自然语言回复。

如果把这些文本也一起喂给自动分类器，容易出现两类误判：

1. 把 `拒绝` 当成候选人不感兴趣，于是误发：

```text
好的，理解。谢谢回复，后续不打扰你了，祝你顺利。
```

2. 把“发简历”“附件”“pdf”误当成普通问答，走错回复路由。

后面稳定下来的做法是：

- 在消息抽取层先过滤系统提示
- `拒绝 / 同意 / pdf / 点击预览附件简历` 不进入消息分类
- 自动回复只基于候选人真实自然语言回复

这样才不会把平台 UI 提示误当成候选人态度。

## 7. 第四步：候选人回复后自动写入 Excel

候选人把 6 个字段回全后，选中这个聊天，运行：

```bash
npm run process-current-chat-intake
```

这个脚本会：

1. 读取当前选中聊天
2. 提取最新候选人回复
3. 跑 school gate
4. 尝试解析字段：
   - 姓名
   - 联系电话
   - 毕业时间
   - 毕业院校
   - 专业
   - 邮箱
5. 如果字段不全，返回缺失项和补问草稿
6. 如果字段齐全，自动写入当天 Excel

输出文件规则：

```text
workspace/boss-recruiting-data/{YYYY-MM-DD}学生招聘信息.xlsx
```

Sheet 名固定是：

```text
学生招聘信息
```

列顺序：

1. 记录日期
2. 姓名
3. 联系电话
4. 毕业时间
5. 毕业院校
6. 专业
7. 邮箱
8. 来源场景
9. BOSS昵称
10. 备注

## 8. 第五步：把自动采集做成后台守护

如果你不想每次手动选中聊天、手动触发脚本，可以把 `boss-event-loop` 做成宿主机 `launchd` 常驻任务。

真实跑通后的职责收敛成两件事：

1. 候选人主动来聊，且学校命中 allowlist 时，直接发送基础信息采集模板
2. 候选人把 6 项信息补全后，自动写入当天 Excel

这里有两个后来确认的产品决策：

- 学生主动来找你时，不再先发“你好，张某某，你和我们岗位比较贴近”这种客套介绍
- 直接发采集模板更稳，也更符合当前业务目标

最终固定下来的首轮模板是：

```text
同学你好，感谢你回复。为了方便进一步沟通华为云软件研发岗位，麻烦你补充以下信息：
姓名：
联系电话：
毕业时间：
毕业院校：
专业：
邮箱：
谢谢。
```

这样能避免两类问题：

- 首轮岗位介绍冗长，候选人并不继续补信息
- 自动守护把“可以发一份简历看看吗”误路由成别的对话模板

## 9. 常驻守护的真实依赖

要让后台持续监听成立，需要这两层都活着：

1. `launchd` 里的 `boss-event-loop`
2. 宿主机 `openclaw browser serve` + Chrome 扩展 relay

这里有三个真实排查点：

- `openclaw browser serve` 当前版本需要能读到 `OPENCLAW_GATEWAY_TOKEN`，否则 `18792` 起不来
- 本机 Node 版本如果低于 22，`openclaw-cn` 会直接拒绝启动
- `18792` 端口存在不代表一定能用；如果扩展还没附加当前 BOSS 标签页，agent 连 `/cdp` 仍然可能返回 `503`

所以后台守护的稳定链路应理解成：

```text
launchd boss-event-loop
  -> ws://127.0.0.1:18792/cdp
  -> Browser Relay 扩展
  -> 当前已登录并已附加的 BOSS 标签页
```

## 10. 这套流程目前仍有的边界

### 边界 1：学校匹配仍然要继续收紧

例如：

```text
杭州电子科技大学信息工程学院
```

如果你用的是宽松包含匹配，可能误命中成：

```text
电子科技大学
```

这会影响 school gate 判断。

所以实战里更稳的做法是：

- 草稿里不要回显学校名
- 筛选阶段先低频人工看一眼
- 后续把学校抽取规则继续收紧

### 边界 2：海外学校 allowlist 需要补

如果当前规则只覆盖：

- 国内 985 / 211
- 英国 G7
- 美国 Top 100

那像：

```text
南洋理工大学
```

就会被先跳过。

如果你的实际招聘范围包含新加坡、港校或更多海外学校，需要继续扩展策略文件。

### 边界 3：不要把“点击成功”当成“发送成功”

这是这次最关键的经验之一：

- 自动化里最容易误判的，不是选择器找不到
- 而是按钮点了，但平台没真正提交

所以所有发送脚本都应该有“发送后确认”逻辑，而不是只返回：

```json
{ "ok": true, "method": "click_send" }
```

## 11. 推荐的实际使用顺序

### 场景 A：先筛选，再打招呼

```bash
npm run screen-current-unread -- --top 5
npm run batch-greet-current-unread -- --top 5 --limit 1
npm run batch-greet-current-unread -- --top 5 --limit 1 --send true
```

### 场景 B：候选人回复后继续采集

先在 BOSS 页面手动选中目标聊天，然后：

```bash
npm run send-current-intake-request
```

等对方回完后，再跑：

```bash
npm run process-current-chat-intake
```

## 12. 最后的建议

如果你是第一次落地这一套，不要一上来就批量发。

更稳的顺序是：

1. 先确认 Browser Relay 接通
2. 先做只读筛选
3. 先发 1 条真实消息验证“真正送达”
4. 再逐步放大到 2-3 条
5. 再把信息采集和 Excel 落表串起来

这套流程的关键不是“自动化越多越好”，而是：

- 每一步都能验证
- 每一步都能停下来
- 每一步都知道自己到底是“写进输入框了”，还是“平台真的发出去了”
