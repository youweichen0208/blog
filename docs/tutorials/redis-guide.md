---
lang: zh-CN
title: Redis 实战：服务器部署、日常使用与可观测性
description: 从安装、配置、数据类型到 INFO/SLOWLOG/MONITOR/redis-benchmark 的完整 Redis 运维与观测指南。
date: 2026-07-05
tags:
  - Redis
  - 缓存
  - 运维
  - 可观测性
---

# Redis 实战：服务器部署、日常使用与可观测性

> **适用场景**：在云服务器上部署 Redis 作为缓存或队列，日常用 `redis-cli` 操作数据，并通过 `INFO`、`SLOWLOG`、`MONITOR`、`redis-benchmark` 观测运行状态。
>
> **前置阅读**：[systemd 与 systemctl 实战](../linux/systemd-systemctl.md) 介绍服务启停与日志，本文复用这套体系管理 `redis-server`。

## 1. Redis 是什么

Redis（**Re**mote **Di**ctionary **S**erver）是一个**基于内存、单线程（命令执行）、支持持久化**的键值数据库。因为数据常驻内存且 IO 模型基于 epoll，单实例 QPS 通常能到 8–10 万。

核心特征：

| 特征 | 说明 |
|------|------|
| **内存存储** | 读写都在内存，延迟通常亚毫秒级 |
| **单线程命令执行** | 避免锁竞争，命令天然原子；瓶颈在内存与网络而非 CPU |
| **多数据结构** | 不只是 KV，还支持 string / list / hash / set / zset / stream 等 |
| **可持久化** | RDB（快照）+ AOF（追加日志），重启后数据不丢 |
| **可选主从/哨兵/集群** | 高可用与水平扩展 |

### 1.1 命名惯例：`redis-server` vs `redis-cli`

和 `sshd`、`mysqld` 一样，Redis 也按 Unix 惯例拆成两端：

- **`redis-server`**：服务端守护进程，常驻内存，监听端口（默认 6379）。
- **`redis-cli`**：客户端命令行工具，用来连服务端、发命令、做调试。

日常说的"连一下 Redis"，指的就是用 `redis-cli` 连 `redis-server`。

## 2. 在服务器上安装 Redis

下面给两条最小路径：**包管理器直装**（适合快速试用）和 **Docker 部署**（适合生产隔离）。生产环境推荐后者或源码编译，便于控制版本与配置。

### 2.1 包管理器安装（Debian/Ubuntu）

```bash
# Debian/Ubuntu
sudo apt update
sudo apt install -y redis-server

# 验证
redis-server --version
redis-cli --version
```

安装后 systemd 会自动拉起服务：

```bash
sudo systemctl status redis-server
sudo systemctl enable --now redis-server   # 设置开机自启
```

### 2.2 Docker 部署（推荐生产）

```bash
# 拉指定版本，避免 latest 漂移
docker run -d \
  --name redis \
  --restart unless-stopped \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine \
  redis-server --requirepass "YOUR_STRONG_PASSWORD" --appendonly yes
```

关键参数：

| 参数 | 含义 |
|------|------|
| `-v redis-data:/data` | 持久化文件挂到 named volume，容器重建不丢 |
| `--requirepass` | 启动时设置访问密码 |
| `--appendonly yes` | 开启 AOF 持久化 |

> ⚠️ **安全警告**：Redis 默认监听 `127.0.0.1`。一旦绑定 `0.0.0.0` 暴露到公网，**必须**同时设置 `requirepass` 或 `bind` + 防火墙，否则会被扫描器当作未授权 Redis 入侵，历史上多次被用来写 SSH 公钥、挖矿。详见第 5 节。

### 2.3 连接验证

```bash
# 本机直连
redis-cli ping              # 返回 PONG 即正常

# 带密码
redis-cli -a "YOUR_STRONG_PASSWORD" ping

# 指定远程主机
redis-cli -h 10.0.0.5 -p 6379 -a "YOUR_STRONG_PASSWORD" ping
```

## 3. 日常使用：数据类型与命令

Redis 的强大来自"不只是字符串 KV"。下面按数据结构给出最小可用命令集。

### 3.1 String（字符串）

最基础的类型，value 是二进制安全的字节串，最大 512MB。常用于缓存 JSON、计数器、分布式锁。

```bash
SET user:1 '{"name":"alice","age":30}'     # 写
GET user:1                                  # 读
INCR counter:home                           # 原子自增（计数器）
SETEX token:abc 3600 "valid"                # 3600 秒后自动过期
TTL token:abc                               # 查剩余生存时间（秒）
DEL user:1                                  # 删除
```

### 3.2 Hash（哈希）

value 是字段→值的映射，适合存对象，比把整个 JSON 当 String 更省内存、可局部更新。

```bash
HSET user:1 name alice age 30
HGET user:1 name
HGETALL user:1
HINCRBY user:1 age 1                        # 年龄 +1
```

### 3.3 List（列表）

双向链表，适合消息队列、最近访问记录。

```bash
LPUSH queue:email "job-1"                   # 左端入队
RPUSH queue:email "job-2"                   # 右端入队
LPOP queue:email                            # 左端出队（消费）
LRANGE queue:email 0 -1                     # 查看全部
LLEN queue:email                            # 队列长度
```

### 3.4 Set（无序集合）与 ZSet（有序集合）

Set 用于去重、标签；ZSet 带 score，用于排行榜、延迟队列。

```bash
# Set
SADD tags:1 redis cache
SMEMBERS tags:1
SISMEMBER tags:1 redis

# ZSet：score 排序
ZADD leaderboard 100 alice 85 bob 92 carol
ZREVRANGE leaderboard 0 2 WITHSCORES       # 取前 3，分数从高到低
ZSCORE leaderboard alice
```

### 3.5 通用键管理

```bash
EXISTS user:1                               # 键是否存在（1/0）
EXPIRE user:1 60                            # 设置 60 秒过期
PERSIST user:1                              # 移除过期（持久化）
TYPE user:1                                 # 查看数据类型
KEYS user:*                                 # ⚠️ 阻塞，生产禁用，用 SCAN
SCAN 0 MATCH user:* COUNT 100               # 游标式遍历，不阻塞
DBSIZE                                      # 当前库 key 数量
FLUSHDB                                     # ⚠️ 清空当前库，生产慎用
```

> **为什么生产禁用 `KEYS`**：`KEYS` 会一次性遍历整个键空间，单线程模型下会阻塞所有其他命令。用 `SCAN` 替代，它分批返回、不阻塞。

## 4. 配置与持久化

### 4.1 关键配置项

包管理器安装的配置文件在 `/etc/redis/redis.conf`，Docker 安装则通过启动参数传入。需要重点关注的几项：

| 配置项 | 默认值 | 生产建议 |
|--------|--------|----------|
| `bind` | `127.0.0.1` | 仅本机访问保持默认；跨机访问绑定内网 IP |
| `protected-mode` | `yes` | 保持开启，禁止公网未授权访问 |
| `port` | `6379` | 必要时改非标准端口减少扫描 |
| `requirepass` | 空 | 跨网访问必设强密码 |
| `maxmemory` | 0（不限） | 必设上限，防止 OOM 拖垮整机 |
| `maxmemory-policy` | `noeviction` | 缓存场景用 `allkeys-lru` |
| `appendonly` | `no` | 数据重要则开 `yes` |
| `dir` | `/var/lib/redis` | 持久化文件目录，确保磁盘足够 |

### 4.2 内存淘汰策略（maxmemory-policy）

当内存达到 `maxmemory` 上限时的处理策略，缓存和数据库的取舍不同：

| 策略 | 含义 | 适用场景 |
|------|------|----------|
| `noeviction` | 写入直接报错，不淘汰 | 当数据库用，数据不能丢 |
| `allkeys-lru` | 全键空间淘汰最久未用 | **纯缓存首选** |
| `volatile-lru` | 仅淘汰设了过期的键 | 混合场景 |
| `allkeys-lfu` | 淘汰使用频率最低的 | 访问模式偏长尾 |

### 4.3 持久化：RDB 与 AOF

两种机制可以单独或组合使用：

- **RDB（快照）**：周期性把内存全量 dump 成 `dump.rdb`。体积小、恢复快，但宕机会丢最近一次快照后的写入。
- **AOF（追加日志）**：每条写命令追加到 `appendonly.aof`。数据更全，可配 `appendfsync everysec`（每秒刷盘，最多丢 1 秒）。

```conf
# redis.conf 节选
save 900 1            # 900 秒内至少 1 个变更则触发 RDB
appendonly yes
appendfsync everysec
```

### 4.4 改完配置如何生效

```bash
# 包管理器安装：改 /etc/redis/redis.conf 后重启服务
sudo systemctl restart redis-server

# Docker：重建容器或挂载自定义配置
docker restart redis

# 运行时热加载部分配置（不重启）
redis-cli -a "PASS" CONFIG SET maxmemory 512mb
redis-cli -a "PASS" CONFIG SET maxmemory-policy allkeys-lru
redis-cli -a "PASS" CONFIG REWRITE      # 把运行时配置写回文件
```

## 5. 安全基线

Redis 历史上有大量因配置不当导致的入侵案例。生产环境至少做到：

1. **不要监听公网**：`bind` 只写内网 IP，配合安全组/防火墙只放行可信来源。
2. **必须设密码**：`requirepass` 用长随机串；客户端用 `-a` 或 `AUTH` 命令认证。
3. **关闭危险命令**：生产环境禁用 `FLUSHALL`、`CONFIG`、`KEYS`，避免误操作或被利用。
   ```conf
   rename-command FLUSHALL ""
   rename-command CONFIG   ""
   rename-command KEYS     ""
   ```
4. **以非 root 用户运行**：包管理器安装默认用 `redis` 用户，Docker 也别用 root 跑业务进程。
5. **磁盘只放数据**：`dir` 指向专用目录，权限 `redis:redis 700`，防止利用 Redis 写 SSH 公钥到 `~/.ssh/`。

## 6. 可观测性：怎么"看见"Redis 在干什么

这是本文的重点。Redis 自带一套非常完整的自省命令，不需要装额外监控就能回答四个问题：**还活着吗？内存够吗？有没有慢命令？谁在连我？**

### 6.1 健康检查：`PING` 与 `INFO`

```bash
redis-cli -a "PASS" ping                # PONG = 活着
redis-cli -a "PASS" info                # 全量信息（很长）
```

`INFO` 太长，按段查更实用：

```bash
redis-cli info server      # 版本、进程、运行时长
redis-cli info clients     # 当前连接数
redis-cli info memory      # 内存使用
redis-cli info stats       # 命令统计、QPS、网络
redis-cli info persistence # RDB/AOF 状态
redis-cli info replication # 主从复制
redis-cli info keyspace    # 各库 key 数与命中率
```

### 6.2 内存观测

最常需要排查的是"内存涨到哪去了"。

```bash
# 关键字段
redis-cli info memory | grep -E "used_memory_human|used_memory_peak_human|maxmemory_human|maxmemory_policy|mem_fragmentation_ratio"
```

| 字段 | 含义 |
|------|------|
| `used_memory_human` | 实际分配给数据的内存 |
| `used_memory_peak_human` | 历史峰值 |
| `maxmemory_human` | 配置的上限（0 表示不限） |
| `maxmemory_policy` | 达到上限时的淘汰策略 |
| `mem_fragmentation_ratio` | `used_memory_rss / used_memory`，>1.5 说明碎片多，可考虑重启或 `activedefrag` |

逐键查内存占用（非常实用，定位"哪个 key 吃了几 G 内存"）：

```bash
redis-cli --bigkeys                 # 采样找出各类型最大的 key
redis-cli --memkeys                # 采样找出最占内存的 key
redis-cli memory usage user:1      # 查单个 key 占用字节数
```

### 6.3 慢查询：`SLOWLOG`

Redis 把执行时间超过 `slowlog-log-slower-than`（默认 10ms）的命令记进慢日志。这是定位"偶发卡顿"的第一现场。

```bash
redis-cli slowlog get 10           # 最近 10 条慢命令
redis-cli slowlog len              # 当前慢日志条数
redis-cli slowlog reset            # 清空
```

输出每条包含：唯一 ID、执行时间戳、耗时（微秒）、命令原文、客户端地址。

> 注意：慢日志只记**命令执行**耗时，不含网络排队。如果客户端感觉慢但 SLOWLOG 是空的，瓶颈多半在网络或客户端连接池，见 6.6。

### 6.4 实时窥探：`MONITOR`

`MONITOR` 把服务端收到的**每一条命令**实时打印出来，调试时极有用，但会显著影响性能，**生产环境只用秒级采样，别长开**。

```bash
redis-cli monitor                  # 实时打印所有命令
# 退出按 Ctrl+C
```

典型用途：本地复现时看"应用到底发了哪些命令、顺序对不对"。

### 6.5 客户端连接：`CLIENT LIST`

```bash
redis-cli client list              # 所有连接：地址、空闲时长、当前命令、库名
redis-cli client getname           # 当前连接的名字（应用可设置便于排查）
redis-cli info clients             # 连接数摘要：connected_clients、blocked_clients
```

排查"连接泄漏"时重点看 `idle`（空闲秒数）和 `age`（连接存活秒数），长期不释放的连接多半是客户端连接池没配好。

### 6.6 吞吐与延迟：`redis-benchmark` 与 `--latency`

```bash
# 基准测试：在服务端打压力，看 QPS 与平均延迟
redis-benchmark -h 127.0.0.1 -p 6379 -a "PASS" -n 100000 -c 50 -t set,get

# 持续测延迟（毫秒级，Ctrl+C 退出）
redis-cli --latency

# 延迟历史分布，看是否有毛刺
redis-cli --latency-history -i 1
```

`redis-benchmark` 输出会给出 `== SET: ... requests per second ==` 与百分位延迟，用于容量评估和回归对比。

### 6.7 键空间命中率

```bash
redis-cli info keyspace
# db0:keys=1000,expires=500,avg_ttl=3600000
```

应用侧更关心命中率，可以从 `INFO stats` 算：

```bash
redis-cli info stats | grep -E "keyspace_hits|keyspace_misses"
```

`keyspace_hits / (keyspace_hits + keyspace_misses)` 即命中率。缓存场景命中率长期低于 90% 通常意味着淘汰策略或过期时间需要调整。

### 6.8 把观测串起来：一次"Redis 变慢"排查流程

```
应用反馈 Redis 慢
    │
    ├─ redis-cli --latency          # 先看端到端延迟是否真的高
    │
    ├─ redis-cli info memory        # 是否逼近 maxmemory、碎片率是否 >1.5
    │   └─ 接近上限 → 看淘汰策略 / 大 key
    │
    ├─ redis-cli --bigkeys          # 是否有单 key 占用过大
    │
    ├─ redis-cli slowlog get 20     # 有没有慢命令
    │   └─ 有 → 看是 KEYS/SMEMBERS 大集合还是 O(N) 命令
    │
    ├─ redis-cli info clients       # 连接数是否暴涨
    │
    └─ redis-cli monitor（秒级采样）  # 命令模式是否异常（如疯狂 KEYS）
```

## 7. 备份与恢复

```bash
# 触发 RDB 快照（后台执行，不阻塞）
redis-cli -a "PASS" BGSAVE

# 查最近一次 RDB 状态
redis-cli -a "PASS" LASTSAVE

# 备份文件
ls -lh /var/lib/redis/dump.rdb
sudo cp /var/lib/redis/dump.rdb /backup/dump.$(date +%F).rdb
```

恢复流程：停服 → 替换 `dump.rdb`（或 `appendonly.aof`）→ 启动，Redis 会自动加载。**操作前先备份当前文件**，避免覆盖坏数据。

## 8. 常见错误速查

| 现象 | 可能原因 | 排查命令 |
|------|----------|----------|
| `(error) NOAUTH` | 没带密码 | `redis-cli -a "PASS"` |
| `MISCONF Redis is configured to save RDB...` | 磁盘满或权限不对，写 RDB 失败 | `df -h`、检查 `dir` 权限 |
| `OOM command not allowed` | 触达 `maxmemory` 且策略是 `noeviction` | `info memory`、调策略或扩容 |
| 客户端大量 `TIMEOUT` | 网络抖动、阻塞命令、连接池耗尽 | `slowlog get`、`client list` |
| 内存涨但 `used_memory` 不高 | 碎片或客户端输出缓冲区堆积 | `mem_fragmentation_ratio`、`info clients` |

## 9. 小结

- **部署**：生产用 Docker 或源码编译锁定版本，包管理器安装适合快速试用。
- **配置**：`bind` + `requirepass` + `maxmemory` + 淘汰策略是四条安全与稳定基线。
- **使用**：按数据结构选类型，生产禁用 `KEYS`，用 `SCAN` 替代。
- **观测**：`INFO` 看全局、`SLOWLOG` 抓慢命令、`MONITOR` 看实时流量、`--bigkeys` 找大 key、`redis-benchmark` 测容量。
- **安全**：不暴露公网、设密码、关危险命令、非 root 运行。

## 相关专栏

- [systemd 与 systemctl 实战](../linux/systemd-systemctl.md) - 管理 `redis-server` 服务、看 journalctl 日志
- [Docker 与 Docker Compose 排障实战](../linux/docker-compose-ops.md) - 用容器跑 Redis 时的排障思路
- [技术教程](./) - VPS 部署、CI/CD 等工程实践
