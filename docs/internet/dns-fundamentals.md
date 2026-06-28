---
lang: zh-CN
title: DNS 全面指南
description: DNS 解析流程、报文格式、记录类型、缓存机制、DNSSEC、DoH/DoT、自建 DNS 服务器和故障排查。
date: 2026-06-20
tags:
  - 网络协议
  - DNS
  - Linux
  - DNSSEC
  - DoH
  - BIND
  - CoreDNS
---

# DNS 全面指南

DNS（Domain Name System，域名系统）是互联网的核心基础设施，定义于 RFC 1034/1035（1987 年）。它将人类可读的域名（如 `example.com`）转换为机器可处理的 IP 地址，被称为「互联网的电话簿」——但实际上远比电话簿复杂。

> **与 dns-proxy 专栏的关系**：[dns-proxy](/dns-proxy/) 侧重 DNS 记录配置和 Nginx 部署实战，本文侧重 DNS 协议原理和运维深度。

---

## 第一部分：DNS 解析全流程

### 1.1 一次 DNS 查询的完整旅程

当你在浏览器输入 `www.example.com` 时：

```
用户输入 www.example.com
    │
    ▼
① 浏览器缓存 → 有？直接返回
    │ 没有
    ▼
② 操作系统缓存（nscd/systemd-resolved）→ 有？返回
    │ 没有
    ▼
③ Stub Resolver → 读取 /etc/resolv.conf → 发送查询到 Local Resolver
    │
    ▼
④ Local Resolver（递归解析器，如 8.8.8.8）
    │
    ├─⑤ 查询根服务器（.）→ 返回 .com TLD 服务器地址
    │
    ├─⑥ 查询 .com TLD 服务器 → 返回 example.com 权威服务器地址
    │
    ├─⑦ 查询 example.com 权威服务器 → 返回 www.example.com 的 A 记录
    │
    ▼
⑧ Local Resolver 缓存结果，返回给 Stub Resolver → 浏览器 → 建立连接
```

### 1.2 递归查询 vs 迭代查询

| 类型 | 发起方 | 行为 | 谁承担工作量 |
|------|--------|------|-------------|
| **递归查询** | Stub → Local Resolver | 「帮我查到最终答案」 | Local Resolver |
| **迭代查询** | Local Resolver → 根/TLD/权威 | 「告诉我下一步去哪问」 | Local Resolver |

```
Stub Resolver ──递归──→ Local Resolver
                           │
                           ├──迭代──→ 根服务器 → .com TLD 地址
                           ├──迭代──→ .com TLD → example.com NS 地址
                           └──迭代──→ example.com NS → www A 记录
```

### 1.3 DNS 服务器层级

| 层级 | 职责 | 示例 |
|------|------|------|
| **根服务器** | 返回 TLD 服务器地址 | 全球 13 组（a.root-servers.net ~ m.root-servers.net） |
| **TLD 服务器** | 返回二级域名的权威服务器地址 | .com → a.gtld-servers.net |
| **权威服务器** | 存储域名的实际记录 | ns1.example.com, Cloudflare, Route 53 |
| **递归解析器** | 代替客户端执行完整查询链 | 8.8.8.8, 1.1.1.1, ISP DNS |

### 1.4 实际验证：dig +trace

```bash
dig +trace www.example.com
```

输出（简化）：

```
; <<>> DiG 9.18 <<>> +trace www.example.com
;; Received 280 bytes from 192.168.1.1#53(192.168.1.1)

.           518400  IN  NS  a.root-servers.net.
.           518400  IN  NS  b.root-servers.net.
;; Received from root servers

com.        172800  IN  NS  a.gtld-servers.net.
com.        172800  IN  NS  b.gtld-servers.net.
;; Received from root, querying TLD

example.com.  172800  IN  NS  ns1.example.com.
example.com.  172800  IN  NS  ns2.example.com.
;; Received from TLD, querying authoritative

www.example.com.  300  IN  A  93.184.216.34
;; Received from authoritative server — final answer
```

每一跳都清晰可见。这是排查 DNS 委派链问题的核心工具。

---

## 第二部分：DNS 报文格式

### 2.1 报文结构

DNS 使用 UDP 端口 53（大响应或区域传输时用 TCP）。报文结构：

```
+---------------------+
|        Header       |  12 字节（固定）
+---------------------+
|       Question      |  查询问题（可变）
+---------------------+
|        Answer       |  回答记录（可变）
+---------------------+
|      Authority      |  权威记录（可变）
+---------------------+
|      Additional     |  附加记录（可变）
+---------------------+
```

### 2.2 Header 字段（12 字节）

```
 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
|                      ID                       |
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
|QR|   Opcode  |AA|TC|RD|RA|   Z    |   RCODE   |
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
|                    QDCOUNT                    |
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
|                    ANCOUNT                    |
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
|                    NSCOUNT                    |
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
|                    ARCOUNT                    |
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
```

| 字段 | 大小 | 说明 |
|------|------|------|
| **ID** | 16 位 | 事务 ID，匹配请求和响应 |
| **QR** | 1 位 | 0=查询，1=响应 |
| **Opcode** | 4 位 | 0=标准查询，1=反向查询，2=服务器状态 |
| **AA** | 1 位 | Authoritative Answer（权威应答） |
| **TC** | 1 位 | Truncated（UDP 截断，需 TCP 重试） |
| **RD** | 1 位 | Recursion Desired（请求递归） |
| **RA** | 1 位 | Recursion Available（支持递归） |
| **Z** | 3 位 | 保留 |
| **RCODE** | 4 位 | 响应码 |
| **QDCOUNT** | 16 位 | Question 段数量 |
| **ANCOUNT** | 16 位 | Answer 段数量 |
| **NSCOUNT** | 16 位 | Authority 段数量 |
| **ARCOUNT** | 16 位 | Additional 段数量 |

### 2.3 响应码（RCODE）

| RCODE | 名称 | 含义 |
|-------|------|------|
| 0 | **NOERROR** | 查询成功 |
| 1 | FORMERR | 格式错误，服务器无法理解请求 |
| 2 | **SERVFAIL** | 服务器内部错误（无法到达权威、DNSSEC 验证失败） |
| 3 | **NXDOMAIN** | 域名不存在 |
| 4 | NOTIMP | 不支持的操作 |
| 5 | **REFUSED** | 服务器拒绝（策略原因，如不允许递归） |

```bash
# 测试 NXDOMAIN
dig nonexistent-domain-12345.com
# status: NXDOMAIN

# 测试 SERVFAIL
dig @broken-ns.example.com example.com
# status: SERVFAIL

# 测试 REFUSED
dig @ns1.example.com other-domain.com
# status: REFUSED（该服务器不是 other-domain.com 的权威）
```

### 2.4 Question 段

```
  域名（QNAME）：用标签编码
    www.example.com → 3www7example3com0
                     ^  ^       ^  ^
                   长度  长度    长度 空终止符

  QTYPE（16位）：查询类型（A=1, AAAA=28, MX=15...）
  QCLASS（16位）：查询类别（IN=1，Internet）
```

### 2.5 Resource Record（RR）格式

Answer、Authority、Additional 段都由 RR 组成：

```
+------------------+
|      NAME        |  域名（可压缩指针）
+------------------+
|      TYPE        |  记录类型（16位）
+------------------+
|      CLASS       |  类别（16位，IN=1）
+------------------+
|       TTL        |  生存时间（32位，秒）
+------------------+
|    RDLENGTH      |  RDATA 长度（16位）
+------------------+
|      RDATA       |  记录数据（可变）
+------------------+
```

---

## 第三部分：DNS 记录类型大全

### 3.1 核心记录类型

| 类型 | 值 | 用途 | 示例 |
|------|-----|------|------|
| **A** | 1 | 域名 → IPv4 地址 | `example.com. A 93.184.216.34` |
| **AAAA** | 28 | 域名 → IPv6 地址 | `example.com. AAAA 2606:2800:220:1:248:1893:25c8:1946` |
| **CNAME** | 5 | 域名 → 另一个域名（别名） | `www.example.com. CNAME example.com.` |
| **MX** | 15 | 邮件交换服务器 | `example.com. MX 10 mail.example.com.` |
| **NS** | 2 | 委派子域到指定权威服务器 | `example.com. NS ns1.example.com.` |
| **SOA** | 6 | 区域起始授权（区域元数据） | 见下文 |
| **TXT** | 16 | 文本记录（SPF、DKIM、验证） | `example.com. TXT "v=spf1 include:_spf.google.com ~all"` |
| **PTR** | 12 | IP → 域名（反向解析） | `34.216.184.93.in-addr.arpa. PTR example.com.` |

### 3.2 SOA 记录详解

每个区域（zone）有且仅有一个 SOA 记录：

```
example.com.  3600  IN  SOA  ns1.example.com. admin.example.com. (
                              2024062001  ; Serial（序列号）
                              3600        ; Refresh（从服务器刷新间隔，秒）
                              900         ; Retry（重试间隔）
                              604800      ; Expire（从服务器过期时间）
                              86400       ; Minimum TTL（否定缓存 TTL）
                            )
```

| 字段 | 说明 |
|------|------|
| **MNAME** | 主权威服务器名 |
| **RNAME** | 管理员邮箱（`admin.example.com.` = `admin@example.com`） |
| **Serial** | 区域版本号，从服务器据此判断是否需要同步（常用格式 YYYYMMDDNN） |
| **Refresh** | 从服务器多久检查一次主服务器是否有更新 |
| **Retry** | Refresh 失败后多久重试 |
| **Expire** | 主服务器不可达多久后从服务器停止应答 |
| **Minimum** | NXDOMAIN 响应的缓存时间（否定缓存 TTL） |

### 3.3 扩展记录类型

| 类型 | 用途 | 典型场景 |
|------|------|----------|
| **SRV** | 服务定位（端口+优先级+权重） | `_sip._tcp.example.com. SRV 10 60 5060 sipserver.example.com.` |
| **CAA** | 指定哪些 CA 可以为该域名签发证书 | `example.com. CAA 0 issue "letsencrypt.org"` |
| **DNSKEY** | DNSSEC 公钥 | 存储 ZSK 和 KSK |
| **DS** | DNSSEC 委派签名（父区存储子区的 KSK 哈希） | 建立信任链 |
| **RRSIG** | DNSSEC 签名 | 对 RRset 的数字签名 |
| **NSEC/NSEC3** | DNSSEC 否定应答证明 | 证明某个记录确实不存在 |
| **NAPTR** | 命名权威指针（ENUM、SIP 路由） | VoIP 路由 |
| **TLSA** | DANE（DNS 证书关联） | 绑定证书到域名 |
| **SSHFP** | SSH 主机密钥指纹 | SSH 密钥验证 |
| **LOC** | 地理位置 | 地理编码 |

### 3.4 SRV 记录详解

SRV 记录用于发现服务的位置，格式：

```
_服务._协议.域名. SRV 优先级 权重 端口 目标主机
```

```
# SIP 服务
_sip._tcp.example.com.  3600  IN  SRV  10 60 5060 sip1.example.com.
_sip._tcp.example.com.  3600  IN  SRV  10 40 5060 sip2.example.com.
_sip._tcp.example.com.  3600  IN  SRV  20 100 5060 sip-backup.example.com.
```

| 字段 | 说明 |
|------|------|
| **优先级** | 越小越优先，先尝试低优先级 |
| **权重** | 同优先级内按权重分配流量 |
| **端口** | 服务端口 |
| **目标** | 服务主机名 |

```bash
# 查询 SRV 记录
dig SRV _sip._tcp.example.com
```

### 3.5 CAA 记录

CAA（Certification Authority Authorization）控制哪些 CA 可以为你的域名签发证书：

```
# 只允许 Let's Encrypt
example.com.  CAA  0 issue "letsencrypt.org"

# 只允许 DigiCert，并允许通配符
example.com.  CAA  0 issuewild "digicert.com"

# 违规签发时发送邮件通知
example.com.  CAA  0 iodef "mailto:admin@example.com"
```

```bash
# 检查 CAA 记录
dig CAA example.com
```

### 3.6 PTR 记录（反向解析）

PTR 记录将 IP 地址映射回域名，用于邮件反垃圾、日志分析等：

```
# IPv4：反转 IP 段 + .in-addr.arpa
93.184.216.34 → 34.216.184.93.in-addr.arpa. PTR example.com.

# IPv6：反转每个半字节 + .ip6.arpa
2001:db8::1 → 1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa. PTR example.com.
```

```bash
# 反向查询
dig -x 93.184.216.34
# 等价于
dig PTR 34.216.184.93.in-addr.arpa.

# IPv6 反向查询
dig -x 2001:4860:4860::8888
```

> **注意**：PTR 记录由 IP 地址的持有者（ISP/云厂商）管理，不是域名注册商。

---

## 第四部分：DNS 缓存机制

### 4.1 缓存层级

DNS 缓存在多个层级发生：

```
浏览器缓存（Chrome ~60s）
    ↓ miss
操作系统缓存（nscd / systemd-resolved）
    ↓ miss
Stub Resolver（应用程序自身）
    ↓ miss
Local Resolver / 递归解析器（核心缓存层）
    ↓ miss
权威服务器（无缓存，直接返回）
```

### 4.2 TTL（Time to Live）

TTL 决定记录在缓存中的存活时间（秒）：

| TTL 值 | 适用场景 |
|--------|----------|
| 30-60s | 频繁变更的记录（如正在迁移的域名） |
| 300s（5min） | 普通生产环境，平衡速度和灵活性 |
| 3600s（1h） | 稳定的记录 |
| 86400s（24h） | 极少变更的记录（如 NS、MX） |

**TTL 与变更生效时间**：

```
当前 TTL = 3600（1小时）
你修改了 A 记录

最坏情况：全球所有 Local Resolver 都需要 1 小时才能刷新缓存
→ 1 小时内部分用户访问旧 IP，部分访问新 IP

最佳实践：迁移前 24 小时将 TTL 降到 60s
```

### 4.3 否定缓存

NXDOMAIN 和 NODATA（域名存在但类型不存在）的响应也会被缓存：

- TTL 取自 SOA 记录的 **Minimum** 字段（RFC 2308）
- 大多数递归解析器限制否定缓存最大为 3 小时

```bash
# 查看否定缓存 TTL
dig SOA example.com
# Minimum 字段即为否定缓存 TTL
```

### 4.4 清除缓存

```bash
# 清除 systemd-resolved 缓存
sudo resolvectl flush-caches

# 查看缓存统计
resolvectl statistics

# 清除 nscd 缓存
sudo nscd -i hosts

# macOS
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Windows
ipconfig /flushdns

# 清除浏览器缓存
# Chrome: chrome://net-internals/#dns → Clear host cache

# 绕过缓存查询（直接向权威查询）
dig @ns1.example.com www.example.com
```

---

## 第五部分：DNS 安全

### 5.1 DNS 欺骗/投毒

攻击者向递归解析器注入伪造响应：

```
正常：
客户端 → 递归解析器 → 权威服务器 → 正确 IP

攻击：
客户端 → 递归解析器 ← 攻击者伪造响应（更快的假应答）
→ 缓存被污染，后续所有用户被导向错误 IP
```

**防御措施**：
- 源端口随机化（不再固定 53）
- 事务 ID 随机化
- DNSSEC（根本解决方案）

### 5.2 DNS 放大攻击

利用 DNS 的 UDP 特性和大响应进行 DDoS：

```
攻击者伪造源 IP 为受害者 → 向开放递归服务器发送大查询
→ 大量响应涌向受害者

ANY 查询可返回 10-100 倍大小的响应
```

**防御措施**：
- 关闭开放递归（只允许内网使用）
- 限制响应速率（Response Rate Limiting）
- 禁止 ANY 查询

### 5.3 DNS 隧道

将数据编码在 DNS 查询中，绕过防火墙：

```
攻击者控制 evil.com
受害者机器：
  查询 base64(窃取数据).evil.com → 数据泄露
  查询 cmd.evil.com → 接收命令
```

**检测**：
- 异常的子域长度和频率
- 非标准 DNS 使用模式

### 5.4 DNSSEC

DNSSEC（DNS Security Extensions）通过数字签名确保 DNS 响应的真实性：

**信任链**：

```
根区域签名（Trust Anchor）
    ↓ DS 记录
.com 区域签名
    ↓ DS 记录
example.com 区域签名
    ↓ RRSIG 记录
www.example.com A 记录（已验证）
```

**核心概念**：

| 术语 | 说明 |
|------|------|
| **ZSK**（Zone Signing Key） | 签名区域内记录的密钥，定期轮换 |
| **KSK**（Key Signing Key） | 签名 ZSK 的密钥，更长的密钥，更少轮换 |
| **DS**（Delegation Signer） | KSK 的哈希，存储在父区域，建立信任链 |
| **RRSIG** | 对 RRset 的数字签名 |
| **DNSKEY** | 存储公钥的记录 |
| **NSEC/NSEC3** | 证明记录不存在的签名应答 |

**验证 DNSSEC**：

```bash
# 查询并验证 DNSSEC
dig +dnssec example.com
# 响应中应有 RRSIG 记录，且 flags 包含 "ad"（Authenticated Data）

# 查看信任链
dig +trace +dnssec example.com

# 在线验证工具
# https://dnssec-debugger.verisignlabs.com/
# https://dnsviz.net/
```

**DNSSEC 的争议**：
- 增加响应大小和延迟
- 配置复杂，容易出错（过期签名 → SERVFAIL）
- 不加密（只签名，不保护隐私）

---

## 第六部分：DNS 加密（DoH / DoT）

传统 DNS 使用明文 UDP，存在隐私泄露和篡改风险。

### 6.1 协议对比

| 特性 | 传统 DNS | DoT（DNS over TLS） | DoH（DNS over HTTPS） |
|------|----------|---------------------|----------------------|
| 端口 | 53 | 853 | 443 |
| 加密 | ❌ | ✅ TLS | ✅ TLS |
| 协议 | UDP/TCP | TCP | HTTPS |
| 可被 ISP 监控 | ✅ | ❌ | ❌ |
| 可被防火墙识别 | ✅（端口 53） | ⚠️（端口 853） | ❌（与 HTTPS 混合） |
| RFC | 1035 | 7858 | 8484 |

### 6.2 DNS over HTTPS（DoH）

DoH 将 DNS 查询封装在 HTTPS 请求中：

```
客户端 → HTTPS POST/GET → DoH 服务器
         /dns-query?dns=base64编码的DNS报文
```

**公共 DoH 服务器**：

| 提供商 | URL |
|--------|-----|
| Google | `https://dns.google/dns-query` |
| Cloudflare | `https://cloudflare-dns.com/dns-query` |
| Quad9 | `https://dns.quad9.net/dns-query` |

**在浏览器中使用**：

Firefox：设置 → 网络设置 → 启用 DNS over HTTPS
Chrome：设置 → 隐私 → 使用安全 DNS

**在系统中使用（dnscrypt-proxy）**：

```bash
# 安装
sudo apt install dnscrypt-proxy

# 编辑配置 /etc/dnscrypt-proxy/dnscrypt-proxy.toml
server_names = ['cloudflare', 'google']
listen_addresses = ['127.0.0.1:53']

# 修改 /etc/resolv.conf
nameserver 127.0.0.1

# 启动
sudo systemctl restart dnscrypt-proxy
```

### 6.3 DNS over TLS（DoT）

DoT 在 TCP 853 端口上使用 TLS 加密：

```bash
# 使用 stubby（DoT 客户端）
sudo apt install stubby

# 配置 /etc/stubby/stubby.yml
resolution_type: GETDNS_RESOLUTION_STUB
dns_transport_list:
  - GETDNS_TRANSPORT_TLS
tls_authentication: GETDNS_AUTHENTICATION_REQUIRED
upstream_recursive_servers:
  - address_data: 1.1.1.1
    tls_auth_name: "cloudflare-dns.com"
  - address_data: 8.8.8.8
    tls_auth_name: "dns.google"

# 修改 /etc/resolv.conf
nameserver 127.0.0.1

# 启动
sudo systemctl restart stubby
```

**使用 systemd-resolved（Ubuntu 22.04+）**：

```ini
# /etc/systemd/resolved.conf
[Resolve]
DNS=1.1.1.1 8.8.8.8
DNSOverTLS=yes
```

```bash
sudo systemctl restart systemd-resolved
resolvectl status  # 确认 DNS over TLS 已启用
```

---

## 第七部分：自建 DNS 服务器

### 7.1 何时需要自建

| 场景 | 推荐方案 |
|------|----------|
| 内网域名解析 | CoreDNS / Unbound |
| 学习 DNS 协议 | BIND9 |
| 广告过滤 / Pi-hole | Pi-hole（基于 dnsmasq） |
| 权威 DNS 服务 | BIND9 / NSD / Knot DNS |
| K8s 内部 DNS | CoreDNS |

### 7.2 BIND9（最经典的 DNS 服务器）

**安装**：

```bash
sudo apt install bind9 bind9utils dnsutils
```

**配置主区域文件**：

```bash
# /etc/bind/named.conf.local
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";
    allow-transfer { 198.51.100.2; };  # 允许从服务器同步
};

zone "184.93.in-addr.arpa" {
    type master;
    file "/etc/bind/zones/db.93.184";
};
```

**正向区域文件**：

```bash
# /etc/bind/zones/db.example.com
$TTL 3600
@       IN  SOA     ns1.example.com. admin.example.com. (
                    2024062001  ; Serial
                    3600        ; Refresh
                    900         ; Retry
                    604800      ; Expire
                    86400       ; Minimum TTL
                    )

; Name Servers
@       IN  NS      ns1.example.com.
@       IN  NS      ns2.example.com.

; A Records
@       IN  A       93.184.216.34
www     IN  A       93.184.216.34
mail    IN  A       93.184.216.35

; AAAA Records
@       IN  AAAA    2606:2800:220:1:248:1893:25c8:1946

; MX Records
@       IN  MX  10  mail.example.com.

; CNAME Records
ftp     IN  CNAME   www.example.com.

; TXT Records
@       IN  TXT     "v=spf1 mx -all"

; CAA Records
@       IN  CAA     0 issue "letsencrypt.org"
```

**反向区域文件**：

```bash
# /etc/bind/zones/db.93.184
$TTL 3600
@       IN  SOA     ns1.example.com. admin.example.com. (
                    2024062001  3600  900  604800  86400 )

@       IN  NS      ns1.example.com.
@       IN  NS      ns2.example.com.

34      IN  PTR     example.com.
35      IN  PTR     mail.example.com.
```

**配置递归解析器**（可选）：

```bash
# /etc/bind/named.conf.options
options {
    directory "/var/cache/bind";
    recursion yes;
    allow-query { 192.168.0.0/16; 10.0.0.0/8; };  # 只允许内网
    dnssec-validation auto;
    listen-on-v6 { any; };
};
```

**检查和重载**：

```bash
# 检查配置语法
sudo named-checkconf

# 检查区域文件
sudo named-checkzone example.com /etc/bind/zones/db.example.com

# 重载
sudo systemctl reload bind9
```

### 7.3 CoreDNS（现代、插件化）

CoreDNS 是 CNCF 毕业项目，Kubernetes 默认 DNS，配置简洁：

**安装**：

```bash
# 下载二进制
curl -sSL https://github.com/coredns/coredns/releases/latest/download/coredns_linux_amd64.tgz | tar xz
sudo mv coredns /usr/local/bin/

# 或使用 Docker
docker run -d --name coredns -p 53:53 -p 53:53/udp -v /etc/coredns:/etc/coredns coredns/coredns
```

**Corefile（配置文件）**：

```bash
# /etc/coredns/Corefile

# 内网区域
example.com {
    file /etc/coredns/db.example.com
    log
    errors
}

# 反向解析
184.93.in-addr.arpa {
    file /etc/coredns/db.93.184
    log
}

# 其他查询转发到上游
. {
    forward . 8.8.8.8 1.1.1.1
    cache 300
    log
    errors
    prometheus :9153  # 暴露 Prometheus 指标
}
```

**常用插件**：

| 插件 | 用途 |
|------|------|
| `file` | 从区域文件加载 |
| `forward` | 转发到上游 DNS |
| `cache` | 响应缓存 |
| `hosts` | 类似 /etc/hosts |
| `rewrite` | 重写查询/响应 |
| `template` | 动态响应（通配符） |
| `dnssec` | 在线签名 |
| `health` | 健康检查端点 |
| `prometheus` | 指标暴露 |

### 7.4 Unbound（高性能递归解析器）

Unbound 专注于递归解析，安全性好：

```bash
sudo apt install unbound

# /etc/unbound/unbound.conf
server:
    interface: 127.0.0.1
    interface: ::1
    access-control: 192.168.0.0/16 allow
    access-control: 10.0.0.0/8 allow
    
    # 安全设置
    hide-identity: yes
    hide-version: yes
    
    # DNSSEC 验证
    auto-trust-anchor-file: "/var/lib/unbound/root.key"
    
    # 性能
    num-threads: 4
    msg-cache-slabs: 8
    rrset-cache-slabs: 8
    infra-cache-slabs: 8
    key-cache-slabs: 8
    rrset-cache-size: 256m
    msg-cache-size: 128m

forward-zone:
    name: "."
    forward-addr: 1.1.1.1
    forward-addr: 8.8.8.8
```

```bash
# 验证配置
unbound-checkconf /etc/unbound/unbound.conf

# 启动
sudo systemctl restart unbound
```

---

## 第八部分：DNS 负载均衡和 GeoDNS

### 8.1 轮询（Round Robin）

最简单的方式：同一域名返回多个 A 记录：

```
www.example.com.  A  93.184.216.34
www.example.com.  A  93.184.216.35
www.example.com.  A  93.184.216.36
```

客户端随机选择一个。问题：
- 无健康检查（故障服务器仍被返回）
- 无地理感知（全球用户随机分配）

### 8.2 加权轮询

通过多条 A 记录的不同 TTL 或 DNS 服务商功能实现权重分配。

### 8.3 GeoDNS

根据查询者地理位置返回不同结果：

```
美国用户查询 → 返回美国服务器 IP
亚洲用户查询 → 返回亚洲服务器 IP
欧洲用户查询 → 返回欧洲服务器 IP
```

**实现方式**：

- **Cloudflare Load Balancing**：按区域配置池
- **AWS Route 53 Geolocation Routing**
- **BIND + GeoIP 模块**
- **CoreDNS + view 插件**

**BIND GeoDNS 示例**（使用 ACL）：

```bash
acl "asia" { 103.0.0.0/8; 1.0.0.0/8; };
acl "us" { 23.0.0.0/8; 44.0.0.0/8; };

view "asia" {
    match-clients { asia; };
    zone "example.com" {
        type master;
        file "db.example.com.asia";
    };
};

view "us" {
    match-clients { us; };
    zone "example.com" {
        type master;
        file "db.example.com.us";
    };
};

view "default" {
    match-clients { any; };
    zone "example.com" {
        type master;
        file "db.example.com.default";
    };
};
```

### 8.4 EDNS Client Subnet（ECS）

递归解析器将客户端的子网信息传递给权威服务器，使 GeoDNS 更精确：

```bash
# 查看 ECS 是否生效
dig +subnet=203.0.113.0/24 @ns1.example.com www.example.com
```

---

## 第九部分：故障排查深度指南

### 9.1 dig 高级用法

```bash
# 完整追踪解析链
dig +trace www.example.com

# 指定查询类型
dig A example.com
dig AAAA example.com
dig MX example.com
dig NS example.com
dig SOA example.com
dig TXT example.com
dig CAA example.com
dig SRV _sip._tcp.example.com

# 指定 DNS 服务器
dig @8.8.8.8 example.com
dig @1.1.1.1 example.com
dig @ns1.example.com example.com

# TCP 查询（大响应）
dig +tcp example.com

# 查看响应时间
dig example.com | grep "Query time"

# EDNS 信息
dig +edns example.com

# DNSSEC 验证
dig +dnssec example.com

# 反向查询
dig -x 93.184.216.34

# 批量查询
dig -f domains.txt

# 只输出答案段
dig +short example.com
dig +noall +answer example.com

# 完整输出（含所有段）
dig +noall +answer +authority +additional example.com
```

### 9.2 常见故障诊断

**故障 1：SERVFAIL**

```bash
dig example.com
# status: SERVFAIL

# 排查步骤：
# 1. 检查 NS 记录是否可解析
dig NS example.com
dig A ns1.example.com

# 2. 检查权威服务器是否在线
dig @ns1.example.com example.com

# 3. 检查 DNSSEC（最常见的 SERVFAIL 原因）
dig +dnssec +trace example.com
# 查找 RRSIG 过期或 DS 不匹配
```

**故障 2：NXDOMAIN 但域名存在**

```bash
dig www.example.com
# status: NXDOMAIN

# 可能原因：
# 1. 权威服务器 NS 记录不一致
dig NS example.com @ns1.example.com
dig NS example.com @ns2.example.com

# 2. 域名被 clientHold（未实名认证）
dig example.com +trace
# 检查 TLD 层是否返回 SERVFAIL 或 NXDOMAIN

# 3. DNSSEC 的 NSEC/NSEC3 否定缓存
```

**故障 3：解析慢**

```bash
# 测量各环节耗时
dig example.com
# Query time: 150 msec ← 太慢

# 检查是递归慢还是权威慢
dig +trace example.com  # 逐跳看耗时

# 检查递归解析器状态
dig @8.8.8.8 example.com  # Google
dig @1.1.1.1 example.com  # Cloudflare
# 哪个快用哪个

# 检查缓存命中率
resolvectl statistics
# Cache hit / miss 比例
```

**故障 4：DNS 传播延迟**

```bash
# "修改了 DNS记录但还没生效"

# 1. 确认权威服务器已更新
dig @ns1.example.com www.example.com

# 2. 检查各递归解析器是否已刷新
dig @8.8.8.8 www.example.com
dig @1.1.1.1 www.example.com
dig @208.67.222.222 www.example.com  # OpenDNS

# 3. 如果权威已更新但递归未更新 → 旧 TTL 缓存未过期
# 等待旧 TTL 到期，或清除本地缓存
```

**故障 5：DNSSEC 验证失败**

```bash
dig +dnssec example.com
# status: SERVFAIL

# 在线检查工具
# https://dnssec-debugger.verisignlabs.com/example.com

# 常见原因：
# - RRSIG 过期（未定期重新签名）
# - DS 记录与 DNSKEY 不匹配（父区和子区密钥不一致）
# - NSEC3 链断裂
```

### 9.3 诊断工具汇总

| 工具 | 用途 | 安装 |
|------|------|------|
| `dig` | DNS 查询（最强大） | `apt install dnsutils` |
| `host` | 简单查询 | `apt install dnsutils` |
| `nslookup` | 交互式查询 | `apt install dnsutils` |
| `drill` | dig 替代（DNSSEC 友好） | `apt install ldnsutils` |
| `delv` | DNSSEC 验证查询 | `apt install bind9-dnsutils` |
| `kdig` | 增强 dig（DoT/DoH） | `apt install knot-dnsutils` |
| `dnssec-verify` | 验证区域签名 | `apt install bind9-utils` |
| `dnsviz` | 可视化 DNSSEC 链 | `pip install dnsviz` |
| `mtr` | 追踪到 DNS 服务器的网络路径 | `apt install mtr` |

---

## 第十部分：Split-Horizon DNS

### 10.1 概念

根据请求来源返回不同结果，用于内外网使用不同域名解析：

```
内网用户查询 server.example.com → 192.168.1.10（内网 IP）
外网用户查询 server.example.com → 203.0.113.1（公网 IP）
```

### 10.2 BIND 实现

```bash
# /etc/bind/named.conf.local
acl "internal" { 192.168.0.0/16; 10.0.0.0/8; };

view "internal" {
    match-clients { internal; };
    recursion yes;
    
    zone "example.com" {
        type master;
        file "/etc/bind/zones/internal/db.example.com";
    };
};

view "external" {
    match-clients { any; };
    recursion no;  # 外网不允许递归
    
    zone "example.com" {
        type master;
        file "/etc/bind/zones/external/db.example.com";
    };
};
```

### 10.3 CoreDNS 实现

```bash
# /etc/coredns/Corefile

# 内网区域（只在特定接口监听）
example.com {
    bind 192.168.1.1
    file /etc/coredns/db.example.com.internal
}

# 外网转发
. {
    forward . 8.8.8.8 1.1.1.1
    cache
}
```

---

## 第十一部分：/etc/resolv.conf 和 systemd-resolved

### 11.1 resolv.conf 详解

```bash
# /etc/resolv.conf
# 由 systemd-resolved 或 dhclient 生成

nameserver 127.0.0.53     # 指向本地 stub resolver
options edns0 trust-ad    # 启用 EDNS0 和信任 AD 位
search example.com local  # 搜索域（短域名补全）
```

| 字段 | 说明 |
|------|------|
| `nameserver` | DNS 服务器 IP（最多 3 个） |
| `search` | 搜索域，查询 `host` 时自动补全为 `host.example.com` |
| `options` | 选项：`ndots:2`（至少 2 个点才视为 FQDN）、`timeout:5`、`rotate` |

### 11.2 systemd-resolved

现代 Linux 的 DNS 管理中枢：

```bash
# 查看状态
resolvectl status

# 输出示例：
# Global
#        Protocols: +DefaultRoute +LLMNR +mDNS +DNSOverTLS
#   resolv.conf mode: stub
# 
# Link 2 (eth0)
#     Current DNS Server: 192.168.1.1
#            DNS Servers: 192.168.1.1
#             DNS Domain: example.com

# 设置 DNS
sudo resolvectl dns eth0 8.8.8.8 1.1.1.1

# 刷新缓存
sudo resolvectl flush-caches

# 查看缓存统计
resolvectl statistics
```

**配置文件**：

```ini
# /etc/systemd/resolved.conf
[Resolve]
DNS=8.8.8.8 1.1.1.1
FallbackDNS=8.8.4.4 1.0.0.1
DNSOverTLS=yes
DNSSEC=yes
Cache=yes
```

---

## 总结

**DNS 核心要点**：

1. **分层架构**：根 → TLD → 权威 → 递归解析器，各层职责清晰
2. **缓存为王**：TTL 控制缓存时间，修改 DNS 需要等待旧 TTL 过期
3. **记录类型丰富**：A/AAAA/CNAME/MX/TXT/NS/SOA/PTR/SRV/CAA 各有用途
4. **安全三件套**：DNSSEC（完整性）+ DoH/DoT（隐私）+ ACL（访问控制）
5. **故障排查**：`dig +trace` 追踪全链，逐跳定位问题
6. **自建选型**：BIND9（经典权威）、CoreDNS（现代插件化）、Unbound（高性能递归）

**延伸阅读**：
→ [DNS 与代理](/dns-proxy/) — 域名解析实战配置、Nginx 反向代理、SSL 证书部署
