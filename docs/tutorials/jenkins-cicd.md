---
lang: zh-CN
title: Jenkins CI/CD 从入门到实战：部署项目到阿里云
description: 从零开始学习 Jenkins，实现自动化部署到阿里云服务器
date: 2026-01-31
tags:
  - Jenkins
  - CI/CD
  - DevOps
  - Aliyun
---

# Jenkins CI/CD 从入门到实战：部署项目到阿里云

## 概述

本教程将带你从零开始学习 Jenkins，并实现一个完整的 CI/CD 流程，将项目自动部署到阿里云服务器。

### 什么是 CI/CD？

**CI (Continuous Integration - 持续集成)**：
- 开发人员频繁地将代码集成到主分支
- 每次集成都通过自动化构建和测试来验证
- 快速发现和定位错误

**CD (Continuous Delivery/Deployment - 持续交付/部署)**：
- 持续交付：代码随时可以部署到生产环境
- 持续部署：代码自动部署到生产环境

### Jenkins 的优势

- **开源免费**：完全开源，社区活跃
- **插件丰富**：超过 1800+ 插件，支持几乎所有工具
- **易于扩展**：支持分布式构建
- **Pipeline as Code**：使用 Jenkinsfile 管理构建流程

### 本教程目标

通过本教程，你将学会：
1. 在阿里云服务器上安装和配置 Jenkins
2. 创建第一个 Jenkins Pipeline
3. 配置 Git 仓库自动触发构建
4. 实现自动化测试和部署
5. 部署一个 Node.js/Java/Python 项目到阿里云

---

## 1. 环境准备

### 1.1 阿里云服务器要求

**最低配置**：
- CPU: 2 核
- 内存: 4GB
- 存储: 20GB
- 操作系统: Ubuntu 20.04 / CentOS 7+ / Debian 11+

**推荐配置**：
- CPU: 4 核
- 内存: 8GB
- 存储: 40GB SSD

### 1.2 购买阿里云 ECS

1. 访问 [阿里云 ECS 控制台](https://ecs.console.aliyun.com/)
2. 选择"创建实例"
3. 推荐配置：
   - 地域：选择离你最近的地域（如华东-上海）
   - 实例规格：ecs.t6-c1m2.large（2核4GB）
   - 镜像：Ubuntu 20.04 64位
   - 网络：分配公网 IP
   - 安全组：开放 22（SSH）、8080（Jenkins）、80（HTTP）、443（HTTPS）端口

### 1.3 连接到服务器

使用 SSH 连接到阿里云服务器：

```bash
ssh root@<your-aliyun-ip>
```

首次登录后建议：
1. 修改 root 密码
2. 创建普通用户（可选）
3. 配置 SSH 密钥登录

---

## 2. 安装 Jenkins

### 2.1 安装 Java（Jenkins 依赖）

Jenkins 需要 Java 11 或更高版本。

**Ubuntu/Debian**：

```bash
# 更新软件包列表
sudo apt update

# 安装 OpenJDK 11
sudo apt install -y openjdk-11-jdk

# 验证安装
java -version
```

**CentOS/RHEL**：

```bash
# 安装 OpenJDK 11
sudo yum install -y java-11-openjdk java-11-openjdk-devel

# 验证安装
java -version
```

### 2.2 安装 Jenkins

#### Ubuntu/Debian 安装方式

```bash
# 1. 添加 Jenkins 仓库密钥
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

# 2. 添加 Jenkins 仓库
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

# 3. 更新软件包列表
sudo apt update

# 4. 安装 Jenkins
sudo apt install -y jenkins

# 5. 启动 Jenkins
sudo systemctl start jenkins

# 6. 设置开机自启
sudo systemctl enable jenkins

# 7. 查看 Jenkins 状态
sudo systemctl status jenkins
```

#### CentOS/RHEL 安装方式

```bash
# 1. 添加 Jenkins 仓库
sudo wget -O /etc/yum.repos.d/jenkins.repo \
    https://pkg.jenkins.io/redhat-stable/jenkins.repo

# 2. 导入 GPG 密钥
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key

# 3. 安装 Jenkins
sudo yum install -y jenkins

# 4. 启动 Jenkins
sudo systemctl start jenkins

# 5. 设置开机自启
sudo systemctl enable jenkins
```

### 2.3 配置防火墙

**Ubuntu (UFW)**：

```bash
# 允许 Jenkins 端口
sudo ufw allow 8080/tcp

# 允许 SSH（如果还没开启）
sudo ufw allow 22/tcp

# 启用防火墙
sudo ufw enable
```

**CentOS (firewalld)**：

```bash
# 允许 Jenkins 端口
sudo firewall-cmd --permanent --add-port=8080/tcp

# 重载防火墙
sudo firewall-cmd --reload
```

**阿里云安全组配置**：

1. 登录阿里云控制台
2. 进入 ECS 实例详情
3. 点击"安全组" → "配置规则"
4. 添加入方向规则：
   - 端口范围：8080/8080
   - 授权对象：0.0.0.0/0
   - 描述：Jenkins Web UI

---

## 3. 初始化 Jenkins

### 3.1 访问 Jenkins Web UI

在浏览器中访问：

```
http://<your-aliyun-ip>:8080
```

### 3.2 解锁 Jenkins

首次访问会看到"解锁 Jenkins"页面。

获取初始管理员密码：

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

复制密码并粘贴到 Web UI 中。

### 3.3 安装插件

选择"安装推荐的插件"，Jenkins 会自动安装常用插件：

- Git plugin
- Pipeline plugin
- SSH plugin
- Credentials plugin
- 等等...

安装过程需要 5-10 分钟。

### 3.4 创建管理员用户

填写以下信息：
- 用户名：admin
- 密码：设置一个强密码
- 全名：你的名字
- 邮箱：你的邮箱

### 3.5 实例配置

Jenkins URL 默认为 `http://<your-ip>:8080/`，保持默认即可。

点击"保存并完成" → "开始使用 Jenkins"。

---

## 4. Jenkins 基础概念

### 4.1 核心概念

**Job/Project（任务/项目）**：
- Jenkins 中的基本工作单元
- 可以是构建、测试、部署等任务

**Build（构建）**：
- 执行一次 Job 的过程
- 每次构建都有唯一的编号

**Pipeline（流水线）**：
- 一系列自动化步骤的集合
- 使用 Jenkinsfile 定义（代码化）

**Node（节点）**：
- 执行构建的机器
- Master 节点：Jenkins 主服务器
- Agent 节点：执行具体任务的工作节点

**Workspace（工作空间）**：
- Jenkins 执行构建的目录
- 默认路径：`/var/lib/jenkins/workspace/<job-name>`

### 4.2 Jenkins 架构详解

#### Master-Agent 架构

Jenkins 采用分布式架构，由一个 Master 节点和多个 Agent 节点组成：

```
┌─────────────────────────────────────────────────────┐
│  Jenkins Master (例如: company.com:8080)            │
│  ┌───────────────────────────────────────────────┐  │
│  │  - Web UI 界面（你访问的网页）                 │  │
│  │  - 任务调度（决定在哪个节点执行）               │  │
│  │  - 插件管理                                     │  │
│  │  - 用户权限管理                                 │  │
│  │  - 存储构建历史和日志                           │  │
│  └───────────────────────────────────────────────┘  │
└──────────────┬──────────────────────────────────────┘
               │
       ┌───────┴───────┐
       ↓               ↓
┌─────────────┐  ┌─────────────┐
│ Agent 1     │  │ Agent 2     │
│ (Linux)     │  │ (Windows)   │
│             │  │             │
│ 执行构建任务 │  │ 执行构建任务 │
│ 运行测试脚本 │  │ 运行测试脚本 │
└─────────────┘  └─────────────┘
```

**Master 节点职责**：
- 提供 Web UI 界面
- 接收构建请求
- 调度任务到合适的 Agent
- 收集和展示构建结果
- 管理插件和配置

**Agent 节点职责**：
- 接收 Master 分配的任务
- 在本地 workspace 执行构建
- 将结果返回给 Master

#### Workspace 工作原理

**Workspace 是什么？**

Workspace 是 Jenkins 在节点上为每个 Job 创建的独立工作目录：

```
/var/lib/jenkins/workspace/
├── my-test-project/          ← 你的项目 workspace
│   ├── .git/                 ← Git 仓库
│   ├── src/                  ← 源代码
│   ├── tests/                ← 测试代码
│   ├── Jenkinsfile           ← 流水线定义
│   ├── venv/                 ← 虚拟环境（构建时创建）
│   ├── report.html           ← 测试报告（构建时生成）
│   └── results.xml           ← 测试结果（构建时生成）
├── another-project/
└── ...
```

**Workspace 生命周期**：

```
构建开始
  ↓
1. 检查 workspace 是否存在
  ↓
2. 清理旧文件（可选，根据配置）
  ↓
3. Git clone/pull 代码到 workspace
  ↓
4. 在 workspace 中执行构建步骤
   - 安装依赖
   - 编译代码
   - 运行测试
   - 生成报告
  ↓
5. 归档构建产物
  ↓
6. 清理临时文件（可选）
  ↓
构建结束
```

**关键特点**：
- 每个 Job 有独立的 workspace
- 代码 clone 到这里，构建在这里执行
- 构建产物（如测试报告）也保存在这里
- 可以配置构建前/后是否清理 workspace

### 4.3 完整的流水线执行流程

从触发构建到完成的完整过程：

```
┌─────────────────────────────────────────────────────────────┐
│  1. 触发构建                                                  │
│  - 手动点击"立即构建"                                          │
│  - Git push 触发 Webhook                                     │
│  - 定时触发（Cron）                                           │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Jenkins Master 读取 Jenkinsfile                          │
│  - 从 Git 仓库读取 Jenkinsfile                               │
│  - 解析 Pipeline 语法（Groovy DSL）                          │
│  - 生成执行计划                                               │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  3. 分配执行节点（Agent）                                     │
│  - 根据 agent 配置选择节点                                    │
│  - agent any: 任意可用节点                                    │
│  - agent { label 'linux' }: 指定标签的节点                   │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  4. 准备 Workspace                                           │
│  - 在 Agent 节点创建/清理 workspace 目录                      │
│  - 路径: /var/lib/jenkins/workspace/<job-name>              │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  5. 执行 Stage 1: Checkout                                   │
│  - git clone 代码到 workspace                                │
│  - 切换到指定分支                                             │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  6. 执行 Stage 2: Build/Install                              │
│  - 在 workspace 中安装依赖                                    │
│  - pip install / npm install / mvn install                  │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  7. 执行 Stage 3: Test                                       │
│  - 运行测试脚本                                               │
│  - pytest / npm test / mvn test                             │
│  - 生成测试报告                                               │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  8. 执行 Stage 4: Deploy（可选）                             │
│  - 打包构建产物                                               │
│  - 传输到目标服务器                                           │
│  - 重启服务                                                   │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  9. Post Actions                                             │
│  - 归档构建产物                                               │
│  - 发布测试报告                                               │
│  - 发送通知（邮件/钉钉/企业微信）                              │
│  - 清理 workspace（可选）                                     │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
                 构建完成
```

### 4.4 实际执行示例

当你点击"立即构建"后，Jenkins 控制台会显示：

```
Started by user admin
Obtained Jenkinsfile from git https://github.com/company/test-project.git
[Pipeline] Start of Pipeline
[Pipeline] node
Running on Jenkins in /var/lib/jenkins/workspace/my-test-project
[Pipeline] {
[Pipeline] stage
[Pipeline] { (Declarative: Checkout SCM)
[Pipeline] checkout
Cloning the remote Git repository
Cloning repository https://github.com/company/test-project.git
 > git init /var/lib/jenkins/workspace/my-test-project
 > git fetch --tags --progress https://github.com/company/test-project.git
 > git checkout -f abc123def456
[Pipeline] }
[Pipeline] // stage
[Pipeline] stage
[Pipeline] { (Setup)
[Pipeline] echo
安装测试依赖...
[Pipeline] sh
+ python3 -m venv venv
+ source venv/bin/activate
+ pip install -r requirements.txt
Successfully installed pytest-7.4.0
[Pipeline] }
[Pipeline] // stage
[Pipeline] stage
[Pipeline] { (Test)
[Pipeline] sh
+ pytest tests/ -v
========================= test session starts =========================
collected 15 items
tests/test_api.py::test_login PASSED                           [  6%]
tests/test_api.py::test_logout PASSED                          [ 13%]
========================= 15 passed in 5.23s ==========================
[Pipeline] }
[Pipeline] // stage
[Pipeline] }
[Pipeline] End of Pipeline
Finished: SUCCESS
```

### 4.5 Jenkins URL 结构

理解 Jenkins 的 URL 结构可以帮助你快速导航：

```
http://company.com:8080/job/项目名/
│      │           │    │    │
│      │           │    │    └─ 你的项目名称
│      │           │    └────── Jenkins 的 job 路径
│      │           └─────────── 端口号（默认 8080，可自定义）
│      └─────────────────────── 公司域名或 IP
└────────────────────────────── 协议
```

**常见的 Jenkins URL 路径**：
- `/job/项目名/` - 项目主页
- `/job/项目名/build` - 触发构建
- `/job/项目名/configure` - 配置页面
- `/job/项目名/123/` - 第 123 次构建详情
- `/job/项目名/123/console` - 构建日志
- `/job/项目名/123/testReport/` - 测试报告

### 4.6 自动化测试 vs 应用部署

Jenkins 可以用于不同的场景，理解它们的区别很重要：

| 特性 | 自动化测试 | 应用部署 |
|------|-----------|---------|
| **目的** | 验证代码质量 | 发布应用到生产环境 |
| **执行位置** | Jenkins Agent 节点 | 目标服务器（阿里云等） |
| **代码去向** | 留在 workspace | 传输到目标服务器 |
| **主要操作** | 运行测试脚本 | 启动/重启应用服务 |
| **产物** | 测试报告 | 运行的应用 |
| **是否需要传包** | ❌ 不需要 | ✅ 需要（SCP/Docker） |
| **典型命令** | `pytest tests/` | `scp app.tar.gz server:/` |

**自动化测试流程**：
```
Git clone → 安装依赖 → 运行测试 → 生成报告 → 展示结果
（所有操作都在 Jenkins workspace 中完成）
```

**应用部署流程**：
```
Git clone → 构建应用 → 打包 → 传输到服务器 → 解压 → 重启服务
（需要将文件从 Jenkins 传输到目标服务器）
```

### 4.7 Pipeline 语法

Jenkins Pipeline 支持两种语法：

**Declarative Pipeline（声明式，推荐）**：

```groovy
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                echo 'Building...'
            }
        }
        stage('Test') {
            steps {
                echo 'Testing...'
            }
        }
        stage('Deploy') {
            steps {
                echo 'Deploying...'
            }
        }
    }
}
```

**Scripted Pipeline（脚本式）**：

```groovy
node {
    stage('Build') {
        echo 'Building...'
    }
    stage('Test') {
        echo 'Testing...'
    }
    stage('Deploy') {
        echo 'Deploying...'
    }
}
```

---

## 5. Jenkins 项目类型对比

### 5.1 两种主要项目类型

Jenkins 提供两种主要的项目类型，适用于不同的场景：

#### Freestyle Project（自由风格项目）

**特点**：
- 通过 Web UI 图形界面配置
- 点击选项卡填写配置
- 适合简单的构建任务
- 学习曲线平缓，容易上手

**适用场景**：
- 简单的自动化测试
- 单一的构建任务
- 团队不熟悉代码化配置
- 快速搭建 CI 环境

#### Pipeline Project（流水线项目）

**特点**：
- 使用 Jenkinsfile 代码定义
- 所有配置都在代码中
- 支持复杂的流程控制
- 可以版本控制

**适用场景**：
- 复杂的 CI/CD 流程
- 多阶段部署
- 需要版本控制配置
- 团队协作开发

### 5.2 对比表格

| 特性 | Freestyle Project | Pipeline Project |
|------|------------------|------------------|
| **配置方式** | Web UI 图形界面 | Jenkinsfile 代码 |
| **学习难度** | ⭐ 简单 | ⭐⭐⭐ 中等 |
| **灵活性** | ⭐⭐ 有限 | ⭐⭐⭐⭐⭐ 非常灵活 |
| **版本控制** | ❌ 不支持 | ✅ 支持（Jenkinsfile） |
| **复杂流程** | ❌ 不适合 | ✅ 非常适合 |
| **并行执行** | ❌ 不支持 | ✅ 支持 |
| **条件执行** | ⭐ 有限 | ⭐⭐⭐⭐⭐ 完全支持 |
| **可视化** | ✅ 配置界面友好 | ⭐⭐⭐ Blue Ocean 插件 |
| **适合场景** | 简单测试、构建 | 复杂 CI/CD 流程 |

### 5.3 配置方式对比

**Freestyle Project 配置**：
```
在 Jenkins Web UI 上：
1. 点击"新建任务" → 选择"构建一个自由风格的软件项目"
2. 在 General 填写项目信息
3. 在 Source Code Management 配置 Git
4. 在 Build Triggers 配置触发条件
5. 在 Build 添加构建步骤（Execute shell）
6. 在 Post-build Actions 配置构建后操作
7. 点击"保存"
```

**Pipeline Project 配置**：
```
在项目根目录创建 Jenkinsfile：

pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'npm install'
            }
        }
        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
    }
}
```

---

## 6. 创建 Freestyle Project（自由风格项目）

### 6.1 创建第一个 Freestyle Job

#### 步骤 1：创建项目

1. 登录 Jenkins Web UI
2. 点击"新建任务"
3. 输入任务名称：`my-first-test`
4. 选择"构建一个自由风格的软件项目"
5. 点击"确定"

#### 步骤 2：配置 General（基本信息）

```
General
├── 描述: 我的第一个自动化测试项目
├── ☑ 丢弃旧的构建
│   ├── 保持构建的天数: 7
│   └── 保持构建的最大个数: 10
└── ☑ GitHub 项目
    └── 项目 URL: https://github.com/your-username/test-project
```

**配置说明**：
- **丢弃旧的构建**：避免占用过多磁盘空间
- **保持天数/个数**：根据需求调整，测试项目建议保留 7-10 次

#### 步骤 3：配置 Source Code Management（源码管理）

```
Source Code Management
└── ☑ Git
    ├── Repository URL: https://github.com/your-username/test-project.git
    ├── Credentials: 选择或添加 Git 凭据
    └── Branches to build
        └── Branch Specifier: */main
```

**重要说明**：
- Jenkins 会自动 clone 代码到 workspace
- 每次构建会自动 pull 最新代码
- 不需要在 shell 里手动 git clone

**添加 Git 凭据**：
1. 点击 Credentials 旁的"添加"
2. 选择"Username with password"
3. 填写 GitHub 用户名和密码（或 Personal Access Token）
4. ID: `github-credentials`
5. 点击"添加"

#### 步骤 4：配置 Build Triggers（构建触发器）

```
Build Triggers
├── ☑ GitHub hook trigger for GITScm polling
│   └── 说明: Git push 时自动触发构建
│
├── ☑ Poll SCM
│   └── Schedule: H/5 * * * *
│       └── 说明: 每 5 分钟检查一次代码变化
│
└── ☑ Build periodically
    └── Schedule: H 2 * * *
        └── 说明: 每天凌晨 2 点自动构建
```

**Cron 语法说明**：
```
H/5 * * * *
│   │ │ │ │
│   │ │ │ └─ 星期几 (0-7)
│   │ │ └─── 月份 (1-12)
│   │ └───── 日期 (1-31)
│   └─────── 小时 (0-23)
└─────────── 分钟 (0-59, H 表示哈希值)
```

**常用 Cron 表达式**：
- `H/5 * * * *` - 每 5 分钟
- `H/15 * * * *` - 每 15 分钟
- `H 2 * * *` - 每天凌晨 2 点
- `H 2 * * 1-5` - 工作日凌晨 2 点
- `H 0 * * 0` - 每周日午夜

#### 步骤 5：配置 Build Environment（构建环境）

```
Build Environment
├── ☑ Delete workspace before build starts
│   └── 说明: 每次构建前清理 workspace，确保环境干净
│
├── ☑ Add timestamps to the Console Output
│   └── 说明: 在日志中显示时间戳
│
└── ☑ Use secret text(s) or file(s)
    └── 说明: 使用加密的密钥或配置文件
```

#### 步骤 6：配置 Build（构建步骤）

点击"增加构建步骤" → 选择"Execute shell"

**示例 1：Python 自动化测试**

```bash
#!/bin/bash
set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始执行自动化测试"
echo "当前目录: $(pwd)"
echo "当前分支: $(git branch --show-current)"
echo "=========================================="

# 创建虚拟环境
if [ ! -d "venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 升级 pip
pip install --upgrade pip

# 安装依赖
echo "安装项目依赖..."
pip install -r requirements.txt

# 运行测试
echo "运行自动化测试..."
pytest tests/ \
    --html=report.html \
    --self-contained-html \
    --junitxml=results.xml \
    --cov=src \
    --cov-report=html \
    -v

# 检查测试结果
if [ $? -eq 0 ]; then
    echo "✅ 所有测试通过！"
else
    echo "❌ 测试失败！"
    exit 1
fi
```

**示例 2：带环境变量的测试**

```bash
#!/bin/bash
set -e

# 设置测试环境变量
export TEST_ENV=staging
export API_URL=https://api-staging.company.com
export TIMEOUT=30

echo "测试环境: ${TEST_ENV}"
echo "API 地址: ${API_URL}"

# 激活虚拟环境
source venv/bin/activate || {
    python3 -m venv venv
    source venv/bin/activate
}

# 安装依赖
pip install -r requirements.txt

# 运行测试
pytest tests/ \
    --env=${TEST_ENV} \
    --base-url=${API_URL} \
    --timeout=${TIMEOUT} \
    --html=report.html \
    --junitxml=results.xml \
    -v

echo "测试完成！"
```

**示例 3：Node.js 项目测试**

```bash
#!/bin/bash
set -e

echo "Node 版本: $(node -v)"
echo "NPM 版本: $(npm -v)"

# 安装依赖
npm install

# 运行 lint
npm run lint

# 运行测试
npm test

# 构建项目
npm run build

echo "构建成功！"
```

#### 步骤 7：配置 Post-build Actions（构建后操作）

**添加测试报告发布**：

1. 点击"增加构建后操作步骤"
2. 选择"Publish JUnit test result report"
3. 配置：
   ```
   Test report XMLs: results.xml
   ☑ Retain long standard output/error
   ```

**添加 HTML 报告发布**：

1. 点击"增加构建后操作步骤"
2. 选择"Publish HTML reports"
3. 配置：
   ```
   HTML directory to archive: .
   Index page[s]: report.html
   Report title: Test Report
   ☑ Keep past HTML reports
   ```

**添加邮件通知**：

1. 点击"增加构建后操作步骤"
2. 选择"E-mail Notification"
3. 配置：
   ```
   Recipients: team@company.com
   ☑ Send e-mail for every unstable build
   ☑ Send separate e-mails to individuals who broke the build
   ```

#### 步骤 8：保存并运行

1. 点击"保存"
2. 点击"立即构建"
3. 查看"控制台输出"

### 6.2 查看构建结果

#### 控制台输出示例

```
Started by user admin
Running as SYSTEM
Building in workspace /var/lib/jenkins/workspace/my-first-test
The recommended git tool is: NONE
using credential github-credentials
 > git rev-parse --resolve-git-dir /var/lib/jenkins/workspace/my-first-test/.git
Fetching changes from the remote Git repository
 > git config remote.origin.url https://github.com/your-username/test-project.git
Fetching upstream changes from https://github.com/your-username/test-project.git
 > git fetch --tags --progress https://github.com/your-username/test-project.git
 > git rev-parse refs/remotes/origin/main^{commit}
Checking out Revision abc123def456 (refs/remotes/origin/main)
 > git config core.sparsecheckout
 > git checkout -f abc123def456
Commit message: "Add new test cases"
[my-first-test] $ /bin/sh -xe /tmp/jenkins1234567890.sh
+ echo ==========================================
==========================================
+ echo 开始执行自动化测试
开始执行自动化测试
+ pwd
/var/lib/jenkins/workspace/my-first-test
+ git branch --show-current
main
+ echo ==========================================
==========================================
+ [ ! -d venv ]
+ echo 创建 Python 虚拟环境...
创建 Python 虚拟环境...
+ python3 -m venv venv
+ source venv/bin/activate
+ pip install --upgrade pip
Successfully installed pip-23.0.1
+ echo 安装项目依赖...
安装项目依赖...
+ pip install -r requirements.txt
Successfully installed pytest-7.4.0 pytest-html-3.2.0
+ echo 运行自动化测试...
运行自动化测试...
+ pytest tests/ --html=report.html --junitxml=results.xml -v
========================= test session starts =========================
platform linux -- Python 3.9.16, pytest-7.4.0
collected 15 items

tests/test_api.py::test_login PASSED                           [  6%]
tests/test_api.py::test_logout PASSED                          [ 13%]
tests/test_api.py::test_get_user_info PASSED                   [ 20%]
tests/test_order.py::test_create_order PASSED                  [ 26%]
tests/test_order.py::test_cancel_order PASSED                  [ 33%]
tests/test_order.py::test_list_orders PASSED                   [ 40%]
tests/test_payment.py::test_pay_success PASSED                 [ 46%]
tests/test_payment.py::test_pay_failed PASSED                  [ 53%]
tests/test_search.py::test_search_product PASSED               [ 60%]
tests/test_search.py::test_search_empty PASSED                 [ 66%]
tests/test_cart.py::test_add_to_cart PASSED                    [ 73%]
tests/test_cart.py::test_remove_from_cart PASSED               [ 80%]
tests/test_cart.py::test_clear_cart PASSED                     [ 86%]
tests/test_checkout.py::test_checkout_success PASSED           [ 93%]
tests/test_checkout.py::test_checkout_failed PASSED            [100%]

========================= 15 passed in 5.23s ==========================
+ [ 0 -eq 0 ]
+ echo ✅ 所有测试通过！
✅ 所有测试通过！
Recording test results
[htmlpublisher] Archiving HTML reports...
[htmlpublisher] Archiving at BUILD level /var/lib/jenkins/workspace/my-first-test/report.html to /var/lib/jenkins/jobs/my-first-test/builds/1/htmlreports/Test_20Report
Finished: SUCCESS
```

### 6.3 高级配置

#### 参数化构建

允许构建时传入参数：

1. 勾选"This project is parameterized"
2. 添加参数：

**字符串参数**：
```
Name: TEST_ENV
Default Value: staging
Description: 测试环境 (dev/staging/prod)
```

**选择参数**：
```
Name: BROWSER
Choices:
  chrome
  firefox
  safari
Description: 测试浏览器
```

**布尔参数**：
```
Name: RUN_SMOKE_TEST
Default Value: true
Description: 是否运行冒烟测试
```

在 shell 中使用参数：

```bash
#!/bin/bash
echo "测试环境: ${TEST_ENV}"
echo "浏览器: ${BROWSER}"
echo "运行冒烟测试: ${RUN_SMOKE_TEST}"

pytest tests/ \
    --env=${TEST_ENV} \
    --browser=${BROWSER} \
    -v
```

#### 多个构建步骤

可以添加多个 Execute shell 步骤：

**步骤 1：环境检查**
```bash
#!/bin/bash
echo "检查环境..."
python3 --version
pip --version
git --version
```

**步骤 2：安装依赖**
```bash
#!/bin/bash
echo "安装依赖..."
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**步骤 3：运行测试**
```bash
#!/bin/bash
echo "运行测试..."
source venv/bin/activate
pytest tests/ -v
```

#### 条件执行

使用 shell 脚本实现条件逻辑：

```bash
#!/bin/bash
set -e

# 只在 main 分支运行完整测试
BRANCH=$(git branch --show-current)

if [ "$BRANCH" = "main" ]; then
    echo "主分支，运行完整测试..."
    pytest tests/ -v
else
    echo "非主分支，只运行冒烟测试..."
    pytest tests/ -m smoke -v
fi
```

### 6.4 实战案例：完整的自动化测试项目

#### 项目结构

```
test-automation/
├── tests/
│   ├── test_api.py
│   ├── test_ui.py
│   └── conftest.py
├── requirements.txt
├── pytest.ini
└── README.md
```

#### Jenkins Freestyle 完整配置

**General**：
```
项目名称: automation-test-suite
描述: 自动化测试套件
☑ 丢弃旧的构建
  保持构建的天数: 7
  保持构建的最大个数: 10
☑ This project is parameterized
  参数: TEST_ENV (staging/production)
```

**Source Code Management**：
```
☑ Git
  Repository URL: https://github.com/company/test-automation.git
  Credentials: github-credentials
  Branch: */main
```

**Build Triggers**：
```
☑ GitHub hook trigger for GITScm polling
☑ Poll SCM: H/10 * * * *
```

**Build Environment**：
```
☑ Delete workspace before build starts
☑ Add timestamps to the Console Output
```

**Build - Execute shell**：
```bash
#!/bin/bash
set -e

echo "=========================================="
echo "自动化测试开始"
echo "测试环境: ${TEST_ENV}"
echo "构建编号: ${BUILD_NUMBER}"
echo "构建 URL: ${BUILD_URL}"
echo "=========================================="

# 创建并激活虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install --upgrade pip
pip install -r requirements.txt

# 运行测试
pytest tests/ \
    --env=${TEST_ENV} \
    --html=report.html \
    --self-contained-html \
    --junitxml=results.xml \
    --cov=tests \
    --cov-report=html \
    --cov-report=term \
    -v \
    --tb=short

# 保存退出码
TEST_EXIT_CODE=$?

# 输出测试统计
echo "=========================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ 测试通过"
else
    echo "❌ 测试失败"
fi
echo "=========================================="

exit $TEST_EXIT_CODE
```

**Post-build Actions**：
```
1. Publish JUnit test result report
   Test report XMLs: results.xml

2. Publish HTML reports
   HTML directory: .
   Index page: report.html
   Report title: Test Report

3. Publish HTML reports (Coverage)
   HTML directory: htmlcov
   Index page: index.html
   Report title: Coverage Report

4. E-mail Notification
   Recipients: qa-team@company.com
```

---

## 7. 创建第一个 Pipeline

### 7.1 创建 Pipeline Job

1. 点击"新建任务"
2. 输入任务名称：`hello-pipeline`
3. 选择"流水线（Pipeline）"
4. 点击"确定"

### 5.2 编写 Pipeline 脚本

在"Pipeline"配置区域，选择"Pipeline script"，输入：

```groovy
pipeline {
    agent any

    stages {
        stage('Hello') {
            steps {
                echo 'Hello, Jenkins!'
                sh 'date'
                sh 'pwd'
                sh 'ls -la'
            }
        }

        stage('Environment') {
            steps {
                echo "Running on ${env.NODE_NAME}"
                echo "Build number: ${env.BUILD_NUMBER}"
                echo "Job name: ${env.JOB_NAME}"
            }
        }
    }
}
```

### 5.3 运行 Pipeline

1. 点击"保存"
2. 点击"立即构建"
3. 查看"控制台输出"

你会看到类似输出：

```
Started by user admin
Running in Durability level: MAX_SURVIVABILITY
[Pipeline] Start of Pipeline
[Pipeline] node
Running on Jenkins in /var/lib/jenkins/workspace/hello-pipeline
[Pipeline] {
[Pipeline] stage
[Pipeline] { (Hello)
[Pipeline] echo
Hello, Jenkins!
[Pipeline] sh
+ date
Fri Jan 31 10:30:45 CST 2026
[Pipeline] }
[Pipeline] // stage
[Pipeline] }
[Pipeline] // node
[Pipeline] End of Pipeline
Finished: SUCCESS
```

---

## 6. 集成 Git 仓库

### 6.1 安装 Git

在 Jenkins 服务器上安装 Git：

```bash
# Ubuntu/Debian
sudo apt install -y git

# CentOS/RHEL
sudo yum install -y git
```

### 6.2 配置 Git 凭据

如果你的 Git 仓库是私有的，需要配置凭据。

**方式一：用户名密码**

1. Jenkins 首页 → "Manage Jenkins" → "Manage Credentials"
2. 点击"(global)" → "Add Credentials"
3. 选择"Username with password"
4. 填写：
   - Username: 你的 Git 用户名
   - Password: 你的 Git 密码或 Personal Access Token
   - ID: git-credentials（自定义）
   - Description: Git 凭据

**方式二：SSH 密钥（推荐）**

1. 在 Jenkins 服务器生成 SSH 密钥：

```bash
# 切换到 jenkins 用户
sudo su - jenkins

# 生成 SSH 密钥
ssh-keygen -t rsa -b 4096 -C "jenkins@aliyun"

# 查看公钥
cat ~/.ssh/id_rsa.pub
```

2. 将公钥添加到 Git 仓库（GitHub/GitLab/Gitee）
3. 在 Jenkins 中添加 SSH 私钥凭据：
   - Kind: SSH Username with private key
   - Username: git
   - Private Key: 粘贴 `~/.ssh/id_rsa` 的内容

### 6.3 创建 Git Pipeline

创建新的 Pipeline 任务：`git-pipeline`

```groovy
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                // 从 Git 仓库拉取代码
                git branch: 'main',
                    credentialsId: 'git-credentials',
                    url: 'https://github.com/your-username/your-repo.git'
            }
        }

        stage('List Files') {
            steps {
                sh 'ls -la'
                sh 'git log -1'
            }
        }
    }
}
```

---

## 7. 实战：部署 Node.js 项目

### 7.1 准备示例项目

创建一个简单的 Node.js 项目：

**项目结构**：

```
my-node-app/
├── package.json
├── app.js
└── Jenkinsfile
```

**package.json**：

```json
{
  "name": "my-node-app",
  "version": "1.0.0",
  "description": "Simple Node.js app for Jenkins CI/CD",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "test": "echo \"Running tests...\" && exit 0"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

**app.js**：

```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Jenkins CI/CD!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Jenkinsfile**：

```groovy
pipeline {
    agent any

    environment {
        APP_NAME = 'my-node-app'
        DEPLOY_PATH = '/var/www/my-node-app'
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing Node.js dependencies...'
                sh 'npm install'
            }
        }

        stage('Test') {
            steps {
                echo 'Running tests...'
                sh 'npm test'
            }
        }

        stage('Build') {
            steps {
                echo 'Building application...'
                sh 'tar -czf ${APP_NAME}.tar.gz --exclude=node_modules --exclude=.git .'
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying to production...'
                sh '''
                    # 创建部署目录
                    sudo mkdir -p ${DEPLOY_PATH}

                    # 解压应用
                    sudo tar -xzf ${APP_NAME}.tar.gz -C ${DEPLOY_PATH}

                    # 安装依赖
                    cd ${DEPLOY_PATH}
                    sudo npm install --production

                    # 重启应用（使用 PM2）
                    sudo pm2 restart ${APP_NAME} || sudo pm2 start app.js --name ${APP_NAME}
                '''
            }
        }
    }

    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed!'
        }
        always {
            echo 'Cleaning up...'
            sh 'rm -f ${APP_NAME}.tar.gz'
        }
    }
}
```

### 7.2 在服务器上安装 Node.js 和 PM2

```bash
# 安装 Node.js（使用 NodeSource 仓库）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v
npm -v

# 安装 PM2（进程管理器）
sudo npm install -g pm2

# 设置 PM2 开机自启
sudo pm2 startup systemd
```

### 7.3 配置 Jenkins 用户权限

Jenkins 需要权限来部署应用：

```bash
# 将 jenkins 用户添加到 sudo 组
sudo usermod -aG sudo jenkins

# 配置 jenkins 用户无密码执行特定命令
sudo visudo
```

添加以下行：

```
jenkins ALL=(ALL) NOPASSWD: /usr/bin/npm, /usr/bin/pm2, /bin/mkdir, /bin/tar, /bin/chown
```

### 7.4 创建 Jenkins Pipeline

1. 新建 Pipeline 任务：`node-app-deploy`
2. 配置：
   - Pipeline definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: 你的 Git 仓库地址
   - Credentials: 选择之前配置的凭据
   - Branch: */main
   - Script Path: Jenkinsfile

3. 保存并构建

### 7.5 验证部署

```bash
# 查看 PM2 进程
pm2 list

# 查看应用日志
pm2 logs my-node-app

# 测试应用
curl http://localhost:3000
```

---

## 8. 配置自动触发构建

### 8.1 使用 Webhook（推荐）

**GitHub Webhook 配置**：

1. 进入 GitHub 仓库 → Settings → Webhooks → Add webhook
2. Payload URL: `http://<your-jenkins-ip>:8080/github-webhook/`
3. Content type: application/json
4. 选择触发事件：Just the push event
5. 点击"Add webhook"

**Jenkins 配置**：

1. 进入 Pipeline 配置
2. 勾选"GitHub hook trigger for GITScm polling"
3. 保存

现在每次 push 代码到 GitHub，Jenkins 会自动触发构建。

### 8.2 使用轮询（Poll SCM）

如果无法使用 Webhook，可以使用轮询方式：

1. 进入 Pipeline 配置
2. 勾选"Poll SCM"
3. Schedule 填写：`H/5 * * * *`（每 5 分钟检查一次）

**Cron 语法说明**：

```
H/5 * * * *
│   │ │ │ │
│   │ │ │ └─ 星期几 (0-7, 0 和 7 都表示周日)
│   │ │ └─── 月份 (1-12)
│   │ └───── 日期 (1-31)
│   └─────── 小时 (0-23)
└─────────── 分钟 (0-59, H 表示哈希值，避免同时触发)
```

---

## 9. 高级配置

### 9.1 配置 SSH 远程部署

如果你想部署到另一台阿里云服务器：

**安装 SSH Agent 插件**：

1. Manage Jenkins → Manage Plugins
2. 搜索"SSH Agent"
3. 安装并重启

**配置 SSH 凭据**：

1. Manage Jenkins → Manage Credentials
2. 添加 SSH Username with private key
3. 填写目标服务器的 SSH 私钥

**Pipeline 示例**：

```groovy
pipeline {
    agent any

    environment {
        REMOTE_HOST = '192.168.1.100'
        REMOTE_USER = 'deploy'
        DEPLOY_PATH = '/var/www/app'
    }

    stages {
        stage('Deploy to Remote') {
            steps {
                sshagent(['ssh-credentials-id']) {
                    sh '''
                        # 上传文件
                        scp -r ./* ${REMOTE_USER}@${REMOTE_HOST}:${DEPLOY_PATH}/

                        # 远程执行命令
                        ssh ${REMOTE_USER}@${REMOTE_HOST} "
                            cd ${DEPLOY_PATH}
                            npm install --production
                            pm2 restart my-app
                        "
                    '''
                }
            }
        }
    }
}
```

### 9.2 使用环境变量

**定义环境变量**：

```groovy
pipeline {
    agent any

    environment {
        // 全局环境变量
        APP_ENV = 'production'
        DB_HOST = 'localhost'

        // 使用凭据
        DB_PASSWORD = credentials('db-password-id')
    }

    stages {
        stage('Deploy') {
            environment {
                // Stage 级别的环境变量
                DEPLOY_ENV = 'prod'
            }
            steps {
                sh 'echo "Deploying to ${DEPLOY_ENV}"'
                sh 'echo "DB Host: ${DB_HOST}"'
            }
        }
    }
}
```

### 9.3 并行执行

```groovy
pipeline {
    agent any

    stages {
        stage('Parallel Tests') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'npm run test:unit'
                    }
                }
                stage('Integration Tests') {
                    steps {
                        sh 'npm run test:integration'
                    }
                }
                stage('Lint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
            }
        }
    }
}
```

### 9.4 条件执行

```groovy
pipeline {
    agent any

    stages {
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                echo 'Deploying to production...'
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                echo 'Deploying to staging...'
            }
        }
    }
}
```

---

## 10. 故障排查

### 10.1 常见问题

**问题 1：Jenkins 无法访问**

```bash
# 检查 Jenkins 服务状态
sudo systemctl status jenkins

# 查看 Jenkins 日志
sudo journalctl -u jenkins -f

# 检查端口占用
sudo netstat -tlnp | grep 8080
```

**问题 2：权限不足**

```bash
# 检查 jenkins 用户权限
sudo -u jenkins ls /var/www/

# 修改目录权限
sudo chown -R jenkins:jenkins /var/www/my-app
```

**问题 3：Git 克隆失败**

```bash
# 测试 Git 连接
sudo -u jenkins git clone <your-repo-url> /tmp/test

# 检查 SSH 密钥
sudo -u jenkins ssh -T git@github.com
```

**问题 4：Node.js 命令找不到**

```bash
# 在 Jenkins 中配置 Node.js 路径
# Manage Jenkins → Global Tool Configuration → NodeJS
# 或在 Pipeline 中指定路径
sh 'export PATH=/usr/bin:$PATH && npm install'
```

### 10.2 查看日志

```bash
# Jenkins 主日志
sudo tail -f /var/log/jenkins/jenkins.log

# 构建日志
# 在 Jenkins Web UI 中查看：Job → Build History → Console Output
```

---

## 11. 安全加固

### 11.1 配置 HTTPS

使用 Nginx 作为反向代理：

```bash
# 安装 Nginx
sudo apt install -y nginx

# 配置 Nginx
sudo nano /etc/nginx/sites-available/jenkins
```

添加配置：

```nginx
server {
    listen 80;
    server_name jenkins.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/jenkins /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 11.2 配置防火墙

```bash
# 只允许特定 IP 访问 Jenkins
sudo ufw allow from <your-ip> to any port 8080

# 或使用 Nginx 后，关闭 8080 外部访问
sudo ufw delete allow 8080
sudo ufw allow 80
sudo ufw allow 443
```

### 11.3 启用安全选项

1. Manage Jenkins → Configure Global Security
2. 启用"Prevent Cross Site Request Forgery exploits"
3. 配置"Authorization" → "Matrix-based security"
4. 限制匿名用户权限

---

## 12. 总结

通过本教程，你已经学会了：

✅ 在阿里云服务器上安装和配置 Jenkins
✅ 创建和运行 Jenkins Pipeline
✅ 集成 Git 仓库并配置自动触发
✅ 部署 Node.js 应用到生产环境
✅ 配置 SSH 远程部署
✅ 使用环境变量和并行执行
✅ 故障排查和安全加固

### 下一步学习

- **多环境部署**：配置 dev/staging/production 环境
- **Docker 集成**：使用 Docker 容器化部署
- **Kubernetes 部署**：将应用部署到 K8s 集群
- **监控告警**：集成 Prometheus + Grafana
- **自动化测试**：集成单元测试、集成测试、E2E 测试

---

## 13. 参考资源

- [Jenkins 官方文档](https://www.jenkins.io/doc/)
- [Jenkins Pipeline 语法](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Jenkins 插件中心](https://plugins.jenkins.io/)
- [阿里云 ECS 文档](https://help.aliyun.com/product/25365.html)
- [PM2 文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
