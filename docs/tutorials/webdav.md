# 自建云服务器 + WebDAV 实现 Obsidian 多端同步教程

  

适用场景：  

- 你已经有一台云服务器

- 想让本地电脑上的 Obsidian 笔记同步到手机端 Obsidian

- 不想使用 Obsidian 官方 Sync

- 想用自建服务实现类似“私有云盘同步”的效果

  

本教程推荐方案：

  

```text

云服务器 Docker 部署 WebDAV

电脑端 Obsidian 安装 Remotely Save 插件

手机端 Obsidian 安装 Remotely Save 插件

电脑和手机都通过 WebDAV 同步同一个 Vault

```

  

---

  

## 1. 整体架构

  

最终结构如下：

  

```text

Mac / Windows 本地 Obsidian Vault

↓ 上传 / 下载

云服务器 WebDAV 目录

↑ 上传 / 下载

iPhone / Android Obsidian Vault

```

  

WebDAV 可以理解成一个支持网络读写的文件目录。

  

Obsidian 本身仍然读写本地文件，真正负责把文件上传到服务器、从服务器下载到本地的是 Obsidian 插件 Remotely Save。

  

---

  

## 2. 为什么推荐 WebDAV，而不是直接 Syncthing？

  

如果你是 Android 手机，Syncthing 也很好用。

  

但是如果你是 iPhone，Syncthing 的体验没有 Android 原生，通常要借助第三方 iOS 客户端，比如 Möbius Sync。

  

WebDAV + Remotely Save 的优点是：

  

- iPhone / Android / Mac / Windows 都能用

- 不需要让手机系统直接暴露复杂的同步目录

- 服务器只需要部署一个很轻量的 WebDAV 服务

- 维护成本比 Nextcloud 低

- 比 Syncthing 更像“中心云盘同步”

  

所以本教程默认使用：

  

```text

Docker WebDAV + Obsidian Remotely Save

```

  

---

  

## 3. 服务器目录应该放哪里？

  

推荐放在：

  

```bash

/opt/obsidian-webdav

```

  

原因：

  

```text

/opt 适合放自己额外部署的服务或应用

/home 适合放用户自己的普通文件

/var/lib 适合放系统服务长期数据

```

  

个人云服务器部署 Docker 项目时，用 `/opt/项目名` 会比较清晰。

  

最终目录结构：

  

```text

/opt/obsidian-webdav/

├── docker-compose.yml

└── data/

```

  

其中：

  

```text

/opt/obsidian-webdav/data/

```

  

就是 WebDAV 里真正存放 Obsidian 笔记数据的目录。

  

---

  

## 4. 前置条件

  

服务器需要具备：

  

- Ubuntu / Debian / CentOS 等 Linux 系统

- 已安装 Docker

- 已安装 Docker Compose

- 云服务器安全组已放行需要的端口

- 最好有一个域名，用于配置 HTTPS

  

检查 Docker：

  

```bash

docker --version

docker compose version

```

  

如果没有 Docker，需要先安装 Docker。

  

Ubuntu 常见安装方式：

  

```bash

curl -fsSL https://get.docker.com | bash

```

  

安装完成后可以把当前用户加入 docker 组：

  

```bash

sudo usermod -aG docker $USER

```

  

然后重新登录服务器。

  

如果你不想处理权限，也可以所有 Docker 命令都加 `sudo`。

  

---

  

## 5. 创建 WebDAV 项目目录

  

进入服务器，执行：

  

```bash

sudo mkdir -p /opt/obsidian-webdav/data

cd /opt/obsidian-webdav

```

  

如果你希望当前用户可以直接编辑这个目录，可以执行：

  

```bash

sudo chown -R $USER:$USER /opt/obsidian-webdav

```

  

---

  

## 6. 创建 docker-compose.yml

  

在 `/opt/obsidian-webdav` 下创建配置文件：

  

```bash

nano docker-compose.yml

```

  

写入下面内容：

  

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

PASSWORD: "请换成你的强密码"

volumes:

- ./data:/var/lib/dav

```

  

保存退出。

  

如果你用的是 nano：

  

```text

Ctrl + O 保存

Enter 确认

Ctrl + X 退出

```

  

注意修改：

  

```yaml

PASSWORD: "请换成你的强密码"

```

  

建议密码至少 16 位，包含大小写字母、数字和符号。

  

---

  

## 7. 启动 WebDAV 服务

  

在 `/opt/obsidian-webdav` 目录执行：

  

```bash

docker compose up -d

```

  

查看状态：

  

```bash

docker compose ps

```

  

查看日志：

  

```bash

docker logs -f obsidian-webdav

```

  

如果容器正常运行，说明 WebDAV 服务已经启动。

  

---

  

## 8. 本地测试 WebDAV

  

先用 curl 测试：

  

```bash

curl -u obsidian:你的密码 http://服务器IP:8080/

```

  

如果能看到返回内容，说明 WebDAV 可以访问。

  

也可以测试上传一个文件：

  

```bash

echo "hello obsidian webdav" > test.md

  

curl -u obsidian:你的密码 -T test.md http://服务器IP:8080/test.md

```

  

然后测试读取：

  

```bash

curl -u obsidian:你的密码 http://服务器IP:8080/test.md

```

  

如果能看到：

  

```text

hello obsidian webdav

```

  

说明上传和读取都正常。

  

---

  

## 9. 云服务器安全组放行端口

  

如果你临时用 IP + 8080 访问，需要在云服务器安全组放行：

  

```text

TCP 8080

```

  

但是不建议长期裸露 8080。

  

正式使用建议：

  

```text

外部访问 443 HTTPS

Nginx 反向代理到本机 8080

```

  

也就是：

  

```text

https://dav.yourdomain.com

↓

Nginx

↓

http://127.0.0.1:8080

```

  

---

  

## 10. 配置域名解析

  

假设你有域名：

  

```text

yourdomain.com

```

  

可以添加一条 DNS 记录：

  

```text

类型：A

主机记录：dav

记录值：你的服务器公网 IP

```

  

最终访问地址：

  

```text

dav.yourdomain.com

```

  

等待 DNS 生效后，在本地测试：

  

```bash

ping dav.yourdomain.com

```

  

如果能解析到你的服务器 IP，说明域名解析正常。

  

---

  

## 11. 安装 Nginx

  

Ubuntu / Debian：

  

```bash

sudo apt update

sudo apt install -y nginx

```

  

启动并设置开机自启：

  

```bash

sudo systemctl enable nginx

sudo systemctl start nginx

```

  

检查状态：

  

```bash

sudo systemctl status nginx

```

  

---

  

## 12. 配置 Nginx 反向代理 WebDAV

  

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

  

把：

  

```text

dav.yourdomain.com

```

  

改成你自己的域名。

  

启用配置：

  

```bash

sudo ln -s /etc/nginx/sites-available/obsidian-webdav /etc/nginx/sites-enabled/obsidian-webdav

```

  

测试 Nginx 配置：

  

```bash

sudo nginx -t

```

  

重载 Nginx：

  

```bash

sudo systemctl reload nginx

```

  

现在可以测试：

  

```bash

curl -u obsidian:你的密码 http://dav.yourdomain.com/

```

  

---

  

## 13. 配置 HTTPS 证书

  

安装 Certbot：

  

```bash

sudo apt install -y certbot python3-certbot-nginx

```

  

申请证书：

  

```bash

sudo certbot --nginx -d dav.yourdomain.com

```

  

根据提示选择自动跳转 HTTPS。

  

完成后测试：

  

```bash

curl -u obsidian:你的密码 https://dav.yourdomain.com/

```

  

如果正常返回，说明 HTTPS 已经配置成功。

  

---

  

## 14. 调整 Docker 端口暴露方式

  

配置好 Nginx 后，建议不要让 8080 暴露到公网。

  

可以把 `docker-compose.yml` 改成：

  

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

  

关键区别：

  

```yaml

ports:

- "127.0.0.1:8080:80"

```

  

这表示 WebDAV 只允许服务器本机访问 8080，再由 Nginx 统一对外提供 HTTPS。

  

重新启动：

  

```bash

cd /opt/obsidian-webdav

docker compose down

docker compose up -d

```

  

---

  

## 15. 电脑端 Obsidian 配置 Remotely Save

  

打开电脑上的 Obsidian。

  

进入：

  

```text

Settings

→ Community plugins

→ Turn on community plugins

→ Browse

→ 搜索 Remotely Save

→ Install

→ Enable

```

  

然后进入 Remotely Save 设置。

  

选择远程服务：

  

```text

Remote Service: WebDAV

```

  

填写：

  

```text

Server Address: https://dav.yourdomain.com/

Username: obsidian

Password: 你的密码

```

  

然后点击插件里的测试连接或同步按钮。

  

第一次建议用一个测试 Vault，不要直接操作你的正式笔记库。

  

---

  

## 16. 手机端 Obsidian 配置 Remotely Save

  

手机端 Obsidian 也安装 Remotely Save 插件。

  

进入：

  

```text

Settings

→ Community plugins

→ Browse

→ Remotely Save

→ Install

→ Enable

```

  

然后同样配置：

  

```text

Remote Service: WebDAV

Server Address: https://dav.yourdomain.com/

Username: obsidian

Password: 你的密码

```

  

手机端第一次建议：

  

1. 新建一个空 Vault

2. 安装 Remotely Save

3. 配置 WebDAV

4. 执行同步

5. 确认服务器上的文件能下载到手机

  

---

  

## 17. 推荐同步习惯

  

为了减少冲突，建议养成这个习惯：

  

```text

打开 Obsidian 后先同步

写完笔记后再同步

不要在电脑和手机上同时编辑同一个文件

```

  

尤其是日记类文件，例如：

  

```text

2026-05-23.md

```

  

如果电脑和手机同时编辑，很容易出现冲突文件。

  

---

  

## 18. 是否同步 .obsidian 目录？

  

Obsidian 的配置目录是：

  

```text

.obsidian/

```

  

里面包含：

  

- 插件配置

- 主题配置

- 快捷键配置

- 工作区布局

- 手机端布局配置

  

是否同步它要看你的需求。

  

新手建议：

  

```text

可以同步插件配置

但谨慎同步 workspace 相关文件

```

  

建议排除：

  

```text

.obsidian/workspace.json

.obsidian/workspace-mobile.json

.trash

```

  

原因：

  

- workspace 文件主要记录当前打开了哪些标签页、窗口布局

- 桌面端和手机端布局不同

- 多端同步 workspace 容易造成界面混乱

  

---

  

## 19. 附件目录建议

  

建议把 Obsidian 附件统一放在：

  

```text

attachments/

```

  

在 Obsidian 里设置：

  

```text

Settings

→ Files and links

→ Default location for new attachments

```

  

可以设置成：

  

```text

In the folder specified below

```

  

然后指定：

  

```text

attachments

```

  

这样图片、PDF、截图不会散落在各个目录里，更方便同步和备份。

  

---

  

## 20. 自动同步设置建议

  

Remotely Save 支持自动同步，但需要注意：

  

```text

自动同步只有在 Obsidian 打开时才会运行

Obsidian 在后台时，插件通常无法继续执行同步

```

  

建议配置：

  

```text

启动 Obsidian 后自动同步：开启

每隔几分钟自动同步：可以设为 5 ~ 10 分钟

关闭 Obsidian 前手动同步：建议养成习惯

```

  

如果你的笔记很重要，不要完全依赖自动同步。

  

---

  

## 21. 服务器数据备份

  

你的 WebDAV 数据目录是：

  

```bash

/opt/obsidian-webdav/data

```

  

建议定期备份。

  

手动备份：

  

```bash

cd /opt/obsidian-webdav

tar -czf obsidian-webdav-backup-$(date +%F).tar.gz data

```

  

备份文件类似：

  

```text

obsidian-webdav-backup-2026-05-23.tar.gz

```

  

可以复制到其他地方：

  

```bash

scp obsidian-webdav-backup-2026-05-23.tar.gz user@另一台服务器:/backup/

```

  

---

  

## 22. 使用 Git 做额外保险

  

如果你熟悉 Git，也可以在本地 Vault 里额外使用 Git 备份。

  

例如：

  

```bash

cd 你的ObsidianVault目录

git init

git add .

git commit -m "init obsidian vault"

```

  

以后定期：

  

```bash

git add .

git commit -m "update notes"

```

  

注意：Git 不是同步工具，而是版本备份工具。

  

推荐组合：

  

```text

WebDAV 负责多端同步

Git 负责历史版本备份

```

  

---

  

## 23. 常用运维命令

  

进入项目目录：

  

```bash

cd /opt/obsidian-webdav

```

  

启动：

  

```bash

docker compose up -d

```

  

停止：

  

```bash

docker compose down

```

  

重启：

  

```bash

docker compose restart

```

  

查看状态：

  

```bash

docker compose ps

```

  

查看日志：

  

```bash

docker logs -f obsidian-webdav

```

  

更新镜像：

  

```bash

docker compose pull

docker compose up -d

```

  

---

  

## 24. 常见问题排查

  

### 24.1 手机端无法连接

  

检查以下内容：

  

```text

1. 域名是否能正常解析

2. HTTPS 证书是否正常

3. 账号密码是否正确

4. Nginx 是否正常运行

5. Docker 容器是否正常运行

6. 云服务器安全组是否放行 80 / 443

```

  

命令：

  

```bash

docker compose ps

sudo systemctl status nginx

curl -u obsidian:你的密码 https://dav.yourdomain.com/

```

  

---

  

### 24.2 电脑能同步，手机不能同步

  

可能原因：

  

```text

1. 手机端插件版本较旧

2. 手机端 Obsidian 没有正确开启社区插件

3. WebDAV 地址末尾斜杠问题

4. 手机网络无法访问服务器

5. HTTPS 证书链有问题

```

  

可以尝试把地址写成：

  

```text

https://dav.yourdomain.com/

```

  

注意最后的 `/`。

  

---

  

### 24.3 出现冲突文件

  

通常是因为两个设备同时修改了同一个文件。

  

处理方式：

  

```text

1. 找到冲突文件

2. 手动比较内容

3. 合并正确内容

4. 删除多余冲突文件

5. 以后写之前先同步，写完之后再同步

```

  

---

  

### 24.4 图片没有同步

  

检查：

  

```text

1. 图片是否在 Vault 目录内

2. 附件目录是否被排除

3. Remotely Save 是否设置了忽略大文件

4. 单个文件大小是否超过 Nginx 限制

```

  

如果图片较大，可以调整 Nginx：

  

```nginx

client_max_body_size 500M;

```

  

然后重载：

  

```bash

sudo nginx -t

sudo systemctl reload nginx

```

  

---

  

### 24.5 8080 端口无法访问

  

如果你已经把 Docker 改成：

  

```yaml

ports:

- "127.0.0.1:8080:80"

```

  

那么公网访问：

  

```text

http://服务器IP:8080

```

  

会失败，这是正常的。

  

这代表 8080 只允许服务器本机访问。

  

你应该访问：

  

```text

https://dav.yourdomain.com/

```

  

---

  

## 25. 安全建议

  

建议做到：

  

```text

1. 使用 HTTPS

2. 使用强密码

3. Docker 的 8080 只绑定 127.0.0.1

4. 云服务器安全组只开放 22、80、443

5. 不要把 WebDAV 密码写到公开仓库

6. 定期备份 /opt/obsidian-webdav/data

```

  

如果 SSH 只自己用，也建议修改默认端口或限制来源 IP。

  

---

  

## 26. 最终推荐配置

  

服务器路径：

  

```text

/opt/obsidian-webdav

```

  

数据目录：

  

```text

/opt/obsidian-webdav/data

```

  

WebDAV 内部端口：

  

```text

127.0.0.1:8080

```

  

公网访问地址：

  

```text

https://dav.yourdomain.com/

```

  

Obsidian 插件：

  

```text

Remotely Save

```

  

同步习惯：

  

```text

打开先同步

写完再同步

不要多端同时改同一个文件

```

  

---

  

## 27. 完整 docker-compose.yml 推荐版

  

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

  

---

  

## 28. 完整 Nginx 配置推荐版

  

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

  

申请 HTTPS 后，Certbot 会自动帮你改成 443 配置。

  

---

  

## 29. 参考资料

  

- Remotely Save GitHub: https://github.com/remotely-save/remotely-save

- Obsidian Forum - Remotely Save: https://forum.obsidian.md/t/new-plugin-remotely-save/28446

- bytemark/webdav Docker Image: https://hub.docker.com/r/bytemark/webdav/

- dgraziotin nginx-webdav-nononsense: https://github.com/dgraziotin/docker-nginx-webdav-nononsense

- Obsidian Help - Sync notes: https://obsidian.md/help/sync-notes

  

---

  

## 30. 一句话总结

  

如果你想低成本、自建、跨电脑和手机同步 Obsidian，最稳妥的方案是：

  

```text

云服务器 Docker WebDAV + HTTPS + Obsidian Remotely Save

```

  

先用测试 Vault 跑通，再迁移正式笔记库。