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

## 5. 创建第一个 Pipeline

### 5.1 创建 Pipeline Job

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
