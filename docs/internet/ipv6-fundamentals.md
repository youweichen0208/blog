---
lang: zh-CN
title: IPv6 全面指南
description: IPv6 地址结构、简化报头、SLAAC 自动配置、DHCPv6、双栈部署、过渡技术和故障排查。
date: 2026-06-20
tags:
  - 网络协议
  - IPv6
  - Linux
  - SLAAC
  - 双栈
  - 网络迁移
---

# IPv6 全面指南

IPv6（Internet Protocol version 6）是 IPv4 的继任者，定义于 RFC 8200（2017 年，取代 RFC 2460）。核心动机是 IPv4 地址耗尽（2011 年 IANA 分配完毕），同时带来报头简化、自动配置、内置安全等改进。

---

## 第一部分：IPv6 地址基础

### 1.1 地址结构

IPv6 地址是 **128 位二进制数**，表示为 **冒号分隔的 8 组 16 位十六进制数**：

```
完整形式：
2001:0db8:0000:0000:0000:0000:0000:0001

简化形式（前导零可省略）：
2001:db8:0:0:0:0:0:1

进一步简化（连续全零组用 :: 代替，只能用一次）：
2001:db8::1
```

**地址总量**：2^128 ≈ 3.4 × 10^38（地球上每平方米可以分配 6.5 × 10^23 个地址）

### 1.2 地址类型

| 类型 | 前缀 | 用途 | 对应 IPv4 |
|------|------|------|-----------|
| **全球单播** | 2000::/3 | 公网可路由地址 | 公网 IP |
| **链路本地** | fe80::/10 | 仅本链路有效，自动配置 | 169.254.0.0/16 |
| **唯一本地** | fc00::/7 | 私有网络，不可公网路由 | 10.0.0.0/8 等 |
| **多播** | ff00::/8 | 一对多通信 | 224.0.0.0/4 |
| **环回** | ::1/128 | 本机回环 | 127.0.0.1 |
| **未指定** | ::/128 | 相当于 0.0.0.0 | 0.0.0.0 |

> **重要区别**：IPv6 **没有广播地址**，所有广播功能由多播替代。

### 1.3 全球单播地址结构

```
|<------ 48 bits ------>|<-- 16 bits -->|<------- 64 bits ------->|
|    路由前缀（ISP分配）   |   子网 ID     |     接口标识符（IID）    |
|   2001:0db8:1234       |    :0001      |    ::1 或 EUI-64       |
```

- **路由前缀**（/48）：由 ISP 或 RIR 分配
- **子网 ID**（16 位）：组织内部划分子网，可创建 65,536 个子网
- **接口标识符**（64 位）：标识网络接口

### 1.4 接口标识符（IID）生成方式

**方式 1：EUI-64（基于 MAC 地址）**

```
MAC 地址：00:1a:2b:3c:4d:5e

步骤：
1. 拆成两半：00:1a:2b | 3c:4d:5e
2. 中间插入 ff:fe：00:1a:2b:ff:fe:3c:4d:5e
3. 翻转第 7 位（Universal/Local 位）：02:1a:2b:ff:fe:3c:4d:5e

IID = 021a:2bff:fe3c:4d5e
```

**方式 2：随机生成（隐私扩展，RFC 4941）**

现代操作系统默认使用随机 IID，防止通过 MAC 地址追踪用户：

```bash
# 查看是否启用隐私扩展
cat /proc/sys/net/ipv6/conf/all/use_tempaddr
# 2 = 启用（默认）
# 0 = 禁用
```

**方式 3：手动指定**

```bash
sudo ip -6 addr add 2001:db8::1/64 dev eth0
```

### 1.5 特殊地址

| 地址 | 用途 |
|------|------|
| `::1` | 环回地址（= IPv4 127.0.0.1） |
| `::` | 未指定地址（= IPv4 0.0.0.0） |
| `fe80::` | 链路本地前缀 |
| `ff02::1` | 所有节点多播（= 广播） |
| `ff02::2` | 所有路由器多播 |
| `ff02::fb` | mDNS（Bonjour/Avahi） |
| `2001:db8::/32` | 文档专用（RFC 3849，不可实际使用） |
| `64:ff9b::/96` | NAT64 前缀（IPv4 转换） |

### 1.6 子网划分

IPv6 子网划分比 IPv4 简单得多，因为主机部分固定 64 位：

```
前缀：2001:db8:1234::/48

子网划分（/64）：
2001:db8:1234:0000::/64  — 子网 0
2001:db8:1234:0001::/64  — 子网 1
2001:db8:1234:0002::/64  — 子网 2
...
2001:db8:1234:ffff::/64  — 子网 65535
```

> **最佳实践**：始终使用 /64 子网。更小的子网（如 /127）会破坏 SLAAC 等自动配置功能。

---

## 第二部分：IPv6 报头格式

### 2.1 简化的固定报头

IPv6 报头固定 40 字节，比 IPv4 更简洁：

```
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version| Traffic Class |           Flow Label                  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Payload Length        |  Next Header  |   Hop Limit   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                                                               |
+                         Source Address                        +
|                                                               |
+                                                               +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                                                               |
+                      Destination Address                      +
|                                                               |
+                                                               +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### 2.2 字段对比

| 字段 | IPv4 | IPv6 | 说明 |
|------|------|------|------|
| 版本号 | 4 位 | 4 位 | IPv6 = 6 |
| 报头长度 | IHL（可变） | 无（固定 40B） | IPv6 报头固定长度 |
| 服务类型 | TOS | Traffic Class | 类似 DSCP |
| 流标签 | 无 | Flow Label（20位） | QoS 流标识（新增） |
| 总长度 | Total Length | Payload Length | 只算载荷，不含报头 |
| 协议/下一报头 | Protocol | Next Header | 相同功能 |
| TTL | TTL | Hop Limit | 相同功能 |
| 校验和 | Header Checksum | 无 | 依赖上层校验（TCP/UDP） |
| 分片字段 | 在报头中 | 移到扩展报头 | 路由器不分片 |
| 源地址 | 32 位 | 128 位 | - |
| 目标地址 | 32 位 | 128 位 | - |

### 2.3 扩展报头

IPv6 将可选功能移到 **扩展报头**（链式结构）：

| 扩展报头 | Next Header 值 | 用途 |
|----------|---------------|------|
| Hop-by-Hop | 0 | 每跳处理（如 Jumbo Payload） |
| Routing | 43 | 源路由（已限制使用） |
| Fragment | 44 | 分片（仅源主机分片） |
| Authentication | 51 | IPsec AH |
| ESP | 50 | IPsec ESP |
| Destination | 60 | 目标选项 |

```
基本报头 → 扩展报头 1 → 扩展报头 2 → ... → 上层协议（TCP/UDP）
```

**关键改进**：路由器只检查基本报头和 Hop-by-Hop 扩展报头，其他跳过。这大幅提高了路由处理速度。

### 2.4 分片机制变化

| 特性 | IPv4 | IPv6 |
|------|------|------|
| 路由器可以分片 | ✅ 可以 | ❌ 不可以 |
| 分片由谁处理 | 路由器或源主机 | 仅源主机 |
| 路径 MTU 发现 | 可选 | **必须** |
| 最小 MTU | 576 字节 | 1280 字节 |

**PMTUD（路径 MTU 发现）**：

```
源主机发送大包（DF=1）
→ 路由器 MTU 不够 → 返回 ICMPv6 Packet Too Big
→ 源主机减小 MTU 重发
```

---

## 第三部分：IPv6 地址自动配置

### 3.1 SLAAC（无状态地址自动配置）

SLAAC（Stateless Address Autoconfiguration，RFC 4862）是 IPv6 最核心的特性之一：

**工作流程**：

```
1. 主机启动 → 生成链路本地地址（fe80::/10 + IID）
2. 发送 RS（Router Solicitation）到 ff02::2（所有路由器）
3. 路由器回复 RA（Router Advertisement）：
   - 网络前缀（如 2001:db8::/64）
   - 默认路由
   - 其他配置标志
4. 主机用前缀 + IID 生成全球单播地址
5. 执行 DAD（重复地址检测）确保地址唯一
```

**RA 中的关键标志**：

| 标志 | 含义 |
|------|------|
| M（Managed） | 使用 DHCPv6 获取地址 |
| O（Other） | 使用 DHCPv6 获取其他配置（如 DNS） |
| A（Autonomous） | 使用 SLAAC 自动配置 |

**四种配置模式**：

| M | O | A | 配置方式 |
|---|---|---|----------|
| 0 | 0 | 1 | 纯 SLAAC（无 DHCPv6） |
| 0 | 1 | 1 | SLAAC + DHCPv6（获取 DNS 等） |
| 1 | 0 | 0 | 纯 DHCPv6（有状态） |
| 1 | 1 | 0 | DHCPv6（地址 + 其他配置） |

### 3.2 DHCPv6

DHCPv6 用于需要集中管理的场景：

```
客户端 → All_DHCP_Relay_Agents_and_Servers（ff02::1:2）
  Solicit

服务器 → 客户端
  Advertise（提供地址）

客户端 → 服务器
  Request（请求地址）

服务器 → 客户端
  Reply（确认分配）
```

**与 DHCPv4 的区别**：

| 特性 | DHCPv4 | DHCPv6 |
|------|--------|--------|
| 传输协议 | UDP 67/68 | UDP 546/547 |
| 地址分配 | 主要方式 | 可选方式（SLAAC 优先） |
| 中继 | 广播 | 多播 |
| DUID | 无 | 有（设备唯一标识） |

### 3.3 NDP（邻居发现协议）

NDP（Neighbor Discovery Protocol，RFC 4861）替代了 IPv4 的 ARP：

| NDP 消息 | 功能 | 对应 IPv4 |
|----------|------|-----------|
| RS（Router Solicitation） | 请求路由器信息 | 无 |
| RA（Router Advertisement） | 路由器通告前缀和参数 | 无 |
| NS（Neighbor Solicitation） | 请求链路层地址 | ARP Request |
| NA（Neighbor Advertisement） | 应答链路层地址 | ARP Reply |
| Redirect | 重定向到更优路径 | ICMP Redirect |

**DAD（重复地址检测）**：

```
1. 主机选择地址 → 发送 NS（目标=自己的 tentative 地址）
2. 如果收到 NA → 地址冲突，不使用
3. 如果超时未收到 → 地址唯一，正式使用
```

---

## 第四部分：ICMPv6

IPv6 严重依赖 ICMPv6（RFC 4443），它不仅是诊断工具，更是协议核心：

| ICMPv6 类型 | 用途 |
|------------|------|
| 1 | 目标不可达 |
| 2 | 包过大（PMTUD） |
| 3 | 超时 |
| 128 | Echo Request（ping） |
| 129 | Echo Reply |
| 133 | Router Solicitation |
| 134 | Router Advertisement |
| 135 | Neighbor Solicitation |
| 136 | Neighbor Advertisement |

> **注意**：在 IPv6 中**绝对不能阻止 ICMPv6**！阻止 ICMPv6 会导致 NDP 失败，网络完全不可用。

```bash
# 错误做法（会导致 IPv6 网络瘫痪）：
ip6tables -A INPUT -p icmpv6 -j DROP  # 不要这样做！

# 正确做法（只阻止不需要的类型）：
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-solicitation -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-advertisement -j ACCEPT
```

---

## 第五部分：Linux 中的 IPv6 配置

### 5.1 查看 IPv6 地址

```bash
# 查看所有 IPv6 地址
ip -6 addr show

# 查看特定接口
ip -6 addr show eth0

# 查看链路本地地址
ip -6 addr show scope link

# 查看全球单播地址
ip -6 addr show scope global

# 查看邻居表（替代 ARP 表）
ip -6 neigh show
```

**输出解读**：

```
3: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    inet6 2001:db8::1/64 scope global
       valid_lft forever preferred_lft forever
    inet6 fe80::21a:2bff:fe3c:4d5e/64 scope link
       valid_lft forever preferred_lft forever
```

- `scope global` — 全球可路由地址
- `scope link` — 仅本链路有效
- `valid_lft` — 有效生命周期
- `preferred_lft` — 首选生命周期（过期后不再用于新连接）

### 5.2 启用/禁用 IPv6

```bash
# 查看是否启用
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# 0 = 启用，1 = 禁用

# 临时禁用
echo 1 | sudo tee /proc/sys/net/ipv6/conf/all/disable_ipv6

# 永久禁用（添加到 /etc/sysctl.conf）
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1

# 应用
sudo sysctl -p
```

### 5.3 配置静态 IPv6 地址

**方式 1：ip 命令（临时）**

```bash
# 添加 IPv6 地址
sudo ip -6 addr add 2001:db8::1/64 dev eth0

# 删除
sudo ip -6 addr del 2001:db8::1/64 dev eth0

# 添加默认路由
sudo ip -6 route add default via fe80::1 dev eth0
```

**方式 2：Netplan（Ubuntu）**

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp6: yes  # 使用 DHCPv6
      addresses:
        - 2001:db8::1/64  # 静态 IPv6
      routes:
        - to: default
          via: fe80::1
      nameservers:
        addresses: [2001:4860:4860::8888, 2001:4860:4860::8844]
```

**方式 3：NetworkManager**

```bash
# 设置静态 IPv6
sudo nmcli con mod eth0 ipv6.addresses 2001:db8::1/64
sudo nmcli con mod eth0 ipv6.gateway fe80::1
sudo nmcli con mod eth0 ipv6.dns "2001:4860:4860::8888"
sudo nmcli con mod eth0 ipv6.method manual

# 使用 SLAAC
sudo nmcli con mod eth0 ipv6.method auto

# 使用 DHCPv6
sudo nmcli con mod eth0 ipv6.method dhcp

# 应用
sudo nmcli con up eth0
```

### 5.4 路由配置

```bash
# 查看 IPv6 路由表
ip -6 route show

# 输出示例：
# default via fe80::1 dev eth0 proto ra metric 100
# 2001:db8::/64 dev eth0 proto kernel metric 256
# fe80::/64 dev eth0 proto kernel metric 256

# 添加静态路由
sudo ip -6 route add 2001:db8:1::/64 via fe80::1 dev eth0

# 删除路由
sudo ip -6 route del 2001:db8:1::/64
```

### 5.5 DNS 配置

```bash
# 查看 IPv6 DNS 服务器
cat /etc/resolv.conf
# nameserver 2001:4860:4860::8888
# nameserver 2001:4860:4860::8844

# 测试 IPv6 DNS 解析
dig -6 example.com
dig @2001:4860:4860::8888 example.com

# 公共 IPv6 DNS 服务器
# Google: 2001:4860:4860::8888, 2001:4860:4860::8844
# Cloudflare: 2606:4700:4700::1111, 2606:4700:4700::1001
# Quad9: 2620:fe::fe, 2620:fe::9
```

---

## 第六部分：ip6tables 防火墙

### 6.1 与 iptables 的区别

ip6tables 是 iptables 的 IPv6 版本，语法几乎相同：

```bash
# 语法对比
iptables -A INPUT -p tcp --dport 80 -j ACCEPT      # IPv4
ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT     # IPv6
```

### 6.2 基础规则

```bash
# 设置默认策略
sudo ip6tables -P INPUT DROP
sudo ip6tables -P FORWARD DROP
sudo ip6tables -P OUTPUT ACCEPT

# 允许回环
sudo ip6tables -A INPUT -i lo -j ACCEPT

# 允许已建立的连接
sudo ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 允许必要的 ICMPv6（必须！）
sudo ip6tables -A INPUT -p icmpv6 -j ACCEPT

# 允许 SSH
sudo ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT

# 允许 HTTP/HTTPS
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# 允许 DHCPv6（如果不用 SLAAC）
sudo ip6tables -A INPUT -p udp --dport 546 -j ACCEPT
```

### 6.3 保存规则

```bash
# 保存（Debian/Ubuntu）
sudo ip6tables-save > /etc/iptables/rules.v6

# 恢复
sudo ip6tables-restore < /etc/iptables/rules.v6
```

---

## 第七部分：IPv6 过渡技术

### 7.1 双栈（Dual Stack）

**最推荐的过渡方式**：同时运行 IPv4 和 IPv6。

```
主机同时拥有：
  IPv4: 192.168.1.100
  IPv6: 2001:db8::1

DNS 返回两种记录：
  A    → 192.168.1.100
  AAAA → 2001:db8::1

客户端优先使用 IPv6（Happy Eyeballs 算法）
```

**Linux 双栈配置**：

```bash
# 确认双栈启用
cat /proc/sys/net/ipv6/conf/all/disable_ipv6  # 应该是 0

# 配置 IPv4（如前所述）
# 配置 IPv6（如前所述）

# DNS 同时添加 A 和 AAAA 记录
```

**Happy Eyeballs（RFC 8305）**：

现代浏览器和应用的连接算法：

```
1. 同时发起 IPv6 和 IPv4 连接
2. IPv6 先发起（通常早 50-300ms）
3. 如果 IPv6 超时，回退到 IPv4
4. 使用先完成的连接
```

### 7.2 隧道技术

当两个 IPv6 网络之间只有 IPv4 基础设施时：

**6to4（RFC 3056）**：

```
IPv6 包封装在 IPv4 包中传输
前缀：2002:V4ADDR::/48（V4ADDR 是你的 IPv4 地址的十六进制）

示例：IPv4 203.0.113.1 → 2002:cb00:7101::/48
```

```bash
# 创建 6to4 隧道（Linux）
sudo ip tunnel add sit0 mode sit remote any local 203.0.113.1
sudo ip link set sit0 up
sudo ip -6 addr add 2002:cb00:7101::1/16 dev sit0
sudo ip -6 route add 2000::/3 dev sit0
```

**Teredo（通过 NAT）**：

```
IPv6 包封装在 UDP/IPv4 中，可穿越 NAT
前缀：2001:0000::/32
需要 Teredo 服务器和中继
```

```bash
# 安装 miredo（Linux Teredo 客户端）
sudo apt install miredo
sudo systemctl start miredo
```

**GRE 隧道**：

```bash
# 站点 A（IPv4: 203.0.113.1）
sudo ip tunnel add gre6 mode sit remote 198.51.100.1 local 203.0.113.1 ttl 255
sudo ip link set gre6 up
sudo ip -6 addr add 2001:db8:ffff::1/64 dev gre6

# 站点 B（IPv4: 198.51.100.1）
sudo ip tunnel add gre6 mode sit remote 203.0.113.1 local 198.51.100.1 ttl 255
sudo ip link set gre6 up
sudo ip -6 addr add 2001:db8:ffff::2/64 dev gre6
```

### 7.3 NAT64/DNS64

让 IPv6-only 的客户端访问 IPv4 服务器：

```
IPv6 客户端 → NAT64 网关 → IPv4 服务器

DNS64：当 AAAA 记录不存在时，合成一个（将 A 记录嵌入 IPv6 地址）
A: 93.184.216.34 → AAAA: 64:ff9b::5db8:d822
                     ^^^^^^^^^  ^^^^^^^^^
                     NAT64前缀   IPv4地址的十六进制
```

### 7.4 464XLAT

移动网络常用方案：

```
CLAT（客户端翻译器）：IPv4 → IPv6
PLAT（运营商翻译器）：IPv6 → IPv4

IPv4 App → CLAT → IPv6 网络 → PLAT → IPv4 服务器
```

---

## 第八部分：故障排查

### 8.1 连接性检查

```bash
# 1. Ping IPv6 地址
ping6 -c 4 2001:4860:4860::8888

# 2. Ping 链路本地地址（需指定接口）
ping6 -c 4 -I eth0 fe80::1

# 3. Traceroute
traceroute6 2001:4860:4860::8888
# 或
mtr -6 2001:4860:4860::8888

# 4. 端口连通性
nc -6 -zv 2001:4860:4860::8888 53
```

### 8.2 查看 NDP 表

```bash
# 查看邻居缓存（替代 ARP 表）
ip -6 neigh show

# 输出示例：
# fe80::1 dev eth0 lladdr 00:1a:2b:3c:4d:5e router REACHABLE
# 2001:db8::2 dev eth0 lladdr 00:1a:2b:3c:4d:5f REACHABLE

# 状态含义：
# REACHABLE — 可达
# STALE — 可能过期，下次使用时会重新验证
# DELAY — 正在等待验证
# INCOMPLETE — 正在解析
# FAILED — 解析失败
```

### 8.3 抓包分析

```bash
# 抓取 IPv6 包
sudo tcpdump -i eth0 -n ip6

# 抓取 ICMPv6（NDP、RA 等）
sudo tcpdump -i eth0 -n icmp6

# 抓取特定 IPv6 地址
sudo tcpdump -i eth0 -n host 2001:db8::1

# 保存并分析
sudo tcpdump -i eth0 -n ip6 -w ipv6-capture.pcap
```

### 8.4 常见问题排查

**问题 1：IPv6 连接不通**

```bash
# 检查清单：

# 1. IPv6 是否启用
cat /proc/sys/net/ipv6/conf/all/disable_ipv6

# 2. 是否有 IPv6 地址
ip -6 addr show

# 3. 是否有默认路由
ip -6 route show

# 4. 能否 ping 链路本地网关
ping6 -I eth0 fe80::1

# 5. 能否 ping 全球地址
ping6 2001:4860:4860::8888

# 6. DNS 是否返回 AAAA 记录
dig AAAA example.com

# 7. 防火墙是否阻止
sudo ip6tables -L INPUT -v -n
```

**问题 2：SLAAC 未分配地址**

```bash
# 1. 检查是否收到 RA
sudo tcpdump -i eth0 -n icmp6 and ip6[40] == 134
# 如果无输出，路由器未发送 RA

# 2. 检查内核参数
cat /proc/sys/net/ipv6/conf/eth0/accept_ra
# 应该 >= 1
# 2 = 即使启用转发也接受 RA

# 3. 检查 forwarding 是否影响
cat /proc/sys/net/ipv6/conf/all/forwarding
# 如果 = 1，accept_ra 需要设为 2

# 4. 手动请求 RA
sudo rdisc6 eth0
```

**问题 3：双栈环境中 IPv6 优先但不可用**

```bash
# 症状：连接很慢，最终回退到 IPv4

# 1. 检查 AAAA 记录是否存在
dig AAAA example.com

# 2. 检查 IPv6 路由是否有效
ip -6 route get 2001:db8::1

# 3. 降低 IPv6 优先级（临时解决）
# 编辑 /etc/gai.conf
# 取消注释：precedence ::ffff:0:0/96 100
# 这会让 IPv4 优先

# 4. 或禁用 IPv6（如果不需要）
# （见 5.2 节）
```

**问题 4：PMTUD 黑洞**

```bash
# 症状：小包能通，大包超时

# 1. 测试不同包大小
ping6 -c 4 -s 1232 2001:db8::1  # 1232 + 48 = 1280（最小 MTU）
ping6 -c 4 -s 1452 2001:db8::1  # 1452 + 48 = 1500

# 2. 抓取 ICMPv6 Packet Too Big
sudo tcpdump -i eth0 -n 'icmp6 and ip6[40] == 2'

# 3. 检查防火墙是否阻止 ICMPv6
# （绝不能阻止 ICMPv6！见第四节）
```

### 8.5 诊断工具汇总

| 工具 | 用途 | IPv6 选项 |
|------|------|-----------|
| `ping` | 连通性测试 | `ping6` 或 `ping -6` |
| `traceroute` | 路由追踪 | `traceroute6` 或 `traceroute -6` |
| `mtr` | 交互式追踪 | `mtr -6` |
| `dig` | DNS 查询 | `dig AAAA` 或 `dig -6` |
| `tcpdump` | 抓包 | `ip6` 过滤 |
| `ss` | 套接字统计 | `ss -6` |
| `curl` | HTTP 测试 | `curl -6` |
| `ndisc6` | NDP 查询 | `apt install ndisc6` |
| `rdisc6` | 路由器发现 | `apt install ndisc6` |

---

## 第九部分：应用层适配

### 9.1 Socket 编程

**Python**：

```python
import socket

# IPv4
sock4 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock4.connect(("192.168.1.1", 80))

# IPv6
sock6 = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
sock6.connect(("2001:db8::1", 80, 0, 0))  # (host, port, flowinfo, scope_id)

# 双栈（同时监听 IPv4 和 IPv6）
sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)  # 关闭仅 IPv6
sock.bind(("::", 80))  # 监听所有地址
sock.listen(5)
```

**Go**：

```go
package main

import (
    "fmt"
    "net"
)

func main() {
    // IPv4
    conn4, err := net.Dial("tcp4", "192.168.1.1:80")
    if err != nil {
        fmt.Println("IPv4 error:", err)
    } else {
        conn4.Close()
    }

    // IPv6
    conn6, err := net.Dial("tcp6", "[2001:db8::1]:80")
    if err != nil {
        fmt.Println("IPv6 error:", err)
    } else {
        conn6.Close()
    }

    // 双栈（自动选择）
    conn, err := net.Dial("tcp", "example.com:80")
    if err != nil {
        fmt.Println("error:", err)
    } else {
        conn.Close()
    }

    // 监听（双栈）
    listener, err := net.Listen("tcp", "[::]:8080")
    if err != nil {
        panic(err)
    }
    defer listener.Close()
    // 同时接受 IPv4 和 IPv6 连接
}
```

### 9.2 Nginx 配置

```nginx
# 同时监听 IPv4 和 IPv6
server {
    listen 80;
    listen [::]:80;
    server_name example.com;

    location / {
        proxy_pass http://backend;
    }
}

# 仅 IPv6
server {
    listen [::]:80 ipv6only=on;
    server_name example.com;
}
```

### 9.3 DNS 记录

```
; IPv4 地址记录
example.com.    IN    A       203.0.113.1

; IPv6 地址记录
example.com.    IN    AAAA    2001:db8::1

; 双栈服务需要同时配置 A 和 AAAA 记录
```

---

## 第十部分：内核参数调优

```bash
# 添加到 /etc/sysctl.conf

# 启用 IPv6 转发（路由器需要）
net.ipv6.conf.all.forwarding = 1

# 接受 RA（即使启用转发）
net.ipv6.conf.all.accept_ra = 2

# 隐私扩展（随机 IID）
net.ipv6.conf.all.use_tempaddr = 2

# 禁用 IPv6 路由器通告（非路由器）
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.all.send_redirects = 0

# 应用
sudo sysctl -p
```

---

## 总结

**IPv6 核心要点**：

1. **128 位地址**：几乎无限，用 `::` 简化连续零组
2. **SLAAC**：无状态自动配置，设备自动生成地址
3. **简化报头**：固定 40 字节，路由器处理更快
4. **ICMPv6 不可阻止**：NDP、PMTUD 都依赖它
5. **双栈是最佳过渡方案**：同时运行 IPv4 和 IPv6
6. **应用适配**：使用 `AF_INET6` + `IPV6_V6ONLY=0` 实现双栈
7. **DNS**：同时配置 A 和 AAAA 记录

**IPv4 vs IPv6 选择决策树**：

```
新项目？ → 双栈（IPv4 + IPv6）
现有项目？ → 逐步添加 IPv6 支持
纯内网？ → IPv6 ULA（fc00::/7）即可
面向全球？ → 双栈 + Happy Eyeballs
```
