# OpenClaw Docker 部署下如何配置 Chrome Browser Relay

这篇记录的是一个很具体的场景：OpenClaw Gateway 跑在 Docker 里，但你希望它接管宿主机 Chrome 里已经登录好的 BOSS 直聘标签页。

结论先说：

- Chrome 扩展必须连接宿主机本地的 Browser Relay。
- `openclaw browser serve` 不建议放进 Docker 里跑。
- Docker 里的 Gateway 通过 `host.docker.internal:18791` 访问宿主机上的 Browser Control。
- 当前版本里，Chrome 扩展 relay 初始化时仍然需要读到 Gateway token；最稳的方式是给 `openclaw browser serve` 带上 `OPENCLAW_GATEWAY_TOKEN` 环境变量，而不是给 Browser Control 单独加 Bearer token。
- 本机如果默认 Node 版本低于 22，`openclaw-cn` 可能直接拒绝启动。

## 1. 组件关系

这套链路里有三个东西：

```text
Chrome 标签页
  -> Clawdbot Browser Relay 扩展
  -> 宿主机 openclaw browser serve
  -> Docker 里的 OpenClaw Gateway
  -> Agent browser 工具
```

端口关系：

```text
18789: OpenClaw Gateway
18790: OpenClaw Bridge
18791: Browser Control HTTP API
18792: Chrome Extension Relay / CDP Relay
```

其中 `18791` 是 Gateway 调用浏览器控制服务用的；`18792` 是 Chrome 扩展连接本地 relay 用的。

## 2. 为什么 browser serve 不放进 Docker

直觉上可能会想把下面这个命令也放进 `docker-compose.yml`，或者在宿主机用非环回地址加 token 启动：

```bash
openclaw browser serve --bind 0.0.0.0 --port 18791 --token TOKEN
```

但 Chrome 扩展 relay 有一个安全限制：扩展连接 `/extension` WebSocket 时，只接受来自 loopback 的连接，也就是 `127.0.0.1` / `localhost`。

如果 Browser Relay 跑在 Docker 容器里：

- Chrome 访问的是宿主机的 `127.0.0.1:18792`
- 请求经过 Docker 端口映射进入容器
- 容器内看到的来源不再是容器自己的 `127.0.0.1`
- relay 会拒绝扩展连接
- 扩展就会显示 `Not connected`，或者无法变成 `ON`

所以正确方式是：

```text
Chrome 扩展
  -> 宿主机 127.0.0.1:18792

Docker Gateway
  -> host.docker.internal:18791
  -> 宿主机 openclaw browser serve
```

在同一台 Mac 上跑 Docker Gateway 和 Chrome 时，`openclaw browser serve` 可以只绑定宿主机 loopback：

```bash
OPENCLAW_GATEWAY_TOKEN=GATEWAY_TOKEN \
openclaw browser serve --bind 127.0.0.1 --port 18791
```

Docker Desktop 可以通过 `host.docker.internal` 访问宿主机的 loopback 服务，所以不需要把 Browser Control 绑定到 `0.0.0.0`。

如果你机器上有多个 Node，建议显式保证 `openclaw` 走的是 Node 22。真实排查里遇到过：

```text
openclaw-cn requires Node >=22.0.0
Detected: node 20.x
```

这种情况下，看起来像是 relay 配置问题，其实是 CLI 根本没启动成功。

## 3. 安装 Chrome 扩展文件

在宿主机终端运行：

```bash
openclaw browser extension install
```

它会输出扩展目录，通常是：

```text
~/.openclaw/browser/chrome-extension
```

在 macOS 上展开后一般是：

```text
/Users/your-username/.openclaw/browser/chrome-extension
```

如果 Chrome 的文件选择器里不方便选择 `.openclaw` 这种隐藏目录，可以把扩展复制到项目里的可见目录：

```bash
mkdir -p /Users/your-username/projects/openclaw-docker/chrome-extension
cp -R /Users/your-username/.openclaw/browser/chrome-extension/. \
  /Users/your-username/projects/openclaw-docker/chrome-extension/
```

后续加载扩展时，直接选择：

```text
/Users/your-username/projects/openclaw-docker/chrome-extension
```

## 4. 加载到 Chrome

打开 Chrome：

```text
chrome://extensions
```

然后：

1. 打开右上角「开发者模式」。
2. 点击「加载已解压的扩展程序」。
3. 选择扩展目录：

```text
/Users/your-username/projects/openclaw-docker/chrome-extension
```

如果没有复制到可见目录，也可以选择原始目录 `/Users/your-username/.openclaw/browser/chrome-extension`。在 macOS 文件选择窗口中，按 `Command + Shift + G` 可以直接输入隐藏目录路径。

加载成功后，扩展名通常是：

```text
Clawdbot Browser Relay
```

注意：如果你看到的是 `EasyClaw`、`No bots`、`create one on EasyClaw`，那通常不是这个 Browser Relay 扩展的连接状态。

## 5. 启动宿主机 Browser Relay

在宿主机新开一个终端窗口，运行：

```bash
openclaw browser serve --bind 127.0.0.1 --port 18791
```

如果要换行，行尾要加反斜杠：

```bash
openclaw browser serve \
  --bind 127.0.0.1 \
  --port 18791
```

看到类似输出就说明成功：

```text
Browser control listening on http://127.0.0.1:18791/
认证：关闭（仅限环回）。
```

这个终端窗口要保持运行。关闭后，Chrome 扩展和 Gateway 的浏览器控制链路会断。

注意：本机 Docker + 本机 Chrome 这个场景，不建议使用：

```bash
openclaw browser serve --bind 0.0.0.0 --port 18791 --token GATEWAY_TOKEN
```

这种启动方式会让 Browser Control 开启 Bearer token 认证，并且可能导致 `18792` 上的 Chrome Extension Relay / CDP Relay 返回 `Unauthorized`，进而让 Agent 的 browser 工具失败。当前更稳的做法是：给 `browser serve` 注入 `OPENCLAW_GATEWAY_TOKEN`，但 Browser Control 本身仍然只绑定 loopback。

## 6. 配置 Docker Gateway 访问宿主机

因为 Gateway 在 Docker 容器里，容器内的 `127.0.0.1` 指的是容器自己，不是宿主机。

在 `docker-compose.yml` 给 gateway 和 cli 增加：

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

示例：

```yaml
services:
  openclaw-cn-gateway:
    image: ${OPENCLAW_IMAGE:-openclaw-cn:local}
    user: node:node
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      HOME: /home/node
      TERM: xterm-256color
      OPENCLAW_GATEWAY_TOKEN: ${OPENCLAW_GATEWAY_TOKEN}
    volumes:
      - ${OPENCLAW_CONFIG_DIR:-./data/.openclaw}:/home/node/.openclaw
      - ${OPENCLAW_WORKSPACE_DIR:-./data/clawd}:/home/node/clawd
```

然后在 `data/.openclaw/openclaw.json` 增加或更新：

```json
{
  "browser": {
    "enabled": true,
    "controlUrl": "http://host.docker.internal:18791",
    "defaultProfile": "chrome"
  }
}
```

如果之前为了测试加过下面这些配置，可以删掉或留空，避免误导排查：

```json
{
  "browser": {
    "controlToken": "GATEWAY_TOKEN"
  }
}
```

```yaml
environment:
  OPENCLAW_BROWSER_CONTROL_TOKEN: GATEWAY_TOKEN
```

重启 Gateway：

```bash
docker compose up -d
```

## 7. 配置扩展选项

在 Chrome 扩展页找到 `Clawdbot Browser Relay`，打开它的选项页，填：

```text
Relay port: 18792
Gateway token: GATEWAY_TOKEN
```

这里的 `Gateway token` 是扩展 UI 自己要求的字段，可以继续填 OpenClaw Gateway token。由于 Browser Relay 只绑定在本机 loopback，Browser Control 本身不需要 Bearer token。

保存后，扩展会尝试访问：

```text
http://127.0.0.1:18792/
```

如果 `18792` 已经监听，但 agent 连 `/cdp` 仍然返回 `503`，通常不是 token 问题，而是扩展虽然在线，但还没有附加到一个可控的标签页。

## 8. 附加 BOSS 直聘标签页

1. 打开 BOSS 直聘页面。
2. 点击 Chrome 工具栏里的 `Clawdbot Browser Relay` 图标。
3. 如果 Chrome 提示调试器权限，允许。
4. 徽章显示 `ON`，说明当前标签页已经附加。

附加成功后，Agent 才能通过 browser 工具读取和操作这个标签页。如果后面要做后台守护（例如常驻的 BOSS 自动采集 loop），这一步尤其关键：`18792` 只表示 relay 端口已存在；只有当前 BOSS 页确实附加后，CDP relay 才能给守护脚本用。

## 9. 验证命令

验证容器能解析宿主机地址：

```bash
docker exec openclaw-docker-openclaw-cn-gateway-1 node -e "require('dns').lookup('host.docker.internal',(e,a)=>{console.log(e?String(e):a)})"
```

验证 Gateway 容器能访问 Browser Control：

```bash
docker exec openclaw-docker-openclaw-cn-gateway-1 node -e "fetch('http://host.docker.internal:18791/').then(async r=>{console.log(r.status); console.log(await r.text())}).catch(e=>{console.error(String(e)); process.exit(1)})"
```

如果返回 `200` 和一段 browser 状态 JSON，说明容器到宿主机 browser control 是通的。

验证宿主机扩展 relay：

```bash
curl -i http://127.0.0.1:18792/json/version
```

如果返回 `HTTP/1.1 200 OK` 和一段 JSON，说明扩展 relay 正在宿主机本地监听。

如果这里返回 `401 Unauthorized`，通常说明 `openclaw browser serve` 是用 `--bind 0.0.0.0 --token ...` 启动的。停掉它，改用：

```bash
openclaw browser serve --bind 127.0.0.1 --port 18791
```

然后重启 Docker Gateway。

## 10. 常见问题

### Error: Unauthorized

如果 Agent browser 工具报：

```text
Can't reach the OpenClaw-CN browser control service ... (Error: Unauthorized)
```

优先检查 `18792/json/version`：

```bash
curl -i http://127.0.0.1:18792/json/version
```

如果返回 `401 Unauthorized`，说明 Browser Relay/CDP Relay 也被 token 保护了，browser 工具访问时会失败。

处理方式：

1. 停掉当前 `openclaw browser serve`。
2. 改用 loopback 无 token 启动：

```bash
openclaw browser serve --bind 127.0.0.1 --port 18791
```

3. 重启 Docker Gateway：

```bash
docker compose up -d --force-recreate openclaw-cn-gateway
```

4. 确认 BOSS 直聘标签页上的 Browser Relay 扩展仍然是 `ON`。

### option '--token TOKEN' argument missing

如果你仍然选择使用 `--token`，`--token` 后面不能换行，否则 shell 会认为 token 缺失。

### zsh: command not found: token

原因同上：token 被 shell 当成下一条命令执行了。本机 Docker + 本机 Chrome 场景下，推荐直接不用 `--token`。

### 扩展显示 Not connected

优先检查：

- `openclaw browser serve` 是否还在宿主机终端运行。
- Chrome 扩展选项里的 `Relay port` 是否是 `18792`。
- Chrome 扩展选项里的 token 是否和 Gateway token 一致。
- 你点击的是不是 `Clawdbot Browser Relay`，而不是其他扩展。
- `curl -i http://127.0.0.1:18792/json/version` 是否返回 `200`，而不是 `401 Unauthorized`。

### No bots / create one on EasyClaw

这通常说明你点到的是 EasyClaw 的扩展或控制面，而不是 `Clawdbot Browser Relay`。

去 Chrome 拼图图标里找到并固定：

```text
Clawdbot Browser Relay
```

### Docker 里访问不到 host.docker.internal

给 compose 服务加：

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

然后重启：

```bash
docker compose up -d
```

## 11. 安全建议

Browser Relay 等于让 Agent 能操作你明确附加的 Chrome 标签页。建议：

- 使用专门的 Chrome 配置文件做招聘。
- 不要把银行、支付、邮箱等敏感页面附加给 OpenClaw。
- 只在需要时点击扩展，让徽章变成 `ON`。
- 用完后再次点击扩展取消附加，或关闭 `openclaw browser serve`。
