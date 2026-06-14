---
lang: zh-CN
title: Docker 与 Docker Compose 排障实战
description: 围绕容器、镜像、端口映射、日志和 docker compose 服务重启的常用排障命令。
date: 2026-06-14
tags:
  - Linux
  - Docker
  - Docker Compose
  - 排障
---

# Docker 与 Docker Compose 排障实战

这篇文章聚焦容器排障最常用的一组命令，尤其适合定位“请求到底打到了哪台容器”“端口是不是映射对了”“某个 WebDAV 服务是不是已经重启生效”这类问题。

## 1. 先看容器和端口映射

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
```

这一步最适合先确认：

- 某个容器是否真的在运行
- 端口是不是绑定到了预期地址
- 例如 `0.0.0.0:8080->80` 和 `127.0.0.1:18081->80` 的差别

## 2. 看服务是否是 docker compose 管的

```bash
cd /opt/obsidian-webdav
docker compose ps

cd /opt/blog-publish-webdav
docker compose ps
```

如果服务是 `docker compose` 管的，后续重启、重建和挂载配置都应该优先用 `docker compose`，不要直接手工 `docker run`。

## 3. 看容器日志，确认请求打到了哪里

```bash
docker logs --since 10m obsidian-webdav
docker logs --since 10m blog-publish-webdav
```

如果只想看最近几十行：

```bash
docker logs --tail=200 obsidian-webdav
docker logs --tail=200 blog-publish-webdav
```

这一步在真实排查里非常关键，因为它能直接回答：

- GitHub Actions 还在不在打旧地址
- 手机端 Obsidian 当前到底在写哪个远端路径
- WebDAV 客户端有没有在发 `PROPFIND`、`PUT`、`MKCOL`

## 4. 进入容器内部看配置

```bash
docker exec obsidian-webdav sh -lc 'find /usr/local/apache2/conf -maxdepth 2 -type f | sort'
docker exec obsidian-webdav sh -lc 'sed -n "1,220p" /usr/local/apache2/conf/conf-enabled/dav-root.conf'
docker exec blog-publish-webdav sh -lc 'sed -n "1,220p" /usr/local/apache2/conf/conf-enabled/dav-depth-infinity.conf'
```

这个场景特别适合确认两类修复有没有真的生效：

- `DirectoryIndex disabled`
- `DavDepthInfinity On`

## 5. 重启单个 compose 服务

```bash
cd /opt/obsidian-webdav
docker compose up -d

cd /opt/blog-publish-webdav
docker compose up -d
```

如果只是配置挂载或容器定义变了，通常不需要重启整台服务器，也不需要影响不相关的容器。

## 6. 看容器元数据和挂载点

```bash
docker inspect obsidian-webdav
docker inspect blog-publish-webdav
```

如果只想看启动命令和挂载：

```bash
docker inspect blog-publish-webdav --format '{{json .Config.Cmd}} {{json .Config.Entrypoint}} {{json .Mounts}}'
```

这一步适合定位：

- 到底挂载了哪个宿主机目录
- 配置文件是不是已经进容器
- 容器入口程序到底是不是你以为的那个

## 7. 一次实战中的最小判断顺序

遇到“配置好像改了但行为没变”的情况，我更推荐按这个顺序查：

1. `docker ps` 看端口和容器名
2. `docker compose ps` 看 compose 服务状态
3. `docker logs --since 10m <container>` 看最近请求
4. `docker exec <container> sh -lc ...` 看容器内实际配置
5. 最后再决定要不要 `docker compose up -d`
