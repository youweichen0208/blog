---
lang: zh-CN
title: 博客内容同步与附件规则
description: 约定 Obsidian 配置、图片附件路径和多端只读同步边界。
date: 2026-05-23
---

# 博客内容同步与附件规则

这篇文档记录当前博客的实际同步规则：电脑端 Obsidian 负责编辑，手机端 Obsidian 只读查看，GitHub 作为内容真源，GitHub Pages 负责发布网页。

## Obsidian 配置同步

当前策略：**选择性同步 `docs/.obsidian/`，但不同步设备工作区状态**。

原因：

- 手机端只读，但同步基础配置可以让电脑和手机看到一致的 Obsidian 设置。
- `.obsidian/workspace.json` 会记录当前打开文件、布局、侧边栏状态，多设备之间容易频繁冲突。
- `Obsidian Git` 插件配置可以同步，但手机端只读时要关闭自动提交和 push。

仓库 `.gitignore` 只忽略：

```text
docs/.obsidian/workspace.json
docs/.obsidian/workspace-mobile.json
```

也就是说，GitHub 会同步稳定的 Obsidian 设置，但不会同步每台设备自己的窗口布局。

当前建议同步：

```text
docs/.obsidian/app.json
docs/.obsidian/appearance.json
docs/.obsidian/core-plugins.json
docs/.obsidian/community-plugins.json
docs/.obsidian/plugins/obsidian-git/
```

当前建议忽略：

```text
docs/.obsidian/workspace.json
docs/.obsidian/workspace-mobile.json
```

## 本地 Obsidian 附件配置

当前电脑端 Obsidian 已设置：

```json
{
  "attachmentFolderPath": ".vitepress/public/images/posts/inbox",
  "newLinkFormat": "relative",
  "useMarkdownLinks": true,
  "alwaysUpdateLinks": true
}
```

含义：

- 新粘贴的图片先进入 `docs/.vitepress/public/images/posts/inbox/`。
- Obsidian 尽量使用 Markdown 链接，而不是 `![[图片.png]]` 这种 Wiki 链接。
- 移动或重命名笔记时，Obsidian 尽量自动更新内部链接。

注意：这份配置会上传 GitHub。手机端如果也使用同一份配置，需要把 `Obsidian Git` 设置成只 Pull，不自动 Commit，不 Push。

## 图片目录规则

图片统一放在 VitePress public 目录：

```text
docs/.vitepress/public/images/posts/
```

新粘贴的临时图片放：

```text
docs/.vitepress/public/images/posts/inbox/
```

整理后的正式图片放：

```text
docs/.vitepress/public/images/posts/YYYY/MM/
```

例如：

```text
docs/.vitepress/public/images/posts/2026/05/2026-05-23-obsidian-git-settings.png
```

文章里使用公开路径引用：

```markdown
![Obsidian Git 设置](/images/posts/2026/05/2026-05-23-obsidian-git-settings.png)
```

不要在最终文章里使用：

```markdown
![](.vitepress/public/images/posts/inbox/Pasted image.png)
![[Pasted image.png]]
```

这类链接在 Obsidian 里可能能看，但发布到 VitePress 后不够稳定。

## 图片命名规则

统一使用：

```text
YYYY-MM-DD-主题描述.png
```

示例：

```text
2026-05-23-obsidian-git-settings.png
2026-05-23-working-copy-pull.png
2026-05-23-github-actions-pages.png
```

命名要求：

- 使用英文或拼音。
- 全小写。
- 单词之间用 `-`。
- 不使用空格、中文标点或特殊符号。
- 同一篇文章多张图时，描述要能看出用途。

## 推荐图片工作流

写作时：

1. 在 Obsidian 里粘贴截图。
2. 图片先进入 `docs/.vitepress/public/images/posts/inbox/`。
3. 文章完成后，把图片移动到当月目录，例如 `docs/.vitepress/public/images/posts/2026/05/`。
4. 把图片文件名改成 `YYYY-MM-DD-主题描述.png`。
5. 把文章里的图片链接改成 `/images/posts/YYYY/MM/文件名`。
6. 本地执行构建检查：

```bash
npm run docs:build
```

## Git 同步边界

应该提交到 GitHub：

```text
docs/**/*.md
docs/.obsidian/app.json
docs/.obsidian/appearance.json
docs/.obsidian/core-plugins.json
docs/.obsidian/community-plugins.json
docs/.obsidian/plugins/obsidian-git/
docs/.vitepress/config.mjs
docs/.vitepress/public/images/
```

不应该提交到 GitHub：

```text
docs/.obsidian/workspace.json
docs/.obsidian/workspace-mobile.json
node_modules/
docs/.vitepress/cache/
docs/.vitepress/dist/
```

手机端只读时，同步路径是：

```text
电脑 Obsidian
  -> Git commit / push
  -> GitHub
  -> 手机端 Git 工具 pull
  -> 手机 Obsidian 查看
```

手机端不 commit、不 push，可以显著降低冲突概率。
