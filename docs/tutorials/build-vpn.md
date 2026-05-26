---
lang: zh-CN
title: 基于 Hysteria2 的高性能代理服务器搭建指南
description: 使用 RackNerd VPS + Hysteria2 协议搭建低延迟、高吞吐的代理服务器
date: 2026-01-13
tags:
  - VPS
  - Hysteria2
  - Proxy
  - Network
---

# 基于 Hysteria2 的高性能代理服务器搭建指南

## 概述

本文介绍如何使用 RackNerd VPS 和 Hysteria2 协议搭建一个高性能的代理服务器。Hysteria2 是基于 QUIC 协议的新一代代理工具，相比传统的 TCP 代理具有以下优势：

- **低延迟**：基于 UDP 的 QUIC 协议，减少握手时间
- **抗丢包**：内置 FEC（前向纠错）机制
- **拥塞控制**：BBR 拥塞控制算法，充分利用带宽
- **伪装性强**：流量特征接近 HTTP/3

## 技术栈

- **VPS 提供商**：RackNerd
- **虚拟化技术**：KVM (Kernel-based Virtual Machine)
- **操作系统**：Debian 12
- **代理协议**：Hysteria2 (基于 QUIC/UDP)
- **传输层**：UDP over IPv4/IPv6

### A.协议层（运输工具）

- **Hysteria 2:** 这是你使用的“运输方式”。它基于 UDP, 特别适合高丢包，高延迟的跨境链路。
- **HTTP/SOCKS5:** 这是代理的“接口协议”。
- 在 v2rayN 里看到的**Mixed Port（10808）** 就是混合接口。
- 终端通过`export http_proxy=...`命令，就是告诉系统：“请把我的流量打包成 HTTP 格式，交给 10808 这个门口的代理程序”。

### B. 端口（出入口）

- **本地端口（10808）**：这是我们本地电脑内部的“校门”，v2rayN 在这里等着接手我们终端的流量。

- **远端接口 （443/13727）**： 这是你服务器上的“大门”。数据包跨越太平洋后，要进入服务器的这个门才能被 Hysteria 识别。

### v2rayN 的核心功能

v2rayN 是一个终端**管理工具**。我可以把它想象成一个“万能播放器”，而我租用的服务器信息（比如 Hysteria2 节点）就是“视频文件”。有了这个播放器，我才能读取并运行这些复杂的网络协议。

#### v2rayN 的核心功能

- **多协议支持**：它支持目前主流的所有加密协议，包括你正在使用的 Hysteria 2，以及经典的 VMess、VLESS、Trojan、Shadowsocks 等。

- **内核切换**：它内置了不同的“引擎”（内核），比如 Xray-core 或 sing-box。你之前在截图里看到的配置项就属于这些内核。

- **路由分流**：这是它最强大的功能。它可以自动判断：访问百度、淘宝走“直连”（不经过代理），访问 Google、GitHub 走“代理”。这样既不影响国内网速，又能上外网。

- **本地端口转发**：它会在你的电脑上开启一个本地门户（比如你配置的 10808 端口），让其他软件（如 Chrome、终端、Termius）可以通过这个门户连接到你的服务器。

---

## 1. VPS 服务器准备

### 1.1 选择 VPS 提供商

**RackNerd** 是一家性价比较高的美国 VPS 提供商，特点：

- 数据中心位于洛杉矶、圣何塞等地，延迟较低
- 支持 KVM 虚拟化，性能优于 OpenVZ
- 价格低廉，适合个人使用
- 官网：https://www.racknerd.com/

### 1.2 购买 KVM VPS

#### 为什么选择 KVM？

**KVM (Kernel-based Virtual Machine)** 是 Linux 内核原生的虚拟化技术：

- **完全虚拟化**：每个 VM 拥有独立的内核，资源隔离性强
- **性能优异**：接近物理机性能，I/O 和网络性能好
- **灵活性高**：可自定义内核参数，支持 BBR 等拥塞控制算法

#### 购买步骤

**Step 1: 选择 KVM VPS 套餐**

访问 RackNerd 官网，选择 KVM VPS 产品线：

![RackNerd KVM 选择](/images/posts/2026/05/2026-05-24-racknerd-kvm-selection.png)

**推荐配置**：

- CPU: 1 核心
- RAM: 1GB
- 存储: 20GB SSD
- 带宽: 1Gbps 端口
- 流量: 1TB/月

**Step 2: 配置服务器参数**

配置页面：https://my.racknerd.com/cart.php?a=confproduct&i=0

![RackNerd 配置](/images/posts/2026/05/2026-05-24-racknerd-config.png)

**关键配置项**：

| 配置项       | 推荐值               | 说明                   |
| ------------ | -------------------- | ---------------------- |
| **数据中心** | DC02 (Los Angeles)   | 延迟最低，推荐首选     |
| **操作系统** | Debian 12 (Bookworm) | 稳定性好，软件包新     |
| **IPv6**     | 启用                 | 部分地区 IPv6 速度更快 |

**为什么选择 Debian？**

- 软件包稳定且更新及时
- 默认防火墙配置合理
- 社区支持好，文档完善

**Step 3: 完成支付**

- 支持支付宝、PayPal、信用卡等支付方式
- 付款后 5-10 分钟内会收到邮件，包含：
  - 服务器 IP 地址
  - SSH 端口（默认 22）
  - root 用户密码

---

## 2. Hysteria2 服务端部署

### 2.1 连接到 VPS

使用 SSH 连接到服务器：

```bash
ssh root@<your-server-ip>
```

首次登录后建议修改 root 密码：

```bash
passwd
```

### 2.2 系统环境准备

#### 更新系统软件包

```bash
apt update && apt upgrade -y
```

#### 安装必要工具

```bash
apt install -y curl wget vim ufw
```

#### 启用 BBR 拥塞控制算法

BBR (Bottleneck Bandwidth and RTT) 是 Google 开发的拥塞控制算法，可显著提升高延迟网络的吞吐量。

检查当前拥塞控制算法：

```bash
sysctl net.ipv4.tcp_congestion_control
```

启用 BBR：

```bash
echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
sysctl -p
```

验证 BBR 是否启用：

```bash
lsmod | grep bbr
# 应该看到 tcp_bbr 模块
```

### 2.3 安装 Hysteria2

#### 使用官方安装脚本

```bash
bash <(curl -fsSL https://get.hy2.sh/)
```

---

## 3. 代理

代理（Proxy）在计算机网络中扮演着“中间人”的角色。简单来说，它是一台位于你的设备（电脑、手机）和目标服务器（如 GitHub、Google）之间的服务器。

当你通过代理访问网页时，数据流不再是直连，而是经历一个中转过程。

### 3.1 代理的基本工作流程

在没有代理的情况下，你的请求直接发给服务器；有了代理后，流程变为：

1. **发起请求**：你的设备把请求发给代理服务器。
2. **代为请求**：代理服务器接收到请求后，用它自己的身份去访问目标服务器。
3. **传回数据**：代理服务器拿到目标服务器的数据，再转交给你的设备。

### 3.2 为什么我们要使用代理？（核心功能）

- **突破访问限制（翻墙）**： 你的 ISP（运营商）屏蔽掉了 Github 以及海外的 IP 地址。代理服务器（如你的 Racknerd VPS）位于海外，它可以自由的访问 Github。我们可以通过加密通道(Hysteria)连上 VPS,VPS 帮我抓取网页再回传给我们。
- **隐藏真实身份（隐私）：** 目标服务器看到的 IP 地址是代理服务器的，而不是你家里的宽带 IP。这在保护隐私和防止攻击时非常有用。
- **网络加速与调优**： 正如将端口改为`443`并限制`Max Bandwidth`一样，优秀的代理协议（如 Hysteria 2）可以通过更聪明的发包算法，在恶劣的网络环境下跑出比直连更快的速度。

---

## 4. 性能优化与测试

### 4.1 带宽测试

使用 `iperf3` 测试实际带宽：

**服务端**：

```bash
apt install -y iperf3
iperf3 -s
```

**客户端**：

```bash
iperf3 -c <server-ip> -p 5201
```

### 4.2 延迟测试

```bash
ping <server-ip>
```

**参考值**：

- 中国大陆到洛杉矶：150-200ms
- 中国大陆到圣何塞：180-220ms

## 5. 配置降低延迟

### step 1: 修改外部端口

通过 ssh 进入购买的圣何塞节点
step 1：在终端输入命令：`sudo nano /etc/hysteria/config.yaml`
![Hysteria2 服务器配置](/images/posts/2026/05/2026-05-24-hysteria2-server-config.png)
并将端口改为 443

### Step 2: 安装 ufw

安装 `ufw`（Uncomplicated Firewall）
由于延迟优化需要开放`52000/udp`端口，我们首先确认系统在使用哪种防火墙，或者直接安装`ufw`。

#### 1. 为什么会有 UFW？

在 Linux 底层，真正的防火墙拦截是由一个叫 iptables 的内核组件完成的。但是 iptables 的命令非常复杂且难以记忆（例如：`iptables -A INPUT -p udp --dport 52000 -j ACCEPT`）。 UFW 就像是给 iptables 套上了一个“极简外壳”，让你能用人类听得懂的语言来管理安全规则。

#### 2. UFW 的核心逻辑

UFW 的工作方式非常直观，通常只需两个动作：允许 (Allow) 或 拒绝 (Deny)。

- **允许流量**：比如你为了让 Hysteria 2 正常工作，运行了 `sudo ufw allow 443/udp`。这句话的意思就是：“请打开 443 端口的大门，允许 UDP 协议的包进来。”

- **拒绝流量**：比如你想封禁某个恶意 IP，只需运行 `sudo ufw deny from 1.2.3.4`。

如果你的系统是 Debian 或 Ubuntu，直接运行以下命令安装即可：

```bash
# 1. 更新包列表
apt update
# 2. 安装 ufw
apt install ufw -y
# 3. 非常重要：在开启防火墙前先允许 SSH，否则你会断开连接！
ufw allow ssh
# 4. 开启你的 Hysteria 端口
ufw allow 52000/udp
# 5. 正式启用防火墙
ufw enable
```

### Step 3:服务器端：调整防火墙

由于我们之前可能没开启 443 的 UDP 权限，或者系统环境变化，建议重新运行：

```bash
sudo ufw allow 443/udp
```

### Step 4: 客户端：修改 v2rayN/shadowrocket 设置

打开 v2rayN 界面：

1. 将**Port**栏改为`443`。
   ![v2rayN 端口配置](/images/posts/2026/05/2026-05-24-v2rayn-port-config.png)
2. 同步优化带宽（关键）：为了尝试进一步降低延迟，在`Max bandwidth`处尝试更保守的设置：
   ![v2rayN 带宽配置](/images/posts/2026/05/2026-05-24-v2rayn-bandwidth-config.png)

- Down: `100`
- Up: `20`

#### 宽带：

在网络配置和代理工具（如 v2rayN）中，**Up** 和 **Down** 是你对这条“加密隧道”设定的流量限速阀门。从之前的操作来看，将这两个数值从 `1000/1000` 降下来，是你的延迟从 **1600ms** 掉到 **341ms** 的核心原因。

##### 1. Up 和 Down 的具体含义

- Up (Upload / 上传)：代表你从 Mac 发送数据到 Racknerd 服务器的速度。

  - **例子：** 你在终端输入命令、点击网页、在 Mosh 里打字。这些动作产生的数据包通过“上传”通道发出去。

- Down (Download / 下载)：代表数据从服务器传回你 Mac 的速度。
  - **例子**：服务器返回命令执行的结果、下载代码、看视频回显。

##### 2. 宽带在这里代表什么？

这里的宽带设置其实是一个**给协议的承诺**。

对于你使用的 **Hysteria 2** 协议，它非常依赖你填写的这两个数值来决定“发包有多猛”：

- **它是“自动调速器”的参考值**：Hysteria 2 使用了一种叫 BBR 的拥塞控制算法。如果你告诉它宽带是 1000（即 1000Mbps，千兆），它就会认为路非常宽，从而拼命地往外扔数据包。

- 为什么填大了会卡？
  - 如果你家宽带或 Racknerd 服务器的实际处理能力达不到 1000Mbps，数据包就会在运营商的路由器里**排队**。
  - **排队 = 延迟飙升**。这就是为什么你填 `1000` 时延迟高达 **1663**ms，而填 `100/20` 后延迟降到了 **341ms** 的原因。

##### 3. 为什么建议设为 100 / 20？

家里的物理宽带可能是 500M 或 1000M，但在跨境网络（中美之间），由于光缆和出口的限制，实际能跑通的稳定带宽通常就在几十兆左右。

- **Up: 20**：对于远程运维（Mosh/SSH）来说，20Mbps 已经绰绰有余（打字只需要几 Kbps）。

- **Down: 100**：保证你下载文件或看网页时有足够的速度，同时又不会因为发包太猛导致链路崩溃。

## 6. 参考资源

- [Hysteria2 官方文档](https://v2.hysteria.network/)
- [QUIC 协议规范](https://www.rfc-editor.org/rfc/rfc9000.html)
- [BBR 拥塞控制算法论文](https://research.google/pubs/pub45646/)
- [RackNerd 官网](https://www.racknerd.com/)
