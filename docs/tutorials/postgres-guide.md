---
lang: zh-CN
title: PostgreSQL 实战：Linux 部署、日常使用与可观测性
description: 从 apt 安装、角色/库/表操作、配置调优到 pg_stat/pg_stat_statements/日志的完整 PostgreSQL 运维与观测指南。
date: 2026-07-05
tags:
  - PostgreSQL
  - 数据库
  - Linux
  - 运维
  - 可观测性
---

# PostgreSQL 实战：Linux 部署、日常使用与可观测性

> **适用场景**：在 Linux 服务器上部署 PostgreSQL 作为业务数据库，日常用 `psql` 操作库表，并通过 `pg_stat_*` 视图、`pg_stat_statements` 和日志定位性能问题。
>
> **前置阅读**：[systemd 与 systemctl 实战](../linux/systemd-systemctl.md) 介绍服务启停与日志，本文复用这套体系管理 `postgresql` 服务；[Redis 实战](./redis-guide.md) 是同系列的"缓存+观测"对照篇。

## 1. PostgreSQL 是什么

PostgreSQL（常简称 **Postgres**）是一个**开源、对象关系型、强调标准与扩展性**的数据库。和 MySQL 的定位类似——都是磁盘型关系数据库、用 SQL 操作——但 Postgres 在复杂查询、事务一致性、丰富数据类型（JSONB、数组、地理 PostGIS、全文检索）上更突出，被很多 OLTP 和混合场景选作主库。

和 Redis 的根本区别先理清，避免混用：

| 维度 | Redis | PostgreSQL |
|------|-------|------------|
| **存储介质** | 数据常驻内存，可持久化 | 数据在磁盘，按页缓存到 `shared_buffers` |
| **数据模型** | 键值 + 少量结构 | 关系表 + SQL，支持 JSONB/数组/地理等 |
| **一致性** | 单线程原子，无跨键事务 | 严格 ACID，MVCC 并发 |
| **典型角色** | 缓存、队列、计数器 | 业务主库、复杂分析 |

经验法则：**能丢可重建的数据放 Redis，必须可靠、要查询的数据放 Postgres**。两者常配套使用：Postgres 当真源，Redis 做缓存层。

### 1.1 命名惯例：`postgres` vs `psql`

Postgres 的进程和工具命名和 `redis-server`/`redis-cli` 是同一个思路：

- **`postgres`**：服务端主进程（守护进程），监听端口（默认 5432），管理数据文件。
- **`psql`**：客户端命令行工具，连服务端、发 SQL、做调试。
- **`postmaster`**：早期对服务端主进程的称呼，新版已统一叫 `postgres`，但日志/文档里还能见到。

日常说的"连一下数据库"，就是用 `psql` 连 `postgres` 服务端。

### 1.2 角色、数据库、Schema、表的关系

Postgres 的组织层次容易把新手绊倒，先一次讲清：

```
集群（一个 postgres 实例）
└── 数据库（database，CREATE DATABASE）
    └── schema（默认 public）
        └── 表 / 视图 / 函数 ...
```

- **角色（role）**：Postgres 把"用户"和"组"统一成 role，能登录的 role 就相当于用户（`LOGIN` 属性）。
- **数据库**：彼此隔离，连库时必须指定一个。
- **schema**：库内的命名空间，默认 `public`。多租户或模块化时常用 schema 分隔。
- **模板库**：`template1` 是新建数据库的默认模板，`postgres` 库是默认 maintenance 库，常用来"先连上去再建业务库"。

## 2. 在 Linux 上安装 PostgreSQL

### 2.1 包管理器安装（Debian/Ubuntu）

Debian/Ubuntu 官方源带 Postgres，但版本可能偏旧。要装新版本，加 PostgreSQL 官方 APT 仓库（PGDG）：

```bash
# 快速版：直接用系统源（版本较旧但够用）
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# 推荐版：加官方仓库拿新版本
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/pgdg.gpg
sudo apt update
sudo apt install -y postgresql-16
```

安装后会自动创建：

- **`postgres` 系统用户**：服务进程以这个用户跑，家目录 `/var/lib/postgresql`。
- **`postgres` 数据库角色**：超级用户，只能从本机用 peer 认证登录。
- **systemd 服务**：`postgresql.service`。
- **数据目录**：`/var/lib/postgresql/<版本>/main/`。
- **配置目录**：`/etc/postgresql/<版本>/main/`。

```bash
# 服务管理
sudo systemctl enable --now postgresql
sudo systemctl status postgresql
sudo systemctl restart postgresql
```

### 2.2 Docker 部署（隔离/多版本）

```bash
docker run -d \
  --name pg \
  --restart unless-stopped \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD="YOUR_STRONG_PASSWORD" \
  -e POSTGRES_DB=appdb \
  -e POSTGRES_USER=app \
  -v pg-data:/var/lib/postgresql/data \
  postgres:16-alpine
```

`POSTGRES_*` 环境变量只在数据目录为空（首次启动）时生效，之后改密码要在 SQL 里 `ALTER ROLE`。

### 2.3 连接验证

包管理器安装默认只监听本地，且对系统用户 `postgres` 用 peer 认证（免密）：

```bash
# 切到 postgres 用户，再连
sudo -u postgres psql

# 直接以 postgres 角色连（peer 认证要求当前系统用户也叫 postgres）
sudo -u postgres psql -d postgres
```

进入 `psql` 后：

```sql
-- 看版本与连接信息
SELECT version();
\conninfo

-- 退出
\q
```

## 3. 日常使用：角色、库、表

### 3.1 角色管理

```sql
-- 创建可登录的业务角色
CREATE ROLE app WITH LOGIN PASSWORD 'YOUR_STRONG_PASSWORD';

-- 改密码
ALTER ROLE app WITH PASSWORD 'new-password';

-- 创建只读角色（用于报表/分析）
CREATE ROLE app_reader LOGIN PASSWORD 'read-only-pass';

-- 列出所有角色
\du
```

### 3.2 数据库管理

```sql
CREATE DATABASE appdb OWNER app;
DROP DATABASE appdb;          -- ⚠️ 库必须为空连接才能删
ALTER DATABASE appdb OWNER TO app;

-- 列出所有库
\l
```

切换数据库（psql 内）：

```sql
\c appdb
```

命令行直接连业务库：

```bash
psql -h 127.0.0.1 -p 5432 -U app -d appdb
# 回车后输密码
```

### 3.3 表与权限

```sql
-- 建表
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,             -- BIGSERIAL = 自增主键
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()  -- TIMESTAMPTZ 带时区，推荐
);

-- 插入
INSERT INTO users (name, email) VALUES ('alice', 'a@x.com');

-- 查询
SELECT * FROM users ORDER BY id DESC LIMIT 10;

-- 用占位符查（psql 变量）
SELECT * FROM users WHERE name = :'name';
```

把库内表的权限赋给业务角色：

```sql
-- 赋读写
GRANT CONNECT ON DATABASE appdb TO app;
GRANT USAGE ON SCHEMA public TO app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app;  -- 自增序列也要授权

-- 只读角色
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_reader;

-- 让未来新建的表也自动带上权限（很重要，否则每次建表都要重授）
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app;
```

### 3.4 JSONB：Postgres 的杀手锏

存半结构化数据不用上 MongoDB，Postgres 的 `JSONB` 类型支持索引和查询：

```sql
ALTER TABLE users ADD COLUMN meta JSONB DEFAULT '{}'::jsonb;

-- 写
UPDATE users SET meta = '{"tags":["vip"],"score":92}' WHERE name='alice';

-- 查（操作符 @> 表示"包含"）
SELECT name FROM users WHERE meta @> '{"tags":["vip"]}';

-- 建 GIN 索引加速 JSONB 查询
CREATE INDEX ON users USING gin (meta);
```

### 3.5 psql 常用反斜杠命令

`psql` 的反斜杠命令是日常运维的快捷方式：

| 命令 | 作用 |
|------|------|
| `\l` | 列出所有数据库 |
| `\du` | 列出所有角色 |
| `\c db` | 切换到 db |
| `\dt` | 列出当前库的表 |
| `\d tbl` | 查看表结构（列、索引、约束） |
| `\dn` | 列出 schema |
| `\df` | 列出函数 |
| `\dx` | 列出已安装扩展 |
| `\x` | 切换"扩展显示"模式（宽表竖着看） |
| `\timing` | 开关 SQL 执行计时 |
| `\q` | 退出 |
| `\?` | 查看所有反斜杠命令 |
| `\h SQL` | 查看某条 SQL 语法帮助 |

## 4. 配置与连接认证

### 4.1 两个关键配置文件

包管理器安装时位于 `/etc/postgresql/<版本>/main/`：

| 文件 | 作用 |
|------|------|
| `postgresql.conf` | 主配置：监听地址、内存、日志、超时等 |
| `pg_hba.conf` | 客户端认证策略：谁能从哪来、用什么方式认证 |
| `pg_ident.conf` | 把系统用户映射到数据库角色（peer/ident 用） |

### 4.2 postgresql.conf 高频项

```conf
# 监听地址：默认 localhost。要跨机访问改成内网 IP 或 *
listen_addresses = '127.0.0.1'
port = 5432

# 内存：核心三项，按机器内存调
shared_buffers = 256MB          # 共享缓冲池，建议总内存的 25%
effective_cache_size = 1GB      # 内核磁盘缓存的估算值，建议总内存的 50-75%
work_mem = 16MB                 # 每个排序/哈希的内存，调大减少落盘

# 日志
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_min_duration_statement = 500   # 慢查询阈值，单位毫秒（500ms 以上记日志）

# 连接
max_connections = 100
```

### 4.3 pg_hba.conf 认证策略

这是 Postgres 的"防火墙 + 认证"合一文件，规则**从上到下匹配，命中即停**：

```conf
# TYPE  DATABASE  USER  ADDRESS       METHOD
local   all       all                 peer          # 本机 socket：系统用户=角色名
host    all       all   127.0.0.1/32  scram-sha-256 # 本机 TCP：密码
host    all       app   10.0.0.0/24   scram-sha-256 # 内网某段：密码
# host all all 0.0.0.0/0 md5          # ⚠️ 千万别在公网放通
```

`METHOD` 常见取值：

| 方式 | 含义 |
|------|------|
| `peer` | 用操作系统用户身份认证（本机专用，最安全） |
| `scram-sha-256` | 加盐哈希密码（推荐，PG13+ 默认） |
| `md5` | 旧版密码哈希，建议升级到 scram |
| `trust` | 不认证直接放行，**只用于本机初始化调试** |
| `reject` | 显式拒绝 |

> ⚠️ **安全警告**：不要把 `trust` 或 `0.0.0.0/0` 放通到公网。跨机访问至少用 `scram-sha-256` + 内网 `ADDRESS` 限制 + 安全组只放行可信来源。

### 4.4 改完配置如何生效

```bash
# 不重启重载配置（绝大多数配置项）
sudo systemctl reload postgresql

# 需要重启才生效的（如 shared_buffers、max_connections）
sudo systemctl restart postgresql
```

SQL 内也能动态改（运行时生效，`reload` 会丢，要持久化得写进 `postgresql.conf` 或用 `ALTER SYSTEM`）：

```sql
ALTER SYSTEM SET work_mem = '32MB';   -- 写到 postgresql.auto.conf，下次启动仍生效
SELECT pg_reload_conf();              -- 立即重载
```

## 5. 可观测性：怎么"看见"Postgres 在干什么

和 Redis 一样，Postgres 自带一套非常完整的自省视图，能回答：**连接正常吗？哪条 SQL 慢？哪张表最大？锁等待严重吗？**

### 5.1 活跃连接与状态：`pg_stat_activity`

这是排查"数据库卡住了"的第一现场，每行代表一条连接：

```sql
SELECT pid, usename, application_name, client_addr,
       state, wait_event_type, wait_event,
       query, state_change
FROM pg_stat_activity
WHERE state IS DISTINCT FROM 'idle';
```

关键字段：

| 字段 | 含义 |
|------|------|
| `state` | `active`（正在执行）、`idle`（空闲）、`idle in transaction`（事务卡着没提交） |
| `wait_event_type` | 等待类型：`Lock`、`IO`、`LWLock` 等，定位瓶颈 |
| `query` | 当前正在执行的 SQL（`active`）或上一条（`idle`） |
| `state_change` | 状态变更时间，`idle in transaction` 久了多半是应用漏提交 |

**杀掉卡住的连接**（危险操作，确认后再用）：

```sql
SELECT pg_terminate_backend(<pid>);    -- 温和终止
SELECT pg_cancel_backend(<pid>);       -- 仅取消当前查询，不断连接
```

### 5.2 慢查询统计：`pg_stat_statements`

这是 Postgres 性能调优最重要的扩展，**统计每条 SQL 的调用次数、总耗时、平均耗时、IO、行数**。默认没启用，要开一次：

```bash
# 1. 改配置启用扩展
sudo -u postgres psql -c "ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements'"
sudo systemctl restart postgresql
```

```sql
-- 2. 在目标库创建扩展（每个库都要建一次）
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 3. 查最耗时的 10 条 SQL
SELECT query, calls, total_exec_time, mean_exec_time,
       rows, shared_blks_hit, shared_blks_read
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- 4. 查平均耗时最高的（单次慢）
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 5. 重置统计（做前后对比时常用）
SELECT pg_stat_statements_reset();
```

> 和 Redis `SLOWLOG` 的区别：`SLOWLOG` 是"单次超过阈值的命令列表"，`pg_stat_statements` 是"按 SQL 形态聚合的累计统计"。两者互补——前者看偶发，后者看高频与累计。

### 5.3 表与索引使用：`pg_stat_user_tables` / `pg_stat_user_indexes`

```sql
-- 哪些表被顺序扫描最多（可能缺索引）
SELECT relname, seq_scan, seq_tup_read, idx_scan
FROM pg_stat_user_tables
ORDER BY seq_tup_read DESC LIMIT 10;

-- 哪些索引从未被用（候选删除对象）
SELECT relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC LIMIT 10;
```

### 5.4 锁等待：`pg_locks`

会话互相等锁时会拖垮整库。查"谁在等谁"：

```sql
SELECT
  blocked.pid     AS blocked_pid,
  blocked.query   AS blocked_query,
  blocking.pid    AS blocking_pid,
  blocking.query  AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking
  ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE blocked.wait_event_type = 'Lock';
```

### 5.5 体积与膨胀：`pg_database_size` / `pg_table_size` / 死元组

Postgres 的 UPDATE 是"删旧写新"，长期高频更新会留下大量**死元组（dead tuples）**占用空间，靠 `VACUUM` 回收。

```sql
-- 各库大小
SELECT datname, pg_size_pretty(pg_database_size(datname))
FROM pg_database ORDER BY pg_database_size(datname) DESC;

-- 当前库最大的表（含索引）
SELECT relname,
       pg_size_pretty(pg_total_relation_size(relid)) AS total,
       pg_size_pretty(pg_relation_size(relid))       AS table_only
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;

-- 死元组比例（膨胀严重的表需要 VACUUM/ANALYZE）
SELECT relname, n_live_tup, n_dead_tup,
       round(n_dead_tup::numeric / NULLIF(n_live_tup,0) * 100, 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY dead_pct DESC LIMIT 10;
```

### 5.6 慢查询日志

在 `postgresql.conf` 设了 `log_min_duration_statement = 500` 后，超过 500ms 的 SQL 会写到日志：

```bash
# 包管理器安装的日志位置
ls /var/log/postgresql/
# 或数据目录下的 log/
ls /var/lib/postgresql/<版本>/main/log/

# 看慢查询
sudo tail -f /var/log/postgresql/postgresql-*.log | grep -E "duration|statement"

# 也可走 journalctl（取决于配置）
sudo journalctl -u postgresql -f
```

### 5.7 一次"数据库变慢"排查流程

```
应用反馈数据库慢
    │
    ├─ pg_stat_activity            # 先看连接：active 多少？有没有 idle in transaction？
    │   └─ 有 idle in transaction → 应用漏提交/回滚，pg_terminate_backend 兜底
    │
    ├─ pg_stat_statements          # 哪条 SQL 累计最耗时
    │   └─ 高频低效 → EXPLAIN ANALYZE 看执行计划，加索引或改写
    │
    ├─ pg_stat_user_tables         # seq_scan 高的表，是否缺索引
    │
    ├─ 锁等待查询                  # 有没有 blocked → blocking 链
    │
    ├─ 死元组比例                  # 膨胀严重 → VACUUM (VERBOSE) ANALYZE
    │
    └─ 慢查询日志                  # 时间点对齐，看是不是某次发布后才开始
```

## 6. 备份与恢复

```bash
# 逻辑备份：dump 成 SQL 文本（跨版本可移植）
pg_dump -h 127.0.0.1 -U app appdb > appdb-$(date +%F).sql

# 自定义压缩格式（恢复更快，推荐）
pg_dump -Fc -h 127.0.0.1 -U app appdb -f appdb-$(date +%F).dump

# 备份全集群（所有库）
sudo -u postgres pg_dumpall > all-$(date +%F).sql

# 恢复（先建空库）
createdb -h 127.0.0.1 -U app appdb_new
pg_restore -h 127.0.0.1 -U app -d appdb_new appdb-xxxx.dump
```

生产更推荐**物理备份**（`pg_basebackup` + WAL 归档，可做时间点恢复 PITR），适合大数据量：

```bash
pg_basebackup -h 127.0.0.1 -U replicator -D /backup/base -Fp -Xs -P
```

## 7. 日常维护

```sql
-- 手动回收死元组并更新统计（PG13+ 默认 autovacuum，但大批量更新后可手动）
VACUUM (VERBOSE, ANALYZE) users;

-- 重建表与索引，回收物理空间（会锁表，生产用 CONCURRENTLY 版本）
REINDEX TABLE users;
REINDEX INDEX CONCURRENTLY users_email_idx;  -- 不锁表，慢但不阻塞业务

-- 分析表，让优化器有最新统计
ANALYZE users;
```

`autovacuum` 默认开启，正常情况下不用手动 `VACUUM`。但**大批量 DELETE/UPDATE 之后**，手动跑一次能更快回收空间。

## 8. 常见错误速查

| 现象 | 可能原因 | 解决 |
|------|----------|------|
| `peer authentication failed` | 用 `psql -U app` 但系统用户不是 app | 用 `sudo -u postgres` 或改 `pg_hba.conf` 用 `scram` |
| `password authentication failed` | 密码错或用了旧 `md5` | `ALTER ROLE ... PASSWORD`，确认 `pg_hba` 用 `scram-sha-256` |
| `database "xxx" does not exist` | 连库前没建 / 默认连了同名库 | `createdb xxx` 或 `\c xxx` |
| `permission denied for table` | 角色没拿到表权限 | `GRANT ... ON TABLE` + `ALTER DEFAULT PRIVILEGES` |
| `too many connections` | 连接池没配好 / `max_connections` 太小 | 应用侧上连接池（pgbouncer），或调大 `max_connections` |
| `FATAL: role "xxx" does not exist` | 角色没建 | `CREATE ROLE xxx LOGIN PASSWORD ...` |

## 9. 小结

- **部署**：包管理器安装走 PGDG 官方源拿新版本；Docker 适合隔离与多版本。
- **连接**：本机用 `sudo -u postgres psql`（peer 认证）；跨机用 `psql -h ... -U ...` + `scram`。
- **使用**：理清 角色 → 数据库 → schema → 表 的层次；`GRANT` 别忘了 `ALTER DEFAULT PRIVILEGES`。
- **配置**：`postgresql.conf` 管运行参数，`pg_hba.conf` 管认证策略；改完 `reload`，改内存/连接项才 `restart`。
- **观测**：`pg_stat_activity` 看实时连接、`pg_stat_statements` 抓慢 SQL、`pg_stat_user_tables` 看索引命中率、`pg_locks` 查锁等待、日志看慢查询。
- **维护**：依赖 `autovacuum`，大批量变更后手动 `VACUUM ANALYZE`；定期 `pg_dump` 或 `pg_basebackup` 备份。

## 相关专栏

- [Redis 实战：服务器部署、日常使用与可观测性](./redis-guide.md) - 同系列缓存篇，对照"内存型 vs 磁盘型"取舍
- [systemd 与 systemctl 实战](../linux/systemd-systemctl.md) - 管理 `postgresql` 服务、看 journalctl 日志
- [Docker 与 Docker Compose 排障实战](../linux/docker-compose-ops.md) - 用容器跑 Postgres 时的排障思路
- [技术教程](./) - VPS 部署、CI/CD 等工程实践
