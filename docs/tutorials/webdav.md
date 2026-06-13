# 自建 WebDAV 实现 Obsidian 多端同步教程

## 适用场景

- 已有云服务器，想让 Obsidian 笔记在多设备间同步
- 不想使用 Obsidian 官方 Sync
- 想用自建服务实现私有云盘同步效果

## 推荐方案

```
云服务器 Docker 部署 WebDAV
    ↓
电脑/手机 Obsidian 安装 Remotely Save 插件
    ↓
所有设备通过 WebDAV 同步同一个 Vault
```

---

## 1. 整体架构

```
Mac/Windows 本地 Obsidian Vault
        ↓ 上传/下载
    云服务器 WebDAV
        ↑ 上传/下载
iPhone/Android Obsidian Vault
```

WebDAV 是一个支持网络读写的文件目录服务。Obsidian 本身读写本地文件，Remotely Save 插件负责将文件同步到服务器。

---

## 2. 为什么推荐 WebDAV

- iPhone / Android / Mac / Windows 都能用
- 服务器只需部署轻量的 WebDAV 服务
- 维护成本比 Nextcloud 低
- 比 Syncthing 更像"中心云盘同步"（iPhone 上 Syncthing 体验不如 Android 原生）

---

## 3. 服务器部署

### 3.1 前置条件

- Ubuntu / Debian / CentOS 等 Linux 系统
- 已安装 Docker 和 Docker Compose
- 云服务器安全组已放行需要的端口

检查 Docker：

```bash
docker --version
docker compose version
```

安装 Docker（Ubuntu）：

```bash
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER
# 重新登录服务器
```

### 3.2 创建项目目录

```bash
sudo mkdir -p /opt/obsidian-webdav/data
sudo chown -R $USER:$USER /opt/obsidian-webdav
cd /opt/obsidian-webdav
```

目录结构：

```
/opt/obsidian-webdav/
├── docker-compose.yml
└── data/          # WebDAV 数据目录
```

### 3.3 创建 Docker Compose 配置

```bash
nano docker-compose.yml
```

写入以下内容：

```yaml
services:
  webdav:
    image: bytemark/webdav
    container_name: obsidian-webdav
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      AUTH_TYPE: Basic
      USERNAME: obsidian
      PASSWORD: "请换成你的强密码"  # 至少16位，包含大小写字母、数字、符号
    volumes:
      - ./data:/var/lib/dav
```

### 3.4 启动服务

```bash
docker compose up -d
docker compose ps
docker logs -f obsidian-webdav
```

### 3.5 测试 WebDAV

```bash
# 测试连接
curl -u obsidian:你的密码 http://服务器IP:8080/

# 测试上传
echo "hello obsidian webdav" > test.md
curl -u obsidian:你的密码 -T test.md http://服务器IP:8080/test.md

# 测试读取
curl -u obsidian:你的密码 http://服务器IP:8080/test.md
```

---

## 4. 反向代理配置

### 4.1 有域名方案（推荐）

配置 HTTPS，安全且无浏览器警告。

#### 4.1.1 配置域名解析

添加 DNS A 记录：

```
类型：A
主机记录：dav
记录值：你的服务器公网 IP
```

验证解析：

```bash
ping dav.yourdomain.com
```

#### 4.1.2 安装 Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### 4.1.3 配置反向代理

创建配置文件：

```bash
sudo nano /etc/nginx/sites-available/obsidian-webdav
```

写入：

```nginx
server {
    listen 80;
    server_name dav.yourdomain.com;

    client_max_body_size 200M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/obsidian-webdav /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4.1.4 配置 HTTPS 证书

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dav.yourdomain.com
# 根据提示选择自动跳转 HTTPS
```

测试：

```bash
curl -u obsidian:你的密码 https://dav.yourdomain.com/
```

#### 4.1.5 限制 Docker 端口

配置好 Nginx 后，修改 `docker-compose.yml`，让 WebDAV 只监听本机：

```yaml
ports:
  - "127.0.0.1:8080:80"  # 只允许本机访问
```

重启服务：

```bash
docker compose down
docker compose up -d
```

#### 4.1.6 如果要给博客构建产物做自动发布，建议单独准备一个发布专用 WebDAV

如果这台 WebDAV 服务器除了给 Obsidian 同步原始笔记，还要接 GitHub Actions 自动发布博客构建产物，建议把两个用途拆开：

- `obsidian-webdav`：给原始笔记同步使用
- `blog-publish-webdav`：给博客构建产物发布使用

原因是一些基于 Apache 的 WebDAV 镜像（例如 `bytemark/webdav`）虽然对根目录 `/` 的 `PROPFIND` 支持正常，但对子目录（例如 `/blog/`）可能会被解析到 `/blog/index.html`，从而返回：

```text
405 Method Not Allowed
Allow: OPTIONS,HEAD,GET,POST,TRACE
```

这会导致 `rclone sync dist mywebdav:/blog` 之类的命令在读取 metadata 时直接失败。

更稳的生产方案是：

1. 保留现有 WebDAV 给 Obsidian 用。
2. 新增一个发布专用 WebDAV，让它的**根目录**直接对应博客构建产物目录。
3. 单独给它配置域名，例如：
   - `dav.yourdomain.com`
4. GitHub Actions 直接同步到远程根目录：

```bash
rclone sync dist mywebdav:/ --progress
```

这样 `rclone` 只需要对根目录做 `PROPFIND`，兼容性最好。

我实际排查时验证到：

- `PROPFIND /`：返回 `207 Multi-Status`
- `PROPFIND /blog/`：返回 `405 Method Not Allowed`

所以不要把“发布构建产物”直接依赖在“笔记同步 WebDAV 的子目录”上。

### 4.2 无域名方案

在拿到域名之前，有以下几种临时方案：

#### 方案一：IP + 端口直接访问（最简单）

**优点**：零配置，立即可用
**缺点**：无 HTTPS，密码明文传输，不安全

直接使用 `http://服务器IP:8080` 访问。

> ⚠️ 警告：HTTP 明文传输密码，仅建议临时测试使用，不建议长期使用。

**安全建议**：
- 使用临时的强密码
- 正式使用域名后立即更换密码
- 云服务器安全组限制 8080 端口只允许你的 IP 访问

限制 IP 访问方法（在云服务器控制台的安全组规则中设置）：

```
协议：TCP
端口：8080
来源：你的IP地址（如 1.2.3.4/32）
```

#### 方案二：自签名证书（推荐临时使用）

**优点**：有 HTTPS 加密，相对安全
**缺点**：浏览器会警告"不安全"，需要手动信任证书

##### 创建自签名证书

在服务器上执行：

```bash
# 创建证书目录
sudo mkdir -p /etc/nginx/ssl

# 生成自签名证书（有效期365天）
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/webdav.key \
  -out /etc/nginx/ssl/webdav.crt \
  -subj "/CN=你的服务器IP" \
  -addext "subjectAltName=IP:你的服务器IP"
```

##### 配置 Nginx 使用自签名证书

创建配置：

```bash
sudo nano /etc/nginx/sites-available/obsidian-webdav-ssl
```

写入：

```nginx
server {
    listen 443 ssl;
    server_name 你的服务器IP;

    ssl_certificate /etc/nginx/ssl/webdav.crt;
    ssl_certificate_key /etc/nginx/ssl/webdav.key;

    client_max_body_size 200M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/obsidian-webdav-ssl /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

开放安全组 443 端口后访问：

```
https://服务器IP/
```

浏览器会显示"您的连接不是私密连接"，点击"高级" → "继续访问"即可。

##### 在 Obsidian 中使用

Remotely Save 配置：

```
Server Address: https://服务器IP/
Username: obsidian
Password: 你的密码
```

> 💡 提示：拿到正式域名后，使用 Certbot 申请 Let's Encrypt 证书替换自签名证书，浏览器警告就会消失。

#### 方案三：使用本地 hosts 模拟域名（仅测试用）

**适用场景**：只在特定设备上临时使用
**优点**：可以用自签名证书绑定域名
**缺点**：每台设备都需要修改 hosts

##### 在服务器生成证书时使用假域名

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/webdav.key \
  -out /etc/nginx/ssl/webdav.crt \
  -subj "/CN=webdav.local" \
  -addext "subjectAltName=DNS:webdav.local"
```

Nginx 配置中的 `server_name` 改为 `webdav.local`。

##### 在客户端设备上修改 hosts

**macOS/Linux**：编辑 `/etc/hosts`

**Windows**：编辑 `C:\Windows\System32\drivers\etc\hosts`

添加：

```
服务器IP  webdav.local
```

然后访问 `https://webdav.local/`

#### 方案对比

| 方案 | 安全性 | 复杂度 | 推荐场景 |
|------|--------|--------|----------|
| IP + 端口直连 | 低（明文传输） | 低 | 临时测试，几分钟内完成 |
| 自签名证书 | 中（加密传输） | 中 | 无域名期间临时使用 |
| hosts 模拟域名 | 中 | 高 | 不推荐，仅特殊场景 |

**推荐路径**：

```
临时测试 → IP直连（几分钟）
    ↓
无域名期间 → 自签名证书（安全）
    ↓
有域名后 → Let's Encrypt 正式证书
```

---

## 5. Obsidian 客户端配置

### 5.1 安装 Remotely Save 插件

```
Settings → Community plugins → Turn on community plugins
→ Browse → 搜索 "Remotely Save" → Install → Enable
```

### 5.2 配置 WebDAV 连接

在 Remotely Save 设置中：

```
Remote Service: WebDAV
Server Address: https://dav.yourdomain.com/   # 或 https://服务器IP/（无域名时）
Username: obsidian
Password: 你的密码
```

> ⚠️ 注意地址末尾的 `/`

### 5.3 首次同步建议

1. 新建一个测试 Vault
2. 配置 WebDAV
3. 测试同步功能
4. 确认正常后再迁移正式笔记库

---

## 6. 使用建议

### 6.1 同步习惯

- 打开 Obsidian 后先同步
- 写完笔记后再同步
- 不要在多个设备同时编辑同一个文件（尤其是日记类文件）

### 6.2 .obsidian 目录处理

`.obsidian/` 包含插件配置、主题、快捷键等。建议：

- ✅ 同步插件配置
- ❌ 不同步 `workspace.json` 和 `workspace-mobile.json`（桌面端和手机端布局不同）
- ❌ 不同步 `.trash`

在 Remotely Save 中配置忽略规则。

### 6.3 附件目录

建议统一存放附件：

```
Settings → Files and links
→ Default location for new attachments
→ In the folder specified below
→ attachments
```

---

## 7. 运维指南

### 7.1 常用命令

```bash
cd /opt/obsidian-webdav

docker compose up -d       # 启动
docker compose down        # 停止
docker compose restart     # 重启
docker compose ps          # 查看状态
docker logs -f obsidian-webdav  # 查看日志
docker compose pull && docker compose up -d  # 更新镜像
```

### 7.2 数据备份

```bash
cd /opt/obsidian-webdav
tar -czf obsidian-webdav-backup-$(date +%F).tar.gz data
```

备份文件：`obsidian-webdav-backup-2026-05-23.tar.gz`

复制到其他服务器：

```bash
scp obsidian-webdav-backup-*.tar.gz user@backup-server:/backup/
```

### 7.3 Git 版本备份（可选）

WebDAV 负责同步，Git 负责版本历史：

```bash
cd 你的ObsidianVault目录
git init
git add .
git commit -m "init vault"
```

定期提交：

```bash
git add . && git commit -m "update notes"
```

---

## 8. 故障排查

### 8.1 无法连接

检查清单：

1. 域名解析是否正常
2. HTTPS 证书是否有效
3. 账号密码是否正确
4. Nginx 是否运行：`sudo systemctl status nginx`
5. Docker 容器是否运行：`docker compose ps`
6. 安全组是否放行 80/443（或 8080）

### 8.2 电脑能同步，手机不能

**第一步：确认手机和电脑用的是同一个"同步源"**

这是最常见的问题。Remotely Save 在每台设备上都要单独配置一次，配置必须完全一致：

手机端打开 Obsidian → 设置 → Remotely Save，确认：

| 配置项 | 检查要点 |
|--------|----------|
| **Remote service** | 电脑选的什么（WebDAV / S3 / Dropbox 等），手机必须完全一样 |
| **Server address** | URL 一个字都不能差，包括末尾有没有 `/` |
| **Username / Password** | 完全一致 |
| **Remote base directory** | 如果电脑端填了子目录名，手机也要填完全一样的（这个很容易漏！） |

> ⚠️ 特别注意：如果电脑端 base directory 留空，手机端也必须留空；如果电脑填了 `my-vault`，手机也要填 `my-vault`，不能写成 `MyVault` 或 `my_vault`。

**其他可能原因：**

- 手机端插件版本旧
- 手机端未开启社区插件
- 手机网络无法访问服务器
- HTTPS 证书问题（自签名证书需要在手机浏览器先访问一次并信任）

### 8.3 出现冲突文件

原因：两个设备同时修改同一文件

处理：

1. 找到冲突文件（通常有 `conflict` 标记）
2. 手动比较合并内容
3. 删除冲突文件
4. 以后养成先同步再编辑的习惯

### 8.4 图片没有同步

检查：

- 图片是否在 Vault 目录内
- 附件目录是否被排除
- 单文件是否超过 Nginx 限制（默认 200M）

调整限制：

```nginx
client_max_body_size 500M;
```

重载 Nginx：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 8.5 自签名证书相关

**浏览器显示不安全**：正常现象，点击"高级"→"继续访问"

**手机端无法连接自签名证书**：
1. 先在手机浏览器访问 `https://服务器IP/`
2. 点击"继续"信任证书
3. 再在 Obsidian 中配置

---

## 9. 安全建议

- ✅ 使用 HTTPS（正式域名用 Let's Encrypt，临时用自签名）
- ✅ 使用强密码（至少 16 位）
- ✅ Docker 端口只绑定 127.0.0.1
- ✅ 安全组只开放必要端口（22, 80, 443）
- ✅ 定期备份 `/opt/obsidian-webdav/data`
- ❌ 不要把密码提交到公开仓库

---

## 10. 配置速查

### 推荐的 docker-compose.yml

```yaml
services:
  webdav:
    image: bytemark/webdav
    container_name: obsidian-webdav
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"
    environment:
      AUTH_TYPE: Basic
      USERNAME: obsidian
      PASSWORD: "请换成你的强密码"
    volumes:
      - ./data:/var/lib/dav
```

### 推荐的 Nginx 配置（有域名）

```nginx
server {
    listen 80;
    server_name dav.yourdomain.com;
    client_max_body_size 200M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
```

申请证书后 Certbot 会自动修改为 HTTPS 配置。

### 推荐的 Nginx 配置（无域名，自签名证书）

```nginx
server {
    listen 443 ssl;
    server_name 你的服务器IP;

    ssl_certificate /etc/nginx/ssl/webdav.crt;
    ssl_certificate_key /etc/nginx/ssl/webdav.key;

    client_max_body_size 200M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
```

---

## 11. 参考资料

- [Remotely Save GitHub](https://github.com/remotely-save/remotely-save)
- [Obsidian Forum - Remotely Save](https://forum.obsidian.md/t/new-plugin-remotely-save/28446)
- [bytemark/webdav Docker Image](https://hub.docker.com/r/bytemark/webdav/)
- [Obsidian Help - Sync notes](https://obsidian.md/help/sync-notes)

---

## 一句话总结

低成本自建 Obsidian 同步：**云服务器 Docker WebDAV + HTTPS + Remotely Save**

先用测试 Vault 验证，再迁移正式笔记库。
