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

相比之下，OpenVZ 是容器虚拟化，共享宿主机内核，无法自定义网络栈。

#### 购买步骤

**Step 1: 选择 KVM VPS 套餐**

访问 RackNerd 官网，选择 KVM VPS 产品线：

![RackNerd KVM 选择](/images/posts/2026/01/2026-01-13-racknerd-kvm-selection.png)

**推荐配置**：
- CPU: 1 核心
- RAM: 1GB
- 存储: 20GB SSD
- 带宽: 1Gbps 端口
- 流量: 1TB/月

**Step 2: 配置服务器参数**

配置页面：https://my.racknerd.com/cart.php?a=confproduct&i=0

![RackNerd 配置](/images/posts/2026/01/2026-01-13-racknerd-config.png)

**关键配置项**：

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| **数据中心** | DC02 (Los Angeles) | 延迟最低，推荐首选 |
| **操作系统** | Debian 12 (Bookworm) | 稳定性好，软件包新 |
| **IPv6** | 启用 | 部分地区 IPv6 速度更快 |

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

安装完成后，Hysteria2 会被安装到 `/usr/local/bin/hysteria`。

#### 生成配置文件

创建配置目录：

```bash
mkdir -p /etc/hysteria
```

生成自签名证书（用于 TLS）：

```bash
openssl req -x509 -nodes -newkey ec:<(openssl ecparam -name prime256v1) \
  -keyout /etc/hysteria/server.key \
  -out /etc/hysteria/server.crt \
  -subj "/CN=www.bing.com" \
  -days 36500
```

创建服务端配置文件 `/etc/hysteria/config.yaml`：

```yaml
listen: :443  # 监听端口，建议使用 443 伪装成 HTTPS

tls:
  cert: /etc/hysteria/server.crt
  key: /etc/hysteria/server.key

auth:
  type: password
  password: <your-strong-password>  # 修改为强密码

masquerade:
  type: proxy
  proxy:
    url: https://www.bing.com  # 伪装网站
    rewriteHost: true

quic:
  initStreamReceiveWindow: 8388608      # 8MB
  maxStreamReceiveWindow: 8388608       # 8MB
  initConnReceiveWindow: 20971520       # 20MB
  maxConnReceiveWindow: 20971520        # 20MB
  maxIdleTimeout: 30s
  maxIncomingStreams: 1024

bandwidth:
  up: 1 gbps    # 上行带宽限制
  down: 1 gbps  # 下行带宽限制
```

**配置说明**：

- `listen`: 监听端口，443 端口可以伪装成 HTTPS 流量
- `masquerade`: 当非 Hysteria 客户端访问时，伪装成正常网站
- `quic`: QUIC 协议参数，调大窗口可提升高带宽场景性能
- `bandwidth`: 带宽限制，根据 VPS 实际带宽调整

#### 配置防火墙

```bash
# 启用 UFW 防火墙
ufw enable

# 允许 SSH（避免被锁在外面）
ufw allow 22/tcp

# 允许 Hysteria2 端口（UDP）
ufw allow 443/udp

# 查看防火墙状态
ufw status
```

#### 启动 Hysteria2 服务

创建 systemd 服务文件 `/etc/systemd/system/hysteria.service`：

```ini
[Unit]
Description=Hysteria Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/hysteria server -c /etc/hysteria/config.yaml
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
systemctl daemon-reload
systemctl enable hysteria
systemctl start hysteria
```

检查服务状态：

```bash
systemctl status hysteria
```

查看日志：

```bash
journalctl -u hysteria -f
```

---

## 3. 客户端配置

### 3.1 生成连接 URI

Hysteria2 使用 URI 格式的连接字符串：

```
hysteria2://<password>@<server-ip>:<port>/?insecure=1&sni=www.bing.com#<name>
```

**参数说明**：

| 参数 | 说明 |
|------|------|
| `password` | 服务端配置的密码 |
| `server-ip` | VPS 的公网 IP |
| `port` | 服务端监听端口（默认 443） |
| `insecure=1` | 跳过证书验证（自签名证书需要） |
| `sni=www.bing.com` | TLS SNI，与服务端证书 CN 一致 |
| `#name` | 连接名称（可选） |

**示例**：

```
hysteria2://mypassword@74.48.72.24:443/?insecure=1&sni=www.bing.com#RackNerd-LA
```

![Hysteria2 配置](/images/posts/2026/01/2026-01-13-hysteria2-config.png)

### 3.2 客户端软件配置

#### macOS / Windows

推荐使用 **Clash Verge** 或 **V2rayN**：

1. 下载并安装客户端
2. 导入 Hysteria2 连接 URI
3. 配置系统代理

![Hysteria2 客户端配置](/images/posts/2026/01/2026-01-13-hysteria2-client.png)

**关键配置项**：

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| **系统代理** | 自动配置 | 自动设置系统代理 |
| **路由模式** | 绕过大陆 IP | 国内流量直连，国外走代理 |
| **带宽限制** | 1000 Mbps | 根据本地网络调整 |

#### Linux / CLI

安装 Hysteria2 客户端：

```bash
bash <(curl -fsSL https://get.hy2.sh/)
```

创建客户端配置文件 `~/.config/hysteria/config.yaml`：

```yaml
server: <server-ip>:443

auth: <your-password>

tls:
  sni: www.bing.com
  insecure: true

bandwidth:
  up: 100 mbps
  down: 500 mbps

socks5:
  listen: 127.0.0.1:1080

http:
  listen: 127.0.0.1:8080
```

启动客户端：

```bash
hysteria client -c ~/.config/hysteria/config.yaml
```

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

### 4.3 性能调优建议

#### 服务端优化

1. **调整 UDP 缓冲区大小**：

```bash
echo "net.core.rmem_max=2500000" >> /etc/sysctl.conf
echo "net.core.wmem_max=2500000" >> /etc/sysctl.conf
sysctl -p
```

2. **启用 TCP Fast Open**：

```bash
echo "net.ipv4.tcp_fastopen=3" >> /etc/sysctl.conf
sysctl -p
```

#### 客户端优化

1. **根据实际网络调整带宽参数**
2. **使用有线网络而非 Wi-Fi**
3. **关闭不必要的后台网络应用**

---

## 5. 安全加固

### 5.1 修改 SSH 端口

编辑 `/etc/ssh/sshd_config`：

```bash
Port 2222  # 修改为非标准端口
PermitRootLogin no  # 禁止 root 直接登录
PasswordAuthentication no  # 禁用密码登录，仅允许密钥
```

重启 SSH 服务：

```bash
systemctl restart sshd
```

### 5.2 配置 fail2ban

防止暴力破解：

```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### 5.3 定期更新系统

```bash
apt update && apt upgrade -y
```

---

## 6. 故障排查

### 6.1 连接失败

**检查服务端状态**：

```bash
systemctl status hysteria
journalctl -u hysteria -n 50
```

**检查防火墙**：

```bash
ufw status
```

**检查端口监听**：

```bash
ss -tulnp | grep hysteria
```

### 6.2 速度慢

1. **检查服务端带宽限制**：调整 `config.yaml` 中的 `bandwidth` 参数
2. **检查客户端带宽设置**：不要设置过高或过低
3. **测试 VPS 网络质量**：使用 `mtr` 或 `traceroute`

```bash
mtr <server-ip>
```

### 6.3 频繁断连

1. **调整 QUIC 超时参数**：增大 `maxIdleTimeout`
2. **检查 NAT 超时**：部分路由器 UDP NAT 超时较短
3. **启用 Keep-Alive**：在客户端配置中添加

---

## 7. 参考资源

- [Hysteria2 官方文档](https://v2.hysteria.network/)
- [QUIC 协议规范](https://www.rfc-editor.org/rfc/rfc9000.html)
- [BBR 拥塞控制算法论文](https://research.google/pubs/pub45646/)
- [RackNerd 官网](https://www.racknerd.com/)

---

## 总结

本文介绍了基于 Hysteria2 协议搭建高性能代理服务器的完整流程，包括：

- VPS 选择与购买
- Hysteria2 服务端部署与配置
- 客户端连接与优化
- 性能调优与安全加固

Hysteria2 基于 QUIC 协议，相比传统 TCP 代理具有更低的延迟和更好的抗丢包能力，适合高延迟、高丢包的网络环境。通过合理配置和优化，可以获得接近 VPS 带宽上限的传输速度。
