# iTerm2 + Mosh + SSH 完整操作手册

> 适用场景：MacBook 远程连接 DigitalOcean 新加坡（以及未来更多服务器） 目标：流畅、稳定、不掉线、多服务器一键切换

---

## 目录

1. [环境准备](https://claude.ai/chat/dc8a2141-c1ad-437d-b908-abeeb5fbdf75#1-%E7%8E%AF%E5%A2%83%E5%87%86%E5%A4%87)
2. [SSH 配置](https://claude.ai/chat/dc8a2141-c1ad-437d-b908-abeeb5fbdf75#2-ssh-%E9%85%8D%E7%BD%AE)
3. [Mosh 安装与使用](https://claude.ai/chat/dc8a2141-c1ad-437d-b908-abeeb5fbdf75#3-mosh-%E5%AE%89%E8%A3%85%E4%B8%8E%E4%BD%BF%E7%94%A8)
4. [iTerm2 Profile 管理多服务器](https://claude.ai/chat/dc8a2141-c1ad-437d-b908-abeeb5fbdf75#4-iterm2-profile-%E7%AE%A1%E7%90%86%E5%A4%9A%E6%9C%8D%E5%8A%A1%E5%99%A8)
5. [配色和主题](https://claude.ai/chat/dc8a2141-c1ad-437d-b908-abeeb5fbdf75#5-%E9%85%8D%E8%89%B2%E5%92%8C%E4%B8%BB%E9%A2%98)
6. [快捷键大全](https://claude.ai/chat/dc8a2141-c1ad-437d-b908-abeeb5fbdf75#6-%E5%BF%AB%E6%8D%B7%E9%94%AE%E5%A4%A7%E5%85%A8)
7. [tmux 永不断线](https://claude.ai/chat/dc8a2141-c1ad-437d-b908-abeeb5fbdf75#7-tmux-%E6%B0%B8%E4%B8%8D%E6%96%AD%E7%BA%BF)
8. [日常工作流](https://claude.ai/chat/dc8a2141-c1ad-437d-b908-abeeb5fbdf75#8-%E6%97%A5%E5%B8%B8%E5%B7%A5%E4%BD%9C%E6%B5%81)
9. [故障排查](https://claude.ai/chat/dc8a2141-c1ad-437d-b908-abeeb5fbdf75#9-%E6%95%85%E9%9A%9C%E6%8E%92%E6%9F%A5)

---

## 1. 环境准备

### Homebrew 换中科大源（避免国内访问慢）

```bash
# 换 Homebrew 主源
git -C "$(brew --repo)" remote set-url origin https://mirrors.ustc.edu.cn/brew.git

# 关闭烦人的提示和自动更新
echo 'export HOMEBREW_NO_AUTO_UPDATE=1' >> ~/.zshrc
echo 'export HOMEBREW_NO_ENV_HINTS=1' >> ~/.zshrc
echo 'export HOMEBREW_NO_INSTALL_FROM_API=1' >> ~/.zshrc
echo 'export HOMEBREW_BOTTLE_DOMAIN=https://mirrors.ustc.edu.cn/homebrew-bottles' >> ~/.zshrc
source ~/.zshrc

# 手动 clone homebrew-core（一次性，必做）
git clone --depth=1 --progress https://mirrors.ustc.edu.cn/homebrew-core.git \
  /opt/homebrew/Library/Taps/homebrew/homebrew-core
```

### 安装 iTerm2 和 Mosh

```bash
brew install --cask iterm2
brew install mosh

# 验证
mosh --version
which mosh
# 输出路径记下来：/opt/homebrew/bin/mosh（M 系列）或 /usr/local/bin/mosh（Intel）
```

---

## 2. SSH 配置

### 生成 SSH 密钥（如果还没有）

```bash
# 检查现有密钥
ls -la ~/.ssh/

# 如果没有 id_ed25519，生成一个
ssh-keygen -t ed25519 -C "你的邮箱"
# 一路回车（密码可留空）

# 查看公钥（要贴到服务器上）
cat ~/.ssh/id_ed25519.pub

# 复制到剪贴板
pbcopy < ~/.ssh/id_ed25519.pub
```

### 把公钥贴到服务器

```bash
# 先用密码登录服务器
ssh root@服务器IP

# 在服务器上执行
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "粘贴你的公钥内容" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 退出
exit
```

### 配置 SSH 别名（核心）

编辑 `~/.ssh/config`：

```bash
nano ~/.ssh/config
chmod 600 ~/.ssh/config  # 权限必须 600
```

填入：

```sshconfig
# === 全局优化（对所有 Host 生效） ===
Host *
    ServerAliveInterval 30
    ServerAliveCountMax 10
    TCPKeepAlive yes
    Compression yes
    ControlMaster auto
    ControlPath ~/.ssh/cm-%r@%h:%p
    ControlPersist 10m
    IdentityFile ~/.ssh/id_ed25519

# === DigitalOcean 新加坡 ===
Host do
    HostName 这里填你的DO公网IP
    User root
    Port 22

# === 未来扩展（先注释掉） ===
# Host aliyun
#     HostName x.x.x.x
#     User deploy
#
# Host bwh
#     HostName y.y.y.y
#     User root
```

### 测试连接

```bash
ssh do           # 一键连接，无需输入完整命令
mosh do          # 用 mosh 连接（更流畅）
scp file do:/root/  # scp 也能用别名
```

---

## 3. Mosh 安装与使用

### 服务器端安装 Mosh

```bash
# SSH 进服务器
ssh do

# 安装
apt update
apt install -y mosh

# 开放 UDP 端口
ufw allow 60000:61000/udp 2>/dev/null || true

# 退出
exit
```

### DigitalOcean Cloud Firewall 加规则（如果有用）

控制台 → Networking → Firewalls → 编辑防火墙：

- **Inbound Rules** 添加：
    - Type: Custom
    - Protocol: **UDP**
    - Port Range: **60000-61000**
    - Sources: All IPv4

### Mosh 神功能

| 场景         | SSH 表现 | Mosh 表现   |
| ---------- | ------ | --------- |
| 网络波动       | 卡住几秒   | 输入字符立即显示  |
| 切换 WiFi/4G | 断开，要重连 | 顶部提示后自动恢复 |
| 笔记本锁屏 1 小时 | 已断开    | 还在        |
| 输入延迟感      | 明显     | 几乎无感      |

---

## 4. iTerm2 Profile 管理多服务器

### 什么是 Profile

**Profile = 一套独立的连接配置**，每台服务器一个 Profile，包含：

- 启动命令（自动连哪台服务器）
- 颜色、字体、窗口大小
- 快捷键绑定

### 创建第一个 Profile

1. 打开 iTerm2
2. 按 `Cmd+,` 进入设置
3. 切到 **Profiles** 标签
4. 左下角点 `+` 新建

### 配置 Profile（以 DO 为例）

#### General 子标签

|字段|填写内容|
|---|---|
|Name|`🔴 DO 新加坡`|
|Command|**保持默认 `Login Shell`**（不改）|
|**Send text at start**|`mosh do` ⭐ 关键|
|Working Directory|"Home directory"|

> ⚠️ **重要：不要用 Custom Shell 填 mosh 命令**
> 
> Custom Shell 字段把整行当作**一个可执行文件路径**，不支持空格和参数。如果填 `/opt/homebrew/bin/mosh do`，iTerm2 会把整串当成一个叫 `mosh do` 的文件去找，必然失败。
> 
> **正确做法**：Command 保持 `Login Shell`（默认），在 **Send text at start** 输入框里填 `mosh do`。这个字段模拟键盘输入，支持空格和任意命令。
> 
> **额外好处**：连接失败时会留在本地 shell 不闪退，可以看到完整报错方便调试。
> 
> **进阶写法：**
> 
> - `mosh do; exit` —— 断开后自动关闭窗口
> - `mosh do || ssh do` —— mosh 失败时自动回退到 SSH

#### Colors 子标签

- 右下角 **Color Presets...** → 选 `Dark Background`
- 或点 **Background** 色块 → 调深红色 `#2A0000`（生产环境标识）

#### Text 子标签

- Font: **JetBrains Mono**（先 `brew install --cask font-jetbrains-mono`）
- Size: 14
- ✅ Use built-in Powerline glyphs

#### Window 子标签

- Columns: 120
- Rows: 35
- Transparency: 5-10%

#### Terminal 子标签

- Scrollback Lines: **50000**

#### Session 子标签

- ✅ Reuse previous session's directory

### 复制 Profile 给其他服务器

1. 在 Profile 列表右键你刚配的 Profile
2. **Duplicate Profile**
3. 改 Name、Command、Colors 即可

例如：

|Profile|颜色|Command|用途|
|---|---|---|---|
|🔴 DO 新加坡|深红|`mosh do`|生产|
|🟢 阿里云 SG|深绿|`mosh aliyun`|开发|
|🟡 搬瓦工|深黄|`ssh bwh`|代理|

### 绑定全局快捷键（神操作）

> ⚠️ **注意**：是 iTerm2 设置**顶部那排大图标里的 Keys**，不是 Profile 内部的 Keys 子标签。两个 Keys 完全不同：
> 
> - **顶部 Keys**：全局快捷键，任何场景下生效（**这次要配的**）
> - **Profile → Keys 子标签**：只在该 Profile 内生效的键位映射

**操作步骤：**

1. 设置 → 顶部 **Keys** 大图标 → **Key Bindings** 子标签
2. 左下角点 `+`
3. 在弹出窗口里：

|字段|填写|
|---|---|
|Keyboard Shortcut|点输入框，按 `Cmd+Ctrl+1`|
|Action|**New Window with Profile**|
|Profile|选 🔴 DO 新加坡|

4. 点 OK

依此类推：

- `Cmd+Ctrl+1` → DO
- `Cmd+Ctrl+2` → 阿里云
- `Cmd+Ctrl+3` → 搬瓦工

之后**全局任何位置按快捷键，立刻打开对应服务器**（哪怕在浏览器、VSCode 里）。

### 打开 Profile 的 4 种方式

> ❌ **常见误区**：`Cmd+T` 旁边的小箭头下拉**不是**选 Profile 的入口，那是历史标签列表。

|方式|操作|适合|
|---|---|---|
|**菜单栏**|iTerm2 顶部 → Profiles → 点 Profile 名|偶尔用|
|**Profile 选择器**|`Cmd+O` 弹出搜索框，输入名字过滤|日常推荐|
|**侧边栏 Toolbelt**|`Cmd+B` 调出工具栏 → 勾选 Profiles → 双击|常驻显示|
|**全局快捷键**|自定义 `Cmd+Ctrl+1/2/3`，任何地方按下|⭐ 最爽|

### Hotkey 呼出式终端（强烈推荐）

让 iTerm2 像 Spotlight 一样随叫随到：

1. 设置 → Profiles → 选一个 Profile（或新建专用）
2. **Keys** 子标签 → 找 **Hotkey** 区域
3. ✅ 勾选 "This profile has a Hotkey Window"
4. 点 "Click to Set" → 按 `Option+Space`
5. 关闭设置

**效果**：任何时候按 `Option+Space`，屏幕顶部下拉一个终端；再按一次收起。

---

## 5. 配色和主题

### 导入 250+ 流行主题

```bash
cd ~/Downloads
git clone --depth=1 https://github.com/mbadolato/iTerm2-Color-Schemes.git
```

**导入步骤：**

1. 设置 → Profiles → 选 Profile → **Colors** 子标签
2. 右下角 **Color Presets...** → **Import...**
3. 进入 `~/Downloads/iTerm2-Color-Schemes/schemes/`
4. `Cmd+A` 全选所有 `.itermcolors` 文件
5. 点 Open

之后 Color Presets 下拉里就有 250+ 主题可选。

### 推荐主题

|主题|风格|特点|
|---|---|---|
|**Dracula**|深紫色|经典开发者最爱|
|**Nord**|冷蓝灰|清爽不刺眼|
|**One Dark**|黑+高对比|VSCode 风格|
|**Gruvbox Dark**|复古暖色|温暖护眼|
|**Tokyo Night**|蓝紫低饱和|当下最火|
|**Monokai Pro**|高对比饱和|编程感强|

### 给生产服务器配警示色

**不要保存为 Preset**，只改单个 Profile 的背景色：

- 生产: 深红 `#2A0000`
- 测试: 深黄 `#2A2A00`
- 开发: 深绿 `#002A00`

视觉提醒，避免误操作。

---

## 6. 快捷键大全

### iTerm2 核心快捷键

|快捷键|作用|
|---|---|
|`Cmd+T`|新建标签|
|`Cmd+W`|关闭当前标签|
|`Cmd+D`|横向分屏|
|`Cmd+Shift+D`|纵向分屏|
|`Cmd+方向键`|切换分屏|
|`Cmd+]` / `Cmd+[`|上/下一个分屏|
|`Cmd+F`|搜索|
|`Cmd+;`|历史命令补全|
|`Cmd+Opt+B`|即时回放|
|`Cmd+Opt+I`|广播输入（同步到所有分屏）|
|`Cmd+Ctrl+数字`|自定义服务器快捷键|
|`Option+Space`|呼出 Hotkey Window|
|`Cmd+R`|清屏|
|`Cmd+K`|清屏 + 清滚动缓冲|
|`Cmd++` / `Cmd+-`|字号增减|
|`Cmd+0`|字号还原|

### SSH 操作

```bash
ssh do                  # 用别名连接
mosh do                 # 用 mosh 连接
scp file do:/path/      # 上传文件
scp do:/path/file ./    # 下载文件
rsync -avzP ./dir/ do:/path/  # 同步目录
```

---

## 7. tmux 永不断线

### 服务器装 tmux

```bash
# mosh 进服务器后
apt install -y tmux

# 简单配置
cat > ~/.tmux.conf << 'EOF'
set -g mouse on
set -g default-terminal "screen-256color"
set -g history-limit 50000
bind | split-window -h
bind - split-window -v
EOF
```

### tmux 基本用法

```bash
tmux new -s work        # 新建会话
tmux attach -t work     # 恢复会话
tmux ls                 # 列出所有会话
tmux kill-session -t work  # 删除会话
```

### tmux 内部快捷键

所有 tmux 操作的前缀键是 `Ctrl+B`，按完前缀再按下面的键：

|快捷键|作用|
|---|---|
|`Ctrl+B` 然后 `d`|**脱离会话**（命令继续后台跑）|
|`Ctrl+B` 然后 `c`|新建窗口|
|`Ctrl+B` 然后 `数字`|切换到第 N 个窗口|
|`Ctrl+B` 然后 `\|`|竖向分屏|
|`Ctrl+B` 然后 `-`|横向分屏|
|`Ctrl+B` 然后 `方向键`|切换面板|
|`Ctrl+B` 然后 `[`|进入复制模式（方向键滚屏，q 退出）|
|`Ctrl+B` 然后 `x`|关闭当前面板（确认 y）|

### 神级体验

1. 本地启动一个长跑任务（比如训练、下载）
2. `Ctrl+B d` 脱离
3. 关电脑、回家
4. 重新 `mosh do && tmux attach -t work`
5. **看到之前的任务还在跑，输出都在**

---

## 8. 日常工作流

### 启动连接（3 步）

```
1. 打开 iTerm2（或按 Option+Space 呼出）
2. 按 Cmd+Ctrl+1（自动 mosh 上 DO）
3. tmux attach -t work（或 tmux new -s work）
```

### 工作流推荐

**A. 重型代码编辑：本地 VSCode + Git**

```bash
# 本地写代码，提交
git add . && git commit -m "..." && git push

# 服务器拉取部署
ssh do
cd /opt/myapp
git pull
docker compose restart
```

**B. 改配置/调试：mosh + vim**

```bash
mosh do
tmux attach -t work
vim /etc/nginx/nginx.conf
```

**C. 传文件**

```bash
rsync -avzP ./build/ do:/var/www/myapp/
```

**D. 多服务器批量操作**

1. `Cmd+D` 分屏几次
2. 每个分屏 `mosh do/aliyun/bwh`
3. `Cmd+Opt+I` 开启广播
4. 敲一次命令所有服务器执行
5. **结束立刻 `Cmd+Opt+I` 关掉广播**

---

## 9. 故障排查

### Mosh 连接失败

```bash
# 1. 测试 SSH 是否能通
ssh do

# 2. 检查服务器 mosh 是否安装
ssh do "which mosh"

# 3. 检查 UDP 端口是否开放
ssh do "ufw status"

# 4. DO Cloud Firewall 是否加了 UDP 60000-61000

# 5. 如果都不行，回退用 SSH
ssh do
```

### SSH 提示 Permission denied

```bash
# 1. 检查公钥是否在服务器上
ssh root@IP "cat ~/.ssh/authorized_keys"

# 2. 检查权限
ssh root@IP "ls -la ~/.ssh"
# .ssh 应该 700，authorized_keys 应该 600

# 3. 检查本地私钥权限
chmod 600 ~/.ssh/id_ed25519

# 4. 详细调试
ssh -v do
```

### Mosh 输入卡顿

```bash
# 检查网络
ping -c 20 服务器IP
mtr 服务器IP  # brew install mtr

# 如果延迟 > 300ms 或丢包严重，考虑：
# 1. 换 Cloudflare WARP
# 2. 用搬瓦工 CN2 节点
# 3. 用阿里云新加坡（大陆访问最快）
```

### iTerm2 字体方块乱码

```bash
# 装 Nerd Font 字体
brew install --cask font-jetbrains-mono-nerd-font

# Profile → Text → Font 选 "JetBrainsMono Nerd Font"
```

### Profile 常见问题

**Q1: Custom Shell 输入框里打空格会跳到下一个字段？**

这是 iTerm2 设计如此——Custom Shell 把整行当成一个**可执行文件路径**，不接受参数。所以 `mosh do` 这种带空格的命令不能填这里。

**解决**：Command 改回 `Login Shell`（默认），把 `mosh do` 填到下面的 **Send text at start** 输入框。

**Q2: `Cmd+T` 旁边的下拉箭头里没有我新建的 Profile？**

那个箭头是**最近打开过的标签历史**，不是 Profile 入口。打开 Profile 用：

- 菜单栏 → Profiles → 点名字
- `Cmd+O` 弹出 Profile 选择器
- 自定义全局快捷键 `Cmd+Ctrl+1`

**Q3: 打开 Profile 后窗口一闪而过看不到错误？**

通常是因为 Command 填了 `mosh do` 这种命令，连接失败时窗口立刻关闭。

**解决**：用 `Send text at start` 而不是 `Custom Shell`，这样失败时会留在本地 shell，能看到完整报错。

**Q4: Profile 启动后报 `Could not resolve hostname do`？**

`~/.ssh/config` 里没有 `do` 这个别名。先配 SSH config，再用 Profile。

**调试步骤**：

1. 在普通终端跑 `mosh do`，确认能连上
2. 跑通后再去配 Profile
3. Profile 只是把 `mosh do` 这个命令自动化执行

---

## 附录：完整配置文件模板

### `~/.ssh/config`

```sshconfig
Host *
    ServerAliveInterval 30
    ServerAliveCountMax 10
    TCPKeepAlive yes
    Compression yes
    ControlMaster auto
    ControlPath ~/.ssh/cm-%r@%h:%p
    ControlPersist 10m
    IdentityFile ~/.ssh/id_ed25519

Host do
    HostName 你的DO_IP
    User root
```

### `~/.zshrc` 追加内容

```bash
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_ENV_HINTS=1
export HOMEBREW_NO_INSTALL_FROM_API=1
export HOMEBREW_BOTTLE_DOMAIN=https://mirrors.ustc.edu.cn/homebrew-bottles

# 常用别名
alias ll='ls -lah'
alias gs='git status'
alias gp='git pull'
```

### 服务器端 `~/.tmux.conf`

```tmux
set -g mouse on
set -g default-terminal "screen-256color"
set -g history-limit 50000
bind | split-window -h
bind - split-window -v
```

---

## 速查卡片（贴在显示器旁）

```
连接服务器：      Cmd+Ctrl+1 / 2 / 3
呼出终端：        Option+Space
新分屏：          Cmd+D（横）/ Cmd+Shift+D（纵）
搜索输出：        Cmd+F
广播输入：        Cmd+Opt+I（用完关掉！）

tmux 脱离：       Ctrl+B 然后 d
tmux 新窗口：     Ctrl+B 然后 c
tmux 分屏：       Ctrl+B 然后 | 或 -

恢复工作：        mosh do && tmux attach -t work
```

---

_文档完成于 2026 年。如有新服务器，按"4. iTerm2 Profile 管理多服务器"流程扩展即可。_