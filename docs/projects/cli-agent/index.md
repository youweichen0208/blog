# HWRDS — 华为云 RDS 命令行工具 + 智能 Agent

---

## 1. 项目背景

### 1.1 行业现状

当前主流云厂商均提供了成熟的数据库管理 CLI 工具：AWS 的 `aws rds` 命令集支持完整的 RDS 实例生命周期管理，阿里云的 `aliyun rds` 同样覆盖了从创建到删除的全流程操作。这些工具已成为企业客户日常运维的标配。

华为云在 RDS 产品能力上已经具备竞争力，但在命令行工具层面与 AWS 和阿里云存在差距。客户在自动化运维、脚本化管理场景下缺乏高效工具，往往需要通过控制台手动操作，效率低下。

### 1.2 项目目标

开发一套对标 AWS CLI 和阿里云 CLI 的华为云 RDS 命令行工具，并创新性地叠加 AI Agent 智能交互层，实现：

- 客户通过命令行完成 RDS 实例全生命周期管理（创建、查询、删除、重启、备份）
- 客户通过自然语言对话完成复杂操作，降低使用门槛
- 单二进制分发，客户下载即用，零依赖

### 1.3 目标用户

- **企业 DevOps / SRE 团队：** 需要脚本化、自动化管理数据库
- **开发者：** 在开发/测试环境快速创建和销毁数据库实例
- **DBA：** 日常实例管理、备份、监控
- **新手用户：** 通过 Agent 自然语言交互降低学习曲线

---

## 2. 需求分析

### 2.1 竞品对标分析

| 功能维度          | AWS CLI             | 阿里云 CLI | HWRDS（本项目）     |
| ----------------- | ------------------- | ---------- | ------------------- |
| 实例 CRUD         | ✓                   | ✓          | ✓                   |
| 备份管理          | ✓                   | ✓          | ✓                   |
| 规格查询          | ✓                   | ✓          | ✓                   |
| 等待机制 (Waiter) | ✓                   | ✗          | ✓                   |
| 交互式创建        | ✗                   | ✓          | ✓                   |
| 多格式输出        | ✓ (table/json/yaml) | ✓ (json)   | ✓ (table/json/yaml) |
| AI Agent 智能交互 | ✗                   | ✗          | **✓ 创新**          |
| 自然语言参数补全  | ✗                   | ✗          | **✓ 创新**          |

> **竞争优势：** HWRDS 在对标 AWS 和阿里云全部基础功能的同时，创新性地加入 AI Agent 智能交互层，这是竞品均未提供的差异化能力。

### 2.2 核心功能需求

#### Phase 1：CLI 基础能力（第 1-6 周）

| 命令                     | 说明                        | 优先级 | 周次     |
| ------------------------ | --------------------------- | ------ | -------- |
| hwrds configure          | 配置 AK/SK/Region/ProjectID | P0     | 第 1 周  |
| hwrds flavor list        | 查询可用数据库规格          | P0     | 第 2 周  |
| hwrds instance create    | 创建 RDS 实例 + 等待就绪    | P0     | 第 3 周  |
| hwrds instance list      | 列出所有实例                | P0     | 第 4 周  |
| hwrds instance show      | 查看实例详情 + 连接信息     | P0     | 第 4 周  |
| hwrds instance delete    | 删除实例（二次确认）        | P0     | 第 5 周  |
| hwrds instance restart   | 重启实例                    | P1     | 第 5 周  |
| hwrds backup create/list | 备份管理                    | P1     | 第 11 周 |

#### Phase 2：Agent 智能交互层（第 7-12 周）

| 模块                | 说明                                    | 优先级 | 周次     |
| ------------------- | --------------------------------------- | ------ | -------- |
| LLM HTTP 客户端     | net/http 调用 LLM API，不依赖第三方 SDK | P0     | 第 7 周  |
| 响应解析器          | JSON 解析，提取 tool_use / end_turn     | P0     | 第 7 周  |
| Tool 注册表         | Service 函数映射为 LLM Tool             | P0     | 第 8 周  |
| Tool-calling 主循环 | 调 LLM → 执行 Tool → 喂回结果 → 循环    | P0     | 第 8 周  |
| 安全确认机制        | 三级安全模型：直接执行/确认/强确认      | P0     | 第 9 周  |
| 系统提示词          | 角色定义 + 行为约束 + 参数补全引导      | P0     | 第 9 周  |
| hwrds chat 命令     | 单次模式 + 交互式多轮对话               | P0     | 第 10 周 |

### 2.3 非功能需求

- **分发：** 单二进制分发，支持 Linux / macOS / Windows 三平台，客户下载即用
- **性能：** CLI 启动时间 < 100ms，API 调用超时 30s，Agent 单轮超时 60s
- **安全：** AK/SK 本地存储权限 0600，支持环境变量覆盖，删除操作必须二次确认
- **可用性：** API 调用自动重试（最多 3 次，指数退避），错误码翻译为人类可读提示
- **测试：** Service 层覆盖率 > 70%，CI 自动运行全量测试

---

## 3. 技术选型：为什么选择 Go

### 3.1 CLI 场景的天然优势

Go 是 CLI 工具开发的行业标准选择。以下知名 CLI 工具均基于 Go 构建：

| 工具      | 开发者        | 用途                |
| --------- | ------------- | ------------------- |
| kubectl   | Google / CNCF | Kubernetes 集群管理 |
| docker    | Docker Inc.   | 容器管理            |
| gh        | GitHub        | GitHub CLI          |
| terraform | HashiCorp     | 基础设施即代码      |
| hugo      | Hugo Authors  | 静态网站生成        |

### 3.2 与其他语言的对比

| 维度       | Go                      | TypeScript         | Python               |
| ---------- | ----------------------- | ------------------ | -------------------- |
| 二进制体积 | **10-15 MB**            | 50-70 MB (pkg)     | 80+ MB (PyInstaller) |
| 启动速度   | **~10ms**               | ~200ms             | ~500ms               |
| 打包复杂度 | **go build 一条命令**   | 需要 esbuild + pkg | 需要 PyInstaller     |
| 交叉编译   | **极简（GOOS/GOARCH）** | 需分平台打包       | 需分平台打包         |
| 运行时依赖 | **无**                  | 内嵌 Node.js       | 内嵌 Python          |
| CLI 生态   | **Cobra（业界标准）**   | oclif（成熟）      | Click（成熟）        |
| 并发能力   | **goroutine 原生支持**  | 单线程 async       | GIL 限制             |

### 3.3 Go 做自定义 Agent 的可行性

本项目采用自定义 Agent 方案，不依赖任何第三方 Agent 框架。Agent 的核心本质是一个 HTTP 调用 + JSON 解析的循环，Go 的标准库完全能胜任：

- **net/http：** 调用 LLM API，构造请求 / 解析响应
- **encoding/json：** 解析 tool_use 参数、构造 tool_result
- **fmt + os：** 确认机制的用户交互

> **为什么不用 LLM SDK？** 本项目选择自定义实现 Agent，不使用 Anthropic SDK 或 OpenAI SDK。原因是：Agent 的核心就是 HTTP POST + JSON 解析 + 循环，Go 标准库完全覆盖；自定义实现可以同时支持 Anthropic、OpenAI 等多个 LLM 提供商，通过配置切换；减少第三方依赖，保持二进制体积最小。

### 3.4 Go 的分发优势

Go 的交叉编译能力是选择它的决定性因素之一。一条 `go build` 命令即可生成目标平台的二进制文件，客户下载后直接运行，无需安装任何运行时环境：

| 平台                  | 编译命令                           | 产物体积 |
| --------------------- | ---------------------------------- | -------- |
| Linux (amd64)         | GOOS=linux GOARCH=amd64 go build   | ~12 MB   |
| Linux (arm64)         | GOOS=linux GOARCH=arm64 go build   | ~12 MB   |
| macOS (Intel)         | GOOS=darwin GOARCH=amd64 go build  | ~13 MB   |
| macOS (Apple Silicon) | GOOS=darwin GOARCH=arm64 go build  | ~13 MB   |
| Windows               | GOOS=windows GOARCH=amd64 go build | ~13 MB   |

---

## 4. 架构设计

### 4.1 分层架构

项目采用三层架构，CLI 和 Agent 共用 Service 层，避免业务逻辑重复：

| 层次       | 职责                  | 技术实现                  |
| ---------- | --------------------- | ------------------------- |
| 用户交互层 | CLI 命令 + Agent Chat | Cobra 命令 / Agent 主循环 |
| Service 层 | 核心业务逻辑（共用）  | Go struct + interface     |
| SDK 层     | 华为云 API 封装       | net/http + AK/SK 签名     |

# HWRDS 架构设计全景图

---

## 一、总体架构（简化版）

```mermaid
graph TB
    CLI["CLI 命令<br/>hwrds instance create/list/delete"]
    CHAT["Agent 对话<br/>hwrds chat '创建MySQL实例'"]
    CMD["命令层 cmd/"]
    AGENT["Agent 主循环<br/>LLM 交互 + Tool 调用"]
    SERVICE["Service 层<br/>实例/规格/备份管理"]
    SDK["SDK 层<br/>HTTP + AK/SK 签名"]
    CONFIG["配置管理<br/>~/.hwrds/config.yaml"]
    UI["UI 输出<br/>table/json/yaml"]
    CLOUD["华为云 RDS API"]
    LLM["LLM API<br/>Anthropic/OpenAI"]

    CLI --> CMD
    CHAT --> CMD
    CMD --> SERVICE
    CMD --> AGENT
    AGENT <--> LLM
    AGENT --> SERVICE
    SERVICE --> SDK
    SERVICE --> UI
    SDK --> CONFIG
    SDK --> CLOUD

    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef cloudStyle fill:#F0F0F0,stroke:#666,stroke-width:2px,color:#000

    class CLI,CHAT,CMD,AGENT,SERVICE,SDK,CONFIG,UI nodeStyle
    class CLOUD,LLM cloudStyle
```

### 架构说明

**核心设计原则：两条路径，一个核心**

1. **CLI 路径**：`CLI 命令 → cmd/ → Service 层 → SDK → 华为云`
2. **Agent 路径**：`Agent 对话 → cmd/chat → Agent 主循环 ↔ LLM → Service 层 → SDK → 华为云`
3. **共享核心**：CLI 和 Agent 都调用同一个 Service 层，避免业务逻辑重复

**分层职责**

| 层次       | 职责                                  | 关键模块                         |
| ---------- | ------------------------------------- | -------------------------------- |
| 命令层     | 解析用户输入，路由到 Service 或 Agent | cmd/                             |
| Agent 层   | LLM 交互、Tool 调用、安全确认         | agent/agent.go, llm.go, tools.go |
| Service 层 | 核心业务逻辑（CLI 和 Agent 共用）     | service/instance.go, flavor.go   |
| SDK 层     | 华为云 API 封装、签名、错误处理       | sdk/client.go, signer.go         |
| 基础设施   | 配置、UI 输出                         | config/, ui/                     |

---

## 二、CLI 开发流程（第 1-6 周）

```mermaid
graph LR
    W1["W1: 配置+SDK基座<br/>AK/SK + HTTP签名"]
    W2["W2: 规格查询+输出<br/>flavor list + formatter"]
    W3["W3: 创建实例+等待<br/>create + waiter"]
    W4["W4: 列表+详情<br/>list + show"]
    W5["W5: 删除+重启<br/>delete + restart"]
    W6["W6: 错误处理+测试<br/>error + CI"]

    W1 --> W2 --> W3 --> W4 --> W5 --> W6

    classDef weekStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    class W1,W2,W3,W4,W5,W6 weekStyle
```

**关键里程碑**

- W1-2: 链路打通（configure + SDK 签名 + flavor list）
- W3-4: 核心功能（create / list / show）
- W5-6: 完善体验（delete / restart + 错误处理 + 测试）

---

## 三、Agent 主控循环

```mermaid
graph TD
    START["用户输入"]
    CALL["调用 LLM API"]
    CHECK{"stop_reason?"}
    TOOL["提取 tool_use"]
    SAFE{"安全级别?"}
    CONFIRM["用户确认?"]
    EXEC["执行 Service"]
    FEED["结果喂回 LLM"]
    OUTPUT["输出回复"]
    DONE["结束"]

    START --> CALL
    CALL --> CHECK
    CHECK -->|tool_use| TOOL
    CHECK -->|end_turn| OUTPUT
    TOOL --> SAFE
    SAFE -->|只读| EXEC
    SAFE -->|写入/删除| CONFIRM
    CONFIRM -->|Yes| EXEC
    CONFIRM -->|No| FEED
    EXEC --> FEED
    FEED --> CALL
    OUTPUT --> DONE

    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef decisionStyle fill:#F0E6FF,stroke:#4B0082,stroke-width:2px,color:#000

    class START,CALL,TOOL,EXEC,FEED,OUTPUT,DONE nodeStyle
    class CHECK,SAFE,CONFIRM decisionStyle
```

**三级安全模型**

- **直接执行**：list / show / flavor（只读操作）
- **Y/N 确认**：create / restart（写操作，展示参数摘要）
- **强确认**：delete（删除操作，需输入实例名）

---

## 四、Agent 开发流程（第 7-12 周）

```mermaid
graph LR
    W7["W7: LLM客户端+解析<br/>HTTP + JSON parser"]
    W8["W8: Tool注册+主循环<br/>Service映射 + loop"]
    W9["W9: 确认机制+提示词<br/>三级安全 + prompts"]
    W10["W10: chat命令+对话<br/>单次 + 交互模式"]
    W11["W11: 备份+交互式<br/>backup + interactive"]
    W12["W12: 测试+打包+文档<br/>CI + release"]

    W7 --> W8 --> W9 --> W10 --> W11 --> W12

    classDef weekStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    class W7,W8,W9,W10,W11,W12 weekStyle
```

**关键里程碑**

- W7-8: Agent 跑通（LLM 客户端 + Tool-calling 循环）
- W9-10: Agent 可用（安全确认 + chat 命令）
- W11-12: 产品发布（完整功能 + 测试 + 打包）

---

## 五、完整数据流示例

用户通过 Agent 创建 MySQL 实例的完整交互流程：

```
用户: "帮我创建一个 MySQL 8.0 实例，4核16G"
  │
  ▼
Agent 循环:
  1. 调用 LLM → 返回 tool_use: list_flavors
  2. 执行查询 → 找到匹配规格 rds.mysql.m6.large.8
  3. 结果喂回 LLM → 发现缺少 VPC/密码，询问用户
  4. 用户补充: "用 prod-vpc，名字 prod-mysql，密码 MyPass123!"
  5. LLM 返回 tool_use: create_instance
  6. 展示参数摘要 → 用户确认 (Y)
  7. 执行创建 → 等待就绪
  8. 返回实例 ID + 连接信息
```

<details>
<summary>点击展开查看详细时序图</summary>

```mermaid
sequenceDiagram
    actor User as 用户
    participant Agent as Agent
    participant LLM as LLM API
    participant Service as Service 层
    participant Cloud as 华为云 API

    User->>Agent: "创建MySQL实例 4核16G"

    Note over Agent,LLM: 第1轮
    Agent->>LLM: POST (messages + tools)
    LLM-->>Agent: tool_use: list_flavors
    Agent->>Service: FlavorService.List()
    Service->>Cloud: GET /flavors
    Cloud-->>Service: 规格列表
    Service-->>Agent: 找到匹配规格

    Note over Agent,LLM: 第2轮
    Agent->>LLM: POST (tool_result)
    LLM-->>Agent: end_turn: "还需要VPC和密码"
    Agent-->>User: 询问缺失参数

    User->>Agent: "用prod-vpc，密码MyPass123!"

    Note over Agent,LLM: 第3轮
    Agent->>LLM: POST (用户回复)
    LLM-->>Agent: tool_use: create_instance
    Agent-->>User: 展示参数，确认？(Y/n)
    User-->>Agent: Y
    Agent->>Service: InstanceService.Create()
    Service->>Cloud: POST /instances
    Cloud-->>Service: 实例创建中

    Note over Service: 轮询等待
    loop 每10s
        Service->>Cloud: GET /instances/{id}
        Cloud-->>Service: status: Running
    end

    Service-->>Agent: 实例已就绪

    Note over Agent,LLM: 第4轮
    Agent->>LLM: POST (tool_result)
    LLM-->>Agent: end_turn: 最终回复
    Agent-->>User: "实例已创建！连接: mysql -h 192.168.0.55"
```

</details>

---

## 六、模块详细展开（可选查看）

# HWRDS 架构设计全景图

---

## 一、总体架构

```mermaid
graph TB
    subgraph USER["用户入口"]
        CLI["⌨️ CLI 命令<br/>hwrds instance create<br/>hwrds instance list<br/>hwrds flavor list"]
        CHAT["Agent 对话<br/>hwrds chat '创建MySQL实例'"]
    end

    subgraph CMD["命令层 cmd/"]
        CMD_CONF["configure.go"]
        CMD_INST["instance_create.go<br/>instance_list.go<br/>instance_show.go<br/>instance_delete.go<br/>instance_restart.go"]
        CMD_FLAVOR["flavor_list.go"]
        CMD_BACKUP["backup_create.go<br/>backup_list.go"]
        CMD_CHAT["chat.go"]
    end

    subgraph AGENT["Agent 层 agent/"]
        AGENT_MAIN["agent.go<br/>主控循环 (tool-calling loop)"]
        AGENT_LLM["llm.go<br/>net/http POST → LLM API<br/>JSON 构造/解析<br/>错误重试 + 限流"]
        AGENT_PARSER["parser.go<br/>提取 stop_reason<br/>提取 tool_use block<br/>提取最终文本回复"]
        AGENT_TOOLS["tools.go<br/>Tool 注册表<br/>Service → Tool 映射<br/>参数类型转换"]
        AGENT_CONFIRM["confirm.go<br/>三级安全模型<br/>直接执行/确认/强确认"]
        AGENT_PROMPT["prompts.go<br/>系统提示词<br/>角色 + 行为约束"]
    end

    subgraph SERVICE["⚙️ Service 层 service/ — CLI 和 Agent 共用"]
        SVC_INST["instance.go<br/>Create / List / Show<br/>Delete / Restart"]
        SVC_FLAVOR["flavor.go<br/>ListFlavors"]
        SVC_BACKUP["backup.go<br/>Create / List"]
        SVC_AUTH["auth.go<br/>认证管理"]
        SVC_WAITER["waiter.go<br/>轮询等待资源就绪"]
    end

    subgraph SDK["SDK 层 sdk/"]
        SDK_CLIENT["client.go<br/>HTTP 客户端"]
        SDK_SIGNER["signer.go<br/>AK/SK HWS-HMAC-SHA256"]
        SDK_RDS["rds.go<br/>RDS API 请求定义"]
        SDK_ERR["errors.go<br/>错误码 → 人类可读提示"]
    end

    subgraph CONFIG["配置层 config/"]
        CFG_STORE["store.go<br/>~/.hwrds/config.yaml"]
        CFG_PROFILE["profile.go<br/>多 Profile 管理"]
    end

    subgraph UI["输出层 ui/"]
        UI_TABLE["table.go"]
        UI_SPINNER["spinner.go"]
        UI_COLOR["color.go"]
        UI_FMT["formatter.go<br/>table / json / yaml"]
    end

    CLOUD["Huawei Cloud RDS API"]
    LLM["LLM API<br/>Anthropic / OpenAI"]

    %% User → Command
    CLI --> CMD_CONF
    CLI --> CMD_INST
    CLI --> CMD_FLAVOR
    CLI --> CMD_BACKUP
    CHAT --> CMD_CHAT

    %% Command → Service (CLI path)
    CMD_CONF --> CFG_STORE
    CMD_INST --> SVC_INST
    CMD_FLAVOR --> SVC_FLAVOR
    CMD_BACKUP --> SVC_BACKUP

    %% Command → Agent (Chat path)
    CMD_CHAT --> AGENT_MAIN

    %% Agent internal
    AGENT_MAIN --> AGENT_LLM
    AGENT_MAIN --> AGENT_PARSER
    AGENT_MAIN --> AGENT_TOOLS
    AGENT_MAIN --> AGENT_CONFIRM
    AGENT_MAIN --> AGENT_PROMPT
    AGENT_LLM --> LLM

    %% Agent → Service (shared)
    AGENT_TOOLS --> SVC_INST
    AGENT_TOOLS --> SVC_FLAVOR
    AGENT_TOOLS --> SVC_BACKUP

    %% Service → SDK
    SVC_INST --> SDK_CLIENT
    SVC_FLAVOR --> SDK_CLIENT
    SVC_BACKUP --> SDK_CLIENT
    SVC_AUTH --> CFG_STORE
    SVC_WAITER --> SDK_CLIENT

    %% SDK internal
    SDK_CLIENT --> SDK_SIGNER
    SDK_CLIENT --> SDK_RDS
    SDK_CLIENT --> SDK_ERR

    %% SDK → Cloud
    SDK_CLIENT --> CLOUD

    %% Config
    SDK_SIGNER --> CFG_STORE
    CFG_STORE --> CFG_PROFILE

    %% UI (used by CMD layer)
    CMD_INST --> UI_FMT
    CMD_FLAVOR --> UI_TABLE
    CMD_BACKUP --> UI_TABLE
    SVC_WAITER --> UI_SPINNER

    %% Styles - 浅紫色风格
    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef cloudStyle fill:#F0F0F0,stroke:#666,stroke-width:2px,color:#000

    class CLI,CHAT nodeStyle
    class CMD_CONF,CMD_INST,CMD_FLAVOR,CMD_BACKUP,CMD_CHAT nodeStyle
    class AGENT_MAIN,AGENT_LLM,AGENT_PARSER,AGENT_TOOLS,AGENT_CONFIRM,AGENT_PROMPT nodeStyle
    class SVC_INST,SVC_FLAVOR,SVC_BACKUP,SVC_AUTH,SVC_WAITER nodeStyle
    class SDK_CLIENT,SDK_SIGNER,SDK_RDS,SDK_ERR nodeStyle
    class CFG_STORE,CFG_PROFILE nodeStyle
    class UI_TABLE,UI_SPINNER,UI_COLOR,UI_FMT nodeStyle
    class CLOUD,LLM cloudStyle
```

---

## 二、CLI 开发依赖流程（第 1-6 周）

```mermaid
graph TD
    W1_CONF["W1: configure<br/>AK/SK 存储<br/>~/.hwrds/config.yaml"]
    W1_SDK["W1: SDK Client<br/>AK/SK 签名<br/>HTTP 封装"]
    W2_FLAVOR["W2: flavor list<br/>规格查询<br/>🎯 链路验证"]
    W2_FMT["W2: Formatter<br/>table / json 输出"]
    W3_CREATE["W3: instance create<br/>创建实例"]
    W3_WAITER["W3: Waiter<br/>轮询等待就绪<br/>Spinner 动画"]
    W4_LIST["W4: instance list<br/>列出所有实例<br/>彩色状态标识"]
    W4_SHOW["W4: instance show<br/>实例详情<br/>连接信息"]
    W5_DELETE["W5: instance delete<br/>二次确认<br/>输入实例名"]
    W5_RESTART["W5: instance restart<br/>确认 → 重启 → 等待"]
    W6_ERROR["W6: 错误处理<br/>错误码翻译<br/>友好提示 + 建议"]
    W6_POLISH["W6: 体验打磨<br/>自动补全<br/>--help 示例"]
    W6_TEST["W6: 测试覆盖<br/>Service 层 > 70%<br/>CI 自动运行"]

    W1_CONF --> W1_SDK
    W1_SDK --> W2_FLAVOR
    W1_SDK --> W2_FMT
    W2_FLAVOR --> W3_CREATE
    W2_FMT --> W3_CREATE
    W3_CREATE --> W3_WAITER
    W1_SDK --> W4_LIST
    W1_SDK --> W4_SHOW
    W2_FMT --> W4_LIST
    W2_FMT --> W4_SHOW
    W3_CREATE --> W5_DELETE
    W4_SHOW --> W5_DELETE
    W3_WAITER --> W5_RESTART
    W5_DELETE --> W6_ERROR
    W5_RESTART --> W6_ERROR
    W6_ERROR --> W6_POLISH
    W6_POLISH --> W6_TEST

    classDef w1 fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef w2 fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef w3 fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef w4 fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef w5 fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef w6 fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000

    class W1_CONF,W1_SDK w1
    class W2_FLAVOR,W2_FMT w2
    class W3_CREATE,W3_WAITER w3
    class W4_LIST,W4_SHOW w4
    class W5_DELETE,W5_RESTART w5
    class W6_ERROR,W6_POLISH,W6_TEST w6
```

---

## 三、Agent 主控循环流程（第 7-12 周）

```mermaid
graph TD
    START(["用户输入"])
    BUILD["构造 messages<br/>system prompt + tools + 用户消息"]
    CALL_LLM["POST → LLM API<br/>(net/http)"]
    PARSE["解析响应<br/>(parser.go)"]
    CHECK{{"stop_reason?"}}
    EXTRACT["提取 tool_use<br/>name + params"]
    CLASSIFY{{"安全分级?"}}
    EXEC_DIRECT["直接执行<br/>list / show / flavor"]
    CONFIRM_YN["展示参数摘要<br/>Y/N 确认<br/>create / restart"]
    CONFIRM_STRONG["展示警告<br/>输入实例名确认<br/>delete"]
    APPROVED{{"用户确认?"}}
    EXECUTE["调用 Service 层执行<br/>(tools.go → service/)"]
    CANCEL["返回: 用户已取消"]
    FEED["构造 tool_result<br/>喂回 messages"]
    OUTPUT["输出最终回复"]
    MULTI{{"交互模式?"}}
    NEXT_INPUT(["等待下一条输入"])
    DONE(["结束"])
    MAX{{"超过 10 轮?"}}
    MAX_MSG["提示: 请重新描述需求"]

    START --> BUILD
    BUILD --> CALL_LLM
    CALL_LLM --> PARSE
    PARSE --> CHECK

    CHECK -->|"end_turn"| OUTPUT
    CHECK -->|"tool_use"| EXTRACT

    EXTRACT --> CLASSIFY

    CLASSIFY -->|"只读操作"| EXEC_DIRECT
    CLASSIFY -->|"写操作"| CONFIRM_YN
    CLASSIFY -->|"删除操作"| CONFIRM_STRONG

    EXEC_DIRECT --> EXECUTE
    CONFIRM_YN --> APPROVED
    CONFIRM_STRONG --> APPROVED

    APPROVED -->|"Yes"| EXECUTE
    APPROVED -->|"No"| CANCEL

    EXECUTE --> FEED
    CANCEL --> FEED

    FEED --> MAX
    MAX -->|"否"| CALL_LLM
    MAX -->|"是"| MAX_MSG
    MAX_MSG --> DONE

    OUTPUT --> MULTI
    MULTI -->|"交互模式"| NEXT_INPUT
    MULTI -->|"单次模式"| DONE
    NEXT_INPUT --> BUILD

    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef decisionStyle fill:#F0E6FF,stroke:#4B0082,stroke-width:2px,color:#000

    class START,DONE,NEXT_INPUT nodeStyle
    class BUILD,CALL_LLM,PARSE,EXTRACT,EXECUTE,FEED,OUTPUT nodeStyle
    class CHECK,CLASSIFY,APPROVED,MULTI,MAX decisionStyle
    class EXEC_DIRECT,CONFIRM_YN,CONFIRM_STRONG,CANCEL,MAX_MSG nodeStyle
```

---

## 四、Agent 开发依赖流程（第 7-12 周）

```mermaid
graph TD
    W7_LLM["W7: LLM 客户端<br/>net/http POST<br/>JSON 构造/解析<br/>错误重试"]
    W7_PARSER["W7: 响应解析器<br/>提取 stop_reason<br/>提取 tool_use<br/>提取 text"]
    W7_TYPES["W7: 类型定义<br/>Message / ToolCall<br/>ToolResult"]
    W8_TOOLS["W8: Tool 注册表<br/>Service → Tool 映射<br/>参数类型转换"]
    W8_LOOP["W8: 主控循环<br/>tool-calling loop<br/>最大 10 轮限制"]
    W9_CONFIRM["W9: 确认机制<br/>三级安全模型<br/>直接/确认/强确认"]
    W9_PROMPT["W9: 系统提示词<br/>角色 + 约束 + 引导"]
    W10_CHAT["W10: hwrds chat<br/>单次 + 交互模式"]
    W10_DIALOG["W10: 对话式补全<br/>多轮参数收集"]
    W11_BACKUP["W11: 备份管理<br/>CLI + Agent Tool"]
    W11_INTERACTIVE["W11: 交互式创建<br/>--interactive"]
    W12_TEST["W12: Agent 测试<br/>Mock LLM 响应"]
    W12_BUILD["W12: 打包发布<br/>goreleaser<br/>5 平台二进制"]
    W12_DOCS["W12: 文档<br/>README + 使用指南"]

    W7_TYPES --> W7_LLM
    W7_TYPES --> W7_PARSER
    W7_LLM --> W8_LOOP
    W7_PARSER --> W8_LOOP
    W8_TOOLS --> W8_LOOP
    W8_LOOP --> W9_CONFIRM
    W8_LOOP --> W9_PROMPT
    W9_CONFIRM --> W10_CHAT
    W9_PROMPT --> W10_CHAT
    W10_CHAT --> W10_DIALOG
    W10_CHAT --> W11_BACKUP
    W10_CHAT --> W11_INTERACTIVE
    W11_BACKUP --> W12_TEST
    W11_INTERACTIVE --> W12_TEST
    W12_TEST --> W12_BUILD
    W12_BUILD --> W12_DOCS

    classDef w7 fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef w8 fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef w9 fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef w10 fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef w11 fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef w12 fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000

    class W7_LLM,W7_PARSER,W7_TYPES w7
    class W8_TOOLS,W8_LOOP w8
    class W9_CONFIRM,W9_PROMPT w9
    class W10_CHAT,W10_DIALOG w10
    class W11_BACKUP,W11_INTERACTIVE w11
    class W12_TEST,W12_BUILD,W12_DOCS w12
```

---

## 五、完整数据流（一次 Agent 创建实例的全链路）

```mermaid
sequenceDiagram
    actor User as  用户
    participant Chat as cmd/chat.go
    participant Agent as agent/agent.go
    participant LLM as LLM API
    participant Tools as agent/tools.go
    participant Confirm as agent/confirm.go
    participant Service as service/
    participant SDK as sdk/client.go
    participant Cloud as 华为云 API

    User->>Chat: hwrds chat "创建MySQL实例 4核16G"
    Chat->>Agent: Run("创建MySQL实例 4核16G")

    Note over Agent: 循环第 1 轮
    Agent->>LLM: POST messages + tools
    LLM-->>Agent: tool_use: list_flavors {engine: "MySQL"}
    Agent->>Tools: Execute("list_flavors", params)
    Tools->>Service: FlavorService.List("MySQL")
    Service->>SDK: GET /v3/{project}/flavors
    SDK->>Cloud: HTTPS (AK/SK 签名)
    Cloud-->>SDK: 200 OK {flavors: [...]}
    SDK-->>Service: []Flavor
    Service-->>Tools: 格式化结果
    Tools-->>Agent: "找到规格: rds.mysql.m6.large.8 (4C16G)"

    Note over Agent: 循环第 2 轮
    Agent->>LLM: POST messages + tool_result
    LLM-->>Agent: end_turn: "找到匹配规格，还需要VPC和密码"
    Agent-->>Chat: 输出提问
    Chat-->>User: "还需要 VPC、名称和密码"

    User->>Chat: "用prod-vpc，名字prod-mysql，密码MyPass123!"
    Chat->>Agent: Run(用户回复)

    Note over Agent: 循环第 3 轮
    Agent->>LLM: POST messages
    LLM-->>Agent: tool_use: create_instance {完整参数}
    Agent->>Confirm: Check(create_instance, params)
    Confirm-->>User: 展示参数摘要，确认？(Y/n)
    User-->>Confirm: Y
    Confirm-->>Agent: approved = true
    Agent->>Tools: Execute("create_instance", params)
    Tools->>Service: InstanceService.Create(input)
    Service->>SDK: POST /v3/{project}/instances
    SDK->>Cloud: HTTPS
    Cloud-->>SDK: 200 OK {id: "i-abc123"}
    SDK-->>Service: Instance{ID, Status: "Creating"}

    Note over Service: Waiter 轮询
    loop 每 10s 轮询
        Service->>SDK: GET /v3/{project}/instances/i-abc123
        SDK->>Cloud: HTTPS
        Cloud-->>SDK: {status: "Creating"} → {status: "Running"}
    end

    Service-->>Tools: Instance{ID: "i-abc123", Status: "Running"}
    Tools-->>Agent: "创建成功，ID: i-abc123"

    Note over Agent: 循环第 4 轮
    Agent->>LLM: POST messages + tool_result
    LLM-->>Agent: end_turn: 最终回复
    Agent-->>Chat: 格式化输出
    Chat-->>User: 实例已创建！连接: mysql -h 192.168.0.55 -P 3306
```

---

## 七、技术栈清单

| 用途      | 库 / 工具               | 说明                      |
| --------- | ----------------------- | ------------------------- |
| CLI 框架  | spf13/cobra             | kubectl, docker, gh 都用  |
| 配置管理  | spf13/viper             | 支持 YAML/ENV/flag        |
| 交互式 UI | AlecAivazis/survey/v2   | 终端交互选择              |
| 表格输出  | olekukonez/tablewriter  | 终端表格                  |
| 彩色输出  | fatih/color             | 状态彩色标识              |
| Spinner   | briandowns/spinner      | 加载动画                  |
| HTTP      | net/http（标准库）      | 调华为云 API + LLM API    |
| JSON      | encoding/json（标准库） | 零依赖                    |
| 测试      | stretchr/testify        | 断言 + mock               |
| 发布      | goreleaser              | 交叉编译 + GitHub Release |

---

## 八、开发计划

### 总体时间线

| 周次   | 阶段       | 核心交付物                         | 里程碑         |
| ------ | ---------- | ---------------------------------- | -------------- |
| W1-2   | CLI 基座   | configure + SDK 签名 + flavor list | 链路打通       |
| W3-4   | CLI 核心   | instance create / list / show      | 创建和查询可用 |
| W5-6   | CLI 完善   | delete / restart + 错误处理 + 测试 | CLI 生产级     |
| W7-8   | Agent 基础 | LLM 客户端 + Tool 注册 + 主循环    | Agent 跑通     |
| W9-10  | Agent 完善 | 确认机制 + 提示词 + chat 命令      | Agent 可用     |
| W11-12 | 交付       | 备份 + 测试 + 打包 + 文档          | 产品发布       |

### 开发方法论

项目采用 **SDD + TDD + CI/CD** 的开发模式：

- **SDD（Spec Driven Development）**：每个功能开发前先写规格说明
- **TDD（Test Driven Development）**：先写测试再写实现，Service 层严格驱动
- **CI/CD**：GitHub Actions 自动化 Lint + 测试 + 构建

---

## 九、总结

HWRDS 项目的核心价值在于：在对标 AWS 和阿里云全部基础 CLI 能力的同时，通过 AI Agent 智能交互层实现差异化竞争。

**技术选型**：选择 Go 语言，获得单二进制分发、极快启动、交叉编译等 CLI 场景的天然优势，同时通过自定义 Agent 实现避免对第三方框架的依赖。

**架构设计**：遵循"最简架构"原则，采用分层设计，CLI 和 Agent 共享 Service 层，避免业务逻辑重复。

**开发方法**：采用 SDD + TDD + CI/CD 的成熟方法论，确保 12 周内交付高质量产品。

> **核心理念：** 先构建能工作的最简单系统，然后让它随需求自然生长。—— Anthropic, Building Effective AI Agents
