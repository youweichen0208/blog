---
lang: zh-CN
title: IPv4 全面指南
description: IPv4 地址结构、子网划分、报头格式、NAT 原理、Linux 网络配置、iptables 防火墙和故障排查。
date: 2026-06-20
tags:
  - 网络协议
  - IPv4
  - Linux
  - 子网划分
  - NAT
  - iptables
---

# IPv4 全面指南

IPv4（Internet Protocol version 4）是互联网最广泛使用的网络层协议，定义于 RFC 791（1981 年）。尽管 IPv6 正在逐步普及，IPv4 在可预见的未来仍将是主流。

---

## 第一部分：IPv4 地址基础

### 1.1 地址结构

IPv4 地址是 **32 位二进制数**，通常表示为 **点分十进制**（dotted decimal）：

```
二进制：11000000.10101000.00000001.00000001
十进制：   192   .   168   .    1   .    1
```

每段 8 位（1 字节），范围 0-255。总共 4 段，32 位。

**地址总量**：2^32 = 4,294,967,296（约 43 亿个）

### 1.2 地址分类（历史概念）

早期 IPv4 按 **类别（Class）** 划分地址空间：

| 类别 | 首位 | 网络位 | 主机位 | 地址范围 | 默认子网掩码 |
|------|------|--------|--------|----------|-------------|
| A | 0 | 8 | 24 | 0.0.0.0 - 127.255.255.255 | 255.0.0.0 (/8) |
| B | 10 | 16 | 16 | 128.0.0.0 - 191.255.255.255 | 255.255.0.0 (/16) |
| C | 110 | 24 | 8 | 192.0.0.0 - 223.255.255.255 | 255.255.255.0 (/24) |
| D | 1110 | - | - | 224.0.0.0 - 239.255.255.255 | 多播地址 |
| E | 1111 | - | - | 240.0.0.0 - 255.255.255.255 | 保留实验 |

> **注意**：分类寻址已被 **CIDR（无类别域间路由）** 取代，现代网络不再使用固定类别。

### 1.3 CIDR 和子网掩码

**CIDR**（Classless Inter-Domain Routing，RFC 4632）用 `/前缀长度` 表示网络部分：

```
192.168.1.0/24
         ^^^
         前 24 位是网络地址，后 8 位是主机地址
```

**子网掩码** 是与 IP 地址等长的 32 位数，网络位全 1，主机位全 0：

```
/24 → 11111111.11111111.11111111.00000000 → 255.255.255.0
/16 → 11111111.11111111.00000000.00000000 → 255.255.0.0
/8  → 11111111.00000000.00000000.00000000 → 255.0.0.0
```

**计算可用主机数**：

```
/24 → 主机位 = 32 - 24 = 8 位 → 2^8 - 2 = 254 台主机
/16 → 主机位 = 32 - 16 = 16 位 → 2^16 - 2 = 65,534 台主机
/30 → 主机位 = 32 - 30 = 2 位 → 2^2 - 2 = 2 台主机（常用于点对点链路）
```

> 减 2 是因为 **网络地址**（全 0）和 **广播地址**（全 1）不可分配给主机。

### 1.4 子网划分实战

**场景**：将 `192.168.1.0/24` 划分为 4 个子网。

**步骤**：

1. 需要 4 个子网 → 借 2 位（2^2 = 4）
2. 新前缀 = /24 + 2 = /26
3. 每个子网的主机数 = 2^(32-26) - 2 = 2^6 - 2 = 62

**结果**：

| 子网 | 网络地址 | 可用范围 | 广播地址 |
|------|----------|----------|----------|
| 子网 1 | 192.168.1.0/26 | 192.168.1.1 - 192.168.1.62 | 192.168.1.63 |
| 子网 2 | 192.168.1.64/26 | 192.168.1.65 - 192.168.1.126 | 192.168.1.127 |
| 子网 3 | 192.168.1.128/26 | 192.168.1.129 - 192.168.1.190 | 192.168.1.191 |
| 子网 4 | 192.168.1.192/26 | 192.168.1.193 - 192.168.1.254 | 192.168.1.255 |

**快速计算技巧**：

```
块大小 = 256 - 子网掩码对应段
/26 → 掩码 255.255.255.192 → 块大小 = 256 - 192 = 64
子网：0, 64, 128, 192
```

### 1.5 私有地址和保留地址

| 地址范围 | CIDR | 用途 |
|----------|------|------|
| 10.0.0.0 - 10.255.255.255 | 10.0.0.0/8 | 私有网络（大型企业） |
| 172.16.0.0 - 172.31.255.255 | 172.16.0.0/12 | 私有网络（中型企业） |
| 192.168.0.0 - 192.168.255.255 | 192.168.0.0/16 | 私有网络（家庭/小型） |
| 127.0.0.0 - 127.255.255.255 | 127.0.0.0/8 | 回环地址（localhost） |
| 169.254.0.0 - 169.254.255.255 | 169.254.0.0/16 | 链路本地（APIPA，无 DHCP 时） |
| 0.0.0.0/8 | 0.0.0.0/8 | 当前网络 |
| 255.255.255.255/32 | /32 | 有限广播 |

> **私有地址不可在公网路由**，必须通过 NAT 转换后才能访问互联网。

---

## 第二部分：IPv4 报头格式

### 2.1 报头结构

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version|  IHL  |Type of Service|          Total Length         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Identification        |Flags|      Fragment Offset    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Time to Live |    Protocol   |         Header Checksum       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Source Address                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Destination Address                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Options (if any)                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### 2.2 关键字段说明

| 字段 | 大小 | 作用 |
|------|------|------|
| **Version** | 4 位 | 协议版本，IPv4 = 4 |
| **IHL** | 4 位 | 报头长度（以 4 字节为单位），最小 5（= 20 字节） |
| **Type of Service** | 8 位 | 服务质量（现改为 DSCP/ECN） |
| **Total Length** | 16 位 | 整个 IP 包大小（报头 + 数据），最大 65,535 字节 |
| **Identification** | 16 位 | 分片标识符 |
| **Flags** | 3 位 | 分片控制（DF=禁止分片，MF=还有分片） |
| **Fragment Offset** | 13 位 | 分片偏移量 |
| **TTL** | 8 位 | 生存时间，每经过一个路由器减 1，为 0 时丢弃 |
| **Protocol** | 8 位 | 上层协议号（TCP=6, UDP=17, ICMP=1） |
| **Header Checksum** | 16 位 | 报头校验和 |
| **Source Address** | 32 位 | 源 IP 地址 |
| **Destination Address** | 32 位 | 目标 IP 地址 |

### 2.3 TTL 的实际意义

TTL（Time to Live）防止数据包在网络中无限循环：

```
发送方 TTL=64
→ 路由器 1: TTL=63
→ 路由器 2: TTL=62
→ ...
→ 路由器 64: TTL=0 → 丢弃并发送 ICMP Time Exceeded
```

**常见默认 TTL 值**：
- Linux: 64
- Windows: 128
- Cisco IOS: 255

**用 TTL 判断目标系统**：
```bash
ping -c 1 example.com
# TTL=64 → 可能是 Linux
# TTL=128 → 可能是 Windows
# TTL=255 → 可能是网络设备
```

### 2.4 分片和重组

当 IP 包大于链路的 **MTU**（Maximum Transmission Unit，通常 1500 字节）时，需要分片：

```
原始包：1500 字节数据
MTU=576 的链路：
  分片 1: 576 字节（偏移=0，MF=1）
  分片 2: 576 字节（偏移=72，MF=1）
  分片 3: 576 字节（偏移=144，MF=1）
  分片 4: 剩余（偏移=216，MF=0）
```

**避免分片**：设置 DF（Don't Fragment）标志

```bash
# 发送不允许分片的 ping（用于发现 MTU）
ping -c 4 -M do -s 1472 example.com
# -M do = 设置 DF 标志
# -s 1472 = 数据大小 1472 + 20(IP头) + 8(ICMP头) = 1500
```

---

## 第三部分：NAT（网络地址转换）

### 3.1 NAT 的原理

NAT（Network Address Translation）解决 IPv4 地址不足的问题：

```
内部网络（私有地址）          NAT 路由器            互联网
192.168.1.100:12345 ───→ 转换为 ───→ 203.0.113.1:50001 ───→ 目标服务器
192.168.1.101:23456 ───→ 转换为 ───→ 203.0.113.1:50002 ───→ 目标服务器
```

**NAT 转换表**：

| 内部地址:端口 | 外部地址:端口 | 目标地址:端口 |
|--------------|--------------|--------------|
| 192.168.1.100:12345 | 203.0.113.1:50001 | 93.184.216.34:80 |
| 192.168.1.101:23456 | 203.0.113.1:50002 | 93.184.216.34:80 |

### 3.2 NAT 类型

| 类型 | 说明 | 场景 |
|------|------|------|
| **静态 NAT** | 一对一映射，内部地址固定映射到一个外部地址 | 服务器对外暴露 |
| **动态 NAT** | 从地址池中动态分配外部地址 | 企业网络 |
| **PAT/NAT 过载** | 多个内部地址共享一个外部地址，用端口区分 | 家庭路由器（最常见） |

### 3.3 NAT 的问题

- **端到端连接破坏**：外部无法主动连接 NAT 后的主机
- **P2P 困难**：需要 STUN/TURN/ICE 等技术穿透 NAT
- **协议兼容性**：某些协议（FTP、SIP）在载荷中嵌入 IP 地址，需要 ALG（Application Layer Gateway）
- **调试困难**：日志中看到的是 NAT 后的地址，追踪困难

---

## 第四部分：Linux 中的 IPv4 配置

### 4.1 查看 IP 地址

```bash
# 查看所有网络接口
ip addr show
# 简写
ip a

# 只看 IPv4
ip -4 addr show

# 查看特定接口
ip addr show eth0

# 旧命令（已弃用但仍可用）
ifconfig
```

**输出解读**：

```
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP
    inet 192.168.1.100/24 brd 192.168.1.255 scope global dynamic eth0
       valid_lft 86399sec preferred_lft 86399sec
    inet6 fe80::1/64 scope link
```

- `inet 192.168.1.100/24` — IPv4 地址和子网掩码
- `brd 192.168.1.255` — 广播地址
- `scope global dynamic` — 全局地址，通过 DHCP 获取
- `valid_lft` — 租约剩余时间

### 4.2 配置静态 IP

**方式 1：ip 命令（临时，重启失效）**

```bash
# 添加 IP 地址
sudo ip addr add 192.168.1.100/24 dev eth0

# 删除 IP 地址
sudo ip addr del 192.168.1.100/24 dev eth0

# 启用/禁用接口
sudo ip link set eth0 up
sudo ip link set eth0 down
```

**方式 2：Netplan（Ubuntu 18.04+，永久）**

编辑 `/etc/netplan/01-config.yaml`：

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

```bash
# 应用配置
sudo netplan apply

# 调试
sudo netplan try
```

**方式 3：NetworkManager（nmcli）**

```bash
# 设置静态 IP
sudo nmcli con mod eth0 ipv4.addresses 192.168.1.100/24
sudo nmcli con mod eth0 ipv4.gateway 192.168.1.1
sudo nmcli con mod eth0 ipv4.dns "8.8.8.8 8.8.4.4"
sudo nmcli con mod eth0 ipv4.method manual

# 应用
sudo nmcli con up eth0
```

### 4.3 路由配置

```bash
# 查看路由表
ip route show
# 简写
ip r

# 输出示例：
# default via 192.168.1.1 dev eth0 proto dhcp metric 100
# 192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.100

# 添加默认路由
sudo ip route add default via 192.168.1.1 dev eth0

# 添加静态路由（特定网络走特定网关）
sudo ip route add 10.0.0.0/8 via 192.168.1.254 dev eth0

# 删除路由
sudo ip route del 10.0.0.0/8

# 查看到达目标的路径
ip route get 8.8.8.8
```

### 4.4 DNS 配置

```bash
# 查看 DNS 服务器
cat /etc/resolv.conf
# nameserver 8.8.8.8
# nameserver 8.8.4.4

# 测试 DNS 解析
dig example.com
nslookup example.com
host example.com

# 指定 DNS 服务器查询
dig @8.8.8.8 example.com

# 查看 DNS 缓存（如果安装了 systemd-resolved）
resolvectl statistics
```

---

## 第五部分：iptables 防火墙

### 5.1 iptables 基础概念

iptables 是 Linux 内核 Netfilter 框架的用户空间工具，用于配置 IPv4 防火墙规则。

**三表五链**：

| 表 | 用途 | 包含的链 |
|------|------|----------|
| **filter** | 包过滤（最常用） | INPUT, FORWARD, OUTPUT |
| **nat** | 地址转换 | PREROUTING, POSTROUTING, OUTPUT |
| **mangle** | 修改包头 | PREROUTING, INPUT, FORWARD, OUTPUT, POSTROUTING |

**链的处理顺序**：

```
入站包 → PREROUTING(mangle/nat) → 路由决策 → INPUT(filter/mangle) → 本地进程
本地进程 → OUTPUT(filter/nat/mangle) → 路由决策 → POSTROUTING(nat/mangle) → 出站包
转发包 → PREROUTING → FORWARD(filter) → POSTROUTING
```

### 5.2 常用规则

**查看规则**：

```bash
# 查看所有规则（带计数）
sudo iptables -L -v -n --line-numbers

# 只看 filter 表的 INPUT 链
sudo iptables -L INPUT -v -n

# 查看 nat 表
sudo iptables -t nat -L -v -n
```

**基础规则示例**：

```bash
# 清空所有规则（谨慎！）
sudo iptables -F

# 设置默认策略
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT

# 允许回环接口
sudo iptables -A INPUT -i lo -j ACCEPT

# 允许已建立的连接
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 允许 SSH（22 端口）
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 允许 HTTP/HTTPS
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 允许 ICMP（ping）
sudo iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT

# 允许特定 IP 访问
sudo iptables -A INPUT -s 192.168.1.0/24 -j ACCEPT

# 拒绝特定 IP
sudo iptables -A INPUT -s 10.0.0.5 -j DROP

# 记录被丢弃的包（调试用）
sudo iptables -A INPUT -j LOG --log-prefix "IPTABLES-DROP: " --log-level 4
```

**NAT 规则**：

```bash
# SNAT（源地址转换，用于共享上网）
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# DNAT（端口转发）
# 将外部 8080 端口转发到内部 192.168.1.100:80
sudo iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination 192.168.1.100:80

# 允许转发
sudo iptables -A FORWARD -p tcp -d 192.168.1.100 --dport 80 -j ACCEPT
```

### 5.3 保存和恢复规则

```bash
# 保存规则（Debian/Ubuntu）
sudo iptables-save > /etc/iptables/rules.v4

# 恢复规则
sudo iptables-restore < /etc/iptables/rules.v4

# 安装持久化包
sudo apt install iptables-persistent
```

### 5.4 nftables（iptables 的替代者）

nftables 是 iptables 的继任者，语法更简洁，性能更好：

```bash
# 查看规则
sudo nft list ruleset

# 创建表和链
sudo nft add table inet filter
sudo nft add chain inet filter input { type filter hook input priority 0 \; }

# 添加规则
sudo nft add rule inet filter input iif lo accept
sudo nft add rule inet filter input ct state established,related accept
sudo nft add rule inet filter input tcp dport 22 accept
sudo nft add rule inet filter input tcp dport { 80, 443 } accept

# 保存规则
sudo nft list ruleset > /etc/nftables.conf
```

---

## 第六部分：故障排查

### 6.1 连接性检查

```bash
# 1. Ping 测试（ICMP）
ping -c 4 8.8.8.8
# 如果失败：可能是防火墙阻止 ICMP，或网络不通

# 2. Traceroute（追踪路由路径）
traceroute 8.8.8.8
# 或
mtr 8.8.8.8  # 更好的交互式工具

# 3. 端口连通性测试
nc -zv 8.8.8.8 53
# 或
telnet 8.8.8.8 53

# 4. 查看 ARP 表（链路层地址解析）
ip neigh show
# 或旧命令
arp -a
```

### 6.2 抓包分析

```bash
# 安装 tcpdump
sudo apt install tcpdump

# 抓取所有进出 eth0 的包
sudo tcpdump -i eth0 -n

# 只抓取特定 IP 的包
sudo tcpdump -i eth0 host 192.168.1.100

# 只抓取特定端口
sudo tcpdump -i eth0 port 80

# 保存为 pcap 文件（可用 Wireshark 打开）
sudo tcpdump -i eth0 -w capture.pcap

# 读取 pcap 文件
tcpdump -r capture.pcap
```

### 6.3 常见问题排查

**问题 1：无法 ping 通外网**

```bash
# 检查清单：
# 1. 接口是否 up
ip link show eth0

# 2. 是否有 IP 地址
ip addr show eth0

# 3. 是否有默认路由
ip route show

# 4. DNS 是否正常
dig @8.8.8.8 example.com

# 5. 网关是否可达
ping 192.168.1.1  # 替换为你的网关
```

**问题 2：同网段设备无法通信**

```bash
# 1. 确认子网掩码一致
ip addr show eth0  # 两边都检查

# 2. 检查防火墙是否阻止
sudo iptables -L INPUT -v -n

# 3. 检查 ARP 表
ip neigh show 192.168.1.101
# 如果显示 FAILED，说明链路层不通

# 4. 检查接口状态
ethtool eth0  # 查看物理连接状态
```

**问题 3：NAT 后无法访问互联网**

```bash
# 1. 确认 IP 转发已启用
cat /proc/sys/net/ipv4/ip_forward
# 应该显示 1，如果是 0：
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward

# 永久启用
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 2. 确认 NAT 规则存在
sudo iptables -t nat -L POSTROUTING -v -n

# 3. 确认 FORWARD 规则允许
sudo iptables -L FORWARD -v -n
```

**问题 4：MTU 导致的连接问题**

```bash
# 症状：SSH 能连但 SCP 卡住，网页部分加载

# 发现正确 MTU
ping -c 4 -M do -s 1472 example.com  # 1472 + 28 = 1500
# 如果失败，逐步减小：
ping -c 4 -M do -s 1464 example.com  # 1464 + 28 = 1492 (PPPoE 常见)

# 设置 MTU
sudo ip link set eth0 mtu 1492
```

### 6.4 网络诊断工具汇总

| 工具 | 用途 | 安装 |
|------|------|------|
| `ping` | ICMP 连通性 | 内置 |
| `traceroute` | 路由追踪 | `apt install traceroute` |
| `mtr` | 交互式路由追踪 | `apt install mtr` |
| `tcpdump` | 抓包分析 | `apt install tcpdump` |
| `ss` | 套接字统计 | 内置 |
| `ip` | 接口/路由/地址管理 | 内置 |
| `dig`/`nslookup` | DNS 查询 | `apt install dnsutils` |
| `nc` (netcat) | 端口测试/数据传输 | `apt install netcat-openbsd` |
| `ethtool` | 网卡物理层信息 | `apt install ethtool` |
| `iftop` | 实时流量监控 | `apt install iftop` |
| `nmap` | 端口扫描/网络探测 | `apt install nmap` |

---

## 第七部分：常用内核参数调优

```bash
# 查看当前参数
sysctl net.ipv4.ip_forward
sysctl net.ipv4.tcp_keepalive_time

# 常用调优（添加到 /etc/sysctl.conf）

# 启用 IP 转发（路由器/NAT 需要）
net.ipv4.ip_forward = 1

# TCP 连接保活时间（秒）
net.ipv4.tcp_keepalive_time = 600

# 启用 SYN Cookie 防护（防 SYN Flood 攻击）
net.ipv4.tcp_syncookies = 1

# TIME_WAIT 复用（高并发服务器）
net.ipv4.tcp_tw_reuse = 1

# 本地端口范围（高并发客户端）
net.ipv4.ip_local_port_range = 1024 65535

# TCP 接收/发送缓冲区
net.ipv4.tcp_rmem = 4096 87380 6291456
net.ipv4.tcp_wmem = 4096 16384 6291456

# 应用
sudo sysctl -p
```

---

## 总结

**IPv4 核心要点**：

1. **32 位地址**：用 CIDR `/前缀长度` 表示网络和主机部分
2. **私有地址**：10.0.0.0/8、172.16.0.0/12、192.168.0.0/16 不可公网路由
3. **NAT**：解决地址不足，但破坏端到端连接
4. **TTL**：防止包无限循环，每跳减 1
5. **iptables/nftables**：Linux 防火墙核心，理解三表五链
6. **故障排查**：ping → traceroute → tcpdump → 逐步定位
