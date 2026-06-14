---
lang: zh-CN
title: 文件与目录排查实战
description: 围绕 ls、find、rm、目录结构确认和从 Git 重导入原始内容的文件系统排障命令。
date: 2026-06-14
tags:
  - Linux
  - 文件系统
  - find
  - rm
  - 排障
---

# 文件与目录排查实战

当同步路径错乱、远端目录被污染、或者你不确定“到底哪一份才是该保留的内容”时，最重要的不是先删，而是先把目录结构看清楚。

## 1. 先看目录顶层结构

```bash
ls -la /opt/obsidian-webdav
ls -la /opt/obsidian-webdav/data
ls -la /opt/obsidian-webdav/data/data
```

这一步适合快速确认：

- 哪一层是真正挂到容器里的数据目录
- 有没有 `index.html`、`404.html` 这类明显不该出现在同步根里的静态文件
- 当前到底是 `blog/` 还是 `docs/blog/` 在被使用

## 2. 用 find 看目录树，但先收窄范围

```bash
find /opt/obsidian-webdav/data/data -maxdepth 2 \( -type f -o -type d \) | sort
find /opt/obsidian-webdav/data/data/docs/blog -maxdepth 2 \( -type f -o -type d \) | sort
```

排障时不要一上来就扫整棵大目录。先限制 `maxdepth`，能更快看出结构问题。

## 3. 看最近变动的文件

```bash
find /opt/obsidian-webdav/data/data/docs -type f -mmin -20 | sort
find /opt/obsidian-webdav/data/data/docs -type d -mmin -20 | sort
```

这一步很适合判断：

- 手机刚刚同步上来的东西到底落到了哪里
- 最近是哪个子目录在被写入
- 新文件是不是进入了你预期的 Vault 根

## 4. 安全清空同步数据，但保留配置

```bash
find /opt/obsidian-webdav/data/data -mindepth 1 -maxdepth 1 -exec rm -rf {} +
```

这条命令只清空同步数据目录，不会删掉：

- `docker-compose.yml`
- Apache 配置片段
- Nginx 站点配置
- 证书文件

适用场景：

- 远端数据已经乱了，决定整体重建
- 想保留 WebDAV 服务本身，只重置同步内容

## 5. 删除旧副本，而不是保留两套近似目录

例如当真正保留的是：

```text
/opt/obsidian-webdav/data/data/docs/blog
```

而顶层旧副本：

```text
/opt/obsidian-webdav/data/data/blog
```

已经不再使用时，可以直接删除旧副本：

```bash
rm -rf /opt/obsidian-webdav/data/data/blog
```

排障里最怕“看起来两份都像真的”。目录一旦确认，旧副本就应该清掉。

## 6. 从 Git 重新导入受版本控制的原始内容

```bash
git -C /path/to/blog archive --format=tar HEAD docs   | ssh your-server 'mkdir -p /opt/obsidian-webdav/data/data/docs/blog && tar -xf - --strip-components=1 -C /opt/obsidian-webdav/data/data/docs/blog'
```

这一步的好处是：

- 只导入 Git 跟踪的原始内容
- 不会把 `node_modules`、`.git`、本地缓存带上去
- 很适合在“目录清空后重建远端”这个场景里使用

## 7. 一次实战中的最小判断顺序

如果你怀疑远端目录错了，先按这个顺序查：

1. `ls -la` 看顶层结构
2. `find -maxdepth 2` 看子目录分布
3. `find -mmin` 看最近到底写到了哪里
4. 再决定是删单个旧副本，还是清空整棵同步根
5. 最后再考虑从 Git 重导入
