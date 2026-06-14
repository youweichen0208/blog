---
lang: zh-CN
title: curl 命令实战指南
description: HTTP 调试、API 测试、文件下载、DNS 解析验证等 curl 常用场景。
date: 2026-06-06
tags:
  - Linux
  - 网络诊断
  - curl
  - HTTP
---

# curl 命令实战指南

`curl`（Client URL）是一个强大的命令行工具，用于从服务器传输数据或向服务器传输数据。支持 HTTP、HTTPS、FTP、SFTP 等多种协议。

## 基础语法

```bash
curl [选项] [URL]
```

## 场景一：基本 HTTP 请求

### GET 请求（默认）

```bash
# 获取网页内容
curl https://example.com

# 获取并保存为文件
curl -o page.html https://example.com

# 用大写的 -O 保留原始文件名
curl -O https://example.com/file.txt
```

### POST 请求

```bash
# 发送表单数据
curl -X POST -d "name=alice&age=30" https://api.example.com/users

# 发送 JSON 数据
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"alice","age":30}' \
  https://api.example.com/users
```

### PUT 请求（更新）

```bash
curl -X PUT \
  -H "Content-Type: application/json" \
  -d '{"name":"alice","age":31}' \
  https://api.example.com/users/123
```

### DELETE 请求

```bash
curl -X DELETE https://api.example.com/users/123
```

## 场景二：查看完整 HTTP 交互

### 只看响应头

```bash
curl -I https://example.com
```

输出示例：

```
HTTP/2 200
content-type: text/html; charset=UTF-8
date: Thu, 06 Jun 2026 10:00:00 GMT
server: nginx
content-length: 1256
vary: Accept-Encoding
```

### 查看请求头 + 响应头

```bash
curl -v https://example.com
```

输出会显示完整的握手过程：

```
*   Trying 93.184.216.34:443...
* Connected to example.com (93.184.216.34) port 443 (#0)
> GET / HTTP/2
> Host: example.com
> User-Agent: curl/8.1.2
> Accept: */*
>
< HTTP/2 200
< content-type: text/html; charset=UTF-8
```

### 只看请求头（不发请求）

```bash
curl -v -s -o /dev/null https://example.com 2>&1 | grep "^>"
```

## 场景三：API 测试

### 带认证的请求

```bash
# Bearer Token
curl -H "Authorization: Bearer your_token_here" \
  https://api.example.com/data

# API Key in Header
curl -H "X-API-Key: your_key_here" \
  https://api.example.com/data

# Basic Auth
curl -u username:password https://api.example.com/data
```

### 设置请求超时

```bash
# 连接超时 5 秒，最大时间 30 秒
curl --connect-timeout 5 --max-time 30 \
  https://api.example.com/slow-endpoint
```

### 跟随重定向

```bash
# -L 自动跟随 3xx 重定向
curl -L https://bit.ly/some-short-url
```

### 完整的 API 测试示例

```bash
# 创建用户
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{
    "name": "Alice",
    "email": "alice@example.com",
    "age": 30
  }' \
  -v

# 获取用户列表
curl https://api.example.com/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  | jq '.[] | {id, name, email}'

# 更新用户
curl -X PUT https://api.example.com/users/123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{"age": 31}'

# 删除用户
curl -X DELETE https://api.example.com/users/123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## 场景四：文件上传与下载

### 下载文件

```bash
# 保存到当前目录（保留文件名）
curl -O https://example.com/file.zip

# 指定保存路径
curl -o /tmp/downloaded.zip https://example.com/file.zip

# 显示进度条
curl -# -O https://example.com/large-file.iso

# 断点续传（如果支持）
curl -C - -O https://example.com/large-file.zip
```

### 上传文件

```bash
# 表单上传（multipart/form-data）
curl -X POST \
  -F "file=@/path/to/local-file.txt" \
  https://api.example.com/upload

# 带额外字段
curl -X POST \
  -F "file=@/path/to/image.png" \
  -F "description=My photo" \
  -F "category=personal" \
  https://api.example.com/upload

# 二进制上传（PUT 原始文件）
curl -X PUT \
  --data-binary @/path/to/file.bin \
  https://storage.example.com/bucket/object
```

## 场景五：DNS 与网络诊断

### 测试 DNS 解析

```bash
# 查看 curl 解析出的 IP
curl -v https://example.com 2>&1 | grep "Trying"
```

输出：

```
*   Trying 93.184.216.34:443...
```

### 强制使用特定 IP

```bash
# 解析域名时用指定 IP
curl --resolve example.com:443:1.2.3.4 https://example.com
```

### 测试连接速度

```bash
# 显示详细的连接时间统计
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://example.com

# 完整的性能指标
curl -o /dev/null -s -w "\
DNS Lookup:     %{time_namelookup}s\n\
TCP Connect:    %{time_connect}s\n\
TLS Handshake:  %{time_appconnect}s\n\
First Byte:     %{time_starttransfer}s\n\
Total:          %{time_total}s\n\
Download Size:  %{size_download} bytes\n\
Speed:          %{speed_download} bytes/s\n" \
  https://example.com
```

输出示例：

```
DNS Lookup:     0.005s
TCP Connect:    0.050s
TLS Handshake:  0.150s
First Byte:     0.250s
Total:          0.300s
Download Size:  1256 bytes
Speed:          4186 bytes/s
```

### 测试不同 HTTP 版本

```bash
# HTTP/1.1
curl --http1.1 https://example.com

# HTTP/2（默认如果支持）
curl --http2 https://example.com

# HTTP/3 (QUIC)
curl --http3 https://example.com
```

## 场景六：Cookie 与 Session

### 发送 Cookie

```bash
# 手动设置 Cookie
curl -b "session_id=abc123; user=alice" https://example.com/dashboard

# 从文件读取 Cookie
curl -b cookies.txt https://example.com/dashboard
```

### 保存 Cookie

```bash
# 保存服务器返回的 Cookie 到文件
curl -c cookies.txt https://example.com/login

# 登录并保存 Session
curl -c cookies.txt \
  -d "username=alice&password=secret" \
  https://example.com/api/login
```

### 完整的登录流程

```bash
# 1. 登录并保存 Cookie
curl -c cookies.txt -s -o /dev/null \
  -d "username=alice&password=secret" \
  https://example.com/api/login

# 2. 使用 Cookie 访问受保护的资源
curl -b cookies.txt https://example.com/api/user/profile

# 3. 登录后继续操作（同一个 Session）
curl -b cookies.txt -c cookies.txt \
  -X PUT \
  -d "name=Alice Updated" \
  https://example.com/api/user/profile
```

## 场景七：调试与安全

### 忽略 SSL 证书错误

```bash
# -k 或 --insecure 跳过证书验证（仅调试用）
curl -k https://self-signed.example.com

# 查看证书详情
curl -v https://example.com 2>&1 | grep -A 5 "SSL certificate"
```

### 指定客户端证书

```bash
# 使用客户端证书认证
curl --cert client.crt --key client.key https://secure.example.com
```

### 使用代理

```bash
# 通过 HTTP 代理
curl -x http://proxy.example.com:8080 https://example.com

# 通过 SOCKS5 代理
curl -x socks5://proxy.example.com:1080 https://example.com

# 带认证的代理
curl -x http://user:pass@proxy.example.com:8080 https://example.com
```

### 模拟不同 User-Agent

```bash
# 模拟 Chrome
curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" \
  https://example.com

# 模拟移动端
curl -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148" \
  https://example.com
```

## 常用选项速查

| 选项 | 说明 | 示例 |
|------|------|------|
| `-X` | 指定 HTTP 方法 | `-X PUT` |
| `-H` | 添加请求头 | `-H "Content-Type: application/json"` |
| `-d` | 发送数据（自动变为 POST） | `-d "key=value"` |
| `-o` | 输出到文件 | `-o file.html` |
| `-O` | 保留远程文件名 | `-O` |
| `-I` | 只显示响应头 | `-I` |
| `-v` | 显示详细交互 | `-v` |
| `-L` | 跟随重定向 | `-L` |
| `-k` | 跳过 SSL 验证 | `-k` |
| `-b` | 发送 Cookie | `-b "name=value"` |
| `-c` | 保存 Cookie | `-c file.txt` |
| `-x` | 使用代理 | `-x http://proxy:8080` |
| `-A` | 设置 User-Agent | `-A "Chrome/120"` |
| `-s` | 静默模式 | `-s` |
| `-S` | 显示错误（配合 -s） | `-sS` |

## 实战：调试 Nginx 反向代理

结合 [DNS 与代理](../dns-proxy/) 专栏，用 curl 测试反向代理配置：

```bash
# 1. 测试健康检查端点
curl https://your-domain.com/health

# 2. 测试不同路由
curl https://your-domain.com/api/users
curl https://your-domain.com/

# 3. 验证 Header 传递
curl -H "X-Forwarded-For: 1.2.3.4" \
  https://your-domain.com/api/check-ip

# 4. 测试 SSL
curl -v https://your-domain.com 2>&1 | grep -E "SSL|TLS"

# 5. 测试流式响应（SSE）
curl -N https://api.your-domain.com/openai/v1/chat/completions \
  -H "Authorization: Bearer your_key" \
  -d '{"model":"gpt-4o-mini","stream":true,"messages":[{"role":"user","content":"Hi"}]}'
```

## 相关资源

- [Linux 实用指南](./) - 更多 Linux 命令与运维场景
- [DNS 与代理](../dns-proxy/) - Nginx 反向代理配置
- [进程与端口排查](./process-port.md) - lsof、ps、kill


## 场景六：用 curl 验证 WebDAV 与同步路径

当你在排查 Obsidian、Remotely Save 或 GitHub Actions 的 WebDAV 问题时，`curl` 最有价值的地方不是“能不能访问网页”，而是直接验证 DAV 方法和真实路径。

### 验证认证和目录是否可访问

```bash
curl -u obsidian:你的密码 https://notes.youwei-agent.com/
curl -u obsidian:你的密码 https://notes.youwei-agent.com/docs/blog/
```

### 验证 WebDAV collection 是否正常

```bash
curl -u obsidian:你的密码 -X PROPFIND -H 'Depth: 1' https://notes.youwei-agent.com/
curl -u obsidian:你的密码 -X PROPFIND -H 'Depth: 1' https://notes.youwei-agent.com/docs/blog/
```

如果返回 `207 Multi-Status`，说明这个路径本身是一个可正常工作的 WebDAV collection。

### 验证创建和删除目录

```bash
curl -u obsidian:你的密码 -X MKCOL https://notes.youwei-agent.com/test-dir/
curl -u obsidian:你的密码 -X DELETE https://notes.youwei-agent.com/test-dir/
```

### 为什么这比只看客户端提示更可靠

这组命令可以很快区分：

- 认证错了
- 路径填错了
- 反向代理没转对
- 服务端能 `GET`，但不能真正做 WebDAV 方法

在我这次真实排查里，最关键的判断之一就是：

- `GET /` 正常，不代表 WebDAV 正常
- 真正要看的是 `PROPFIND` 是否返回 `207`
- 如果它返回 `405`，通常说明你命中的不是一个真正的 DAV collection
