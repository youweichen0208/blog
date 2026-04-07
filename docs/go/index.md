# Go 语言

## 如何安装 Go

1. 访问 [https://go.dev/dl/](https://go.dev/dl/)
2. 根据系统下载对应安装包：
   - **Mac**：下载 `.pkg` 文件（Apple Silicon 选 `arm64`，Intel 选 `amd64`），双击安装
   - **Windows**：下载 `.msi` 文件，双击运行安装向导，默认安装到 `C:\Program Files\Go`
3. 安装完成后打开终端验证：

```bash
go version
```

### 配置环境变量

安装完成后，配置工作目录（`GOPATH`）和代理（国内加速）：

```bash
# 编辑 shell 配置文件（zsh 用户）
echo 'export GOPATH=$HOME/go' >> ~/.zshrc
echo 'export PATH=$PATH:$GOPATH/bin' >> ~/.zshrc
echo 'export GOPROXY=https://goproxy.cn,direct' >> ~/.zshrc

# 使配置生效
source ~/.zshrc

# 验证
go env GOPATH
go env GOPROXY
```

> **说明**：`GOPROXY=https://goproxy.cn` 是国内镜像，下载依赖速度更快。

### 安装 VS Code Go 插件（可选）

如果使用 VS Code 开发：

1. 安装 [Go 插件](https://marketplace.visualstudio.com/items?itemName=golang.Go)
2. 打开命令面板（`Cmd+Shift+P`），执行 `Go: Install/Update Tools`，全选安装

---

## 简介

Go（又称 Golang）是由 Google 开发的一种静态类型、编译型的开源编程语言。它由 Robert Griesemer、Rob Pike 和 Ken Thompson 在 2007 年开始设计，并于 2009 年正式发布。

### 设计理念

Go 语言的设计目标是创建一种简单、高效、可靠的编程语言，特别适合构建大规模的软件系统。它结合了静态类型语言的安全性和效率，以及动态语言的易用性和开发速度。

### 核心特性

- **简洁的语法**：Go 的语法简洁明了，易于学习和阅读
- **高效的编译**：编译速度快，生成的二进制文件执行效率高
- **并发编程**：内置的 goroutine 和 channel 使并发编程变得简单
- **垃圾回收**：自动内存管理，降低内存泄漏风险
- **丰富的标准库**：提供了强大的标准库，涵盖网络、加密、文件处理等
- **跨平台支持**：支持多种操作系统和架构

### 应用场景

Go 语言广泛应用于：

- **云原生应用**：Docker、Kubernetes 等容器技术
- **微服务架构**：API 服务、分布式系统
- **网络编程**：高性能的 Web 服务器、代理服务器
- **DevOps 工具**：命令行工具、运维自动化
- **数据处理**：大数据处理、实时数据分析

### 为什么选择 Go？

1. **性能优异**：接近 C/C++ 的执行效率
2. **开发效率高**：简洁的语法和快速的编译
3. **并发能力强**：轻松处理高并发场景
4. **部署简单**：单一可执行文件，无需依赖
5. **生态成熟**：丰富的第三方库和活跃的社区

## Go 语言快速入门

1. Hello World & 基本结构
   Go 像 Java 一样有`main`包和`main`函数作为入口，但语法简洁得多：

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

- `fmt` 是 Go 的标准库之一，全称是 format，负责格式化输入输出。

对比一下熟悉的：Java 需要 class 包裹，Python 什么都不用。Go 在中间--需要`package`和`func main()`，但没有 class。

2. 变量声明
   Go 是静态类型语言（像 Java），但有类型推断（像 Python 的感觉）：

```go
// 显式声明（类似 Java）
var name string = "Alice"
var age int = 25

// 短声明
name := "Alice" // 等价于 var name string = "Alice"
age := 25 // 等价于 var age int = 25

// 常量
const Pi = 3.14
```

关键区别：Go 的类型写在变量名后面，和 Java/Python 都不一样。

3. 基本类型

```go
//数字
var i int = 42
var f float64 = 3.14

// 字符串（和 Java 一样用双引号，不能用单引号）
var s string = "hello"

// 布尔
var b bool = true
```

4. 函数

```go
// 基本函数
func add(a int, b int) int {
    return a + b
}

// Go 的杀手特性：多返回值！
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, fmt.Errorf("不能除以零")
    }
    return a / b, nil
}

// 调用时
result, err := divide(10, 3)
if err != nil {
    fmt.Println("出错了:", err)
}
```

这是 Go 最核心的模式——返回值 + error，取代了 Java 的 try/catch 和 Python 的异常。

5. 控制流

```go
// if（不需要括号，这点像 Python）
if age >= 18 {
    fmt.Println("成年")
} else {
    fmt.Println("未成年")
}

// for 是 Go 里唯一的循环！没有 while
for i := 0; i < 10; i++ {
    fmt.Println(i)
}

// 当 while 用
for age < 100 {
    age++
}

// 当 Python 的 while True 用
for {
    break // 没有条件就是无限循环
}

// switch（比 Java 的好用，不需要 break）
switch day {
case "Monday":
    fmt.Println("周一")
case "Friday":
    fmt.Println("周五！")
default:
    fmt.Println("普通的一天")
}
```

6. 数据结构

```go
// 数组（固定长度，很少直接用）
var arr [3]int = [3]int{1, 2, 3}

// Slice（动态数组，最常用，类似 Python 的 list）
nums := []int{1, 2, 3}
nums = append(nums, 4)        // 类似 Python 的 append
slice := nums[1:3]            // 切片语法和 Python 一样！

// Map（类似 Python 的 dict / Java 的 HashMap）
scores := map[string]int{
    "Alice": 95,
    "Bob":   87,
}
scores["Charlie"] = 92

// 检查 key 是否存在
val, exists := scores["Dave"]
if !exists {
    fmt.Println("Dave 不在里面")
}
```

7. 结构体（代替 class）

Go 没有 class，用 struct + 方法来实现面向对象：

```go
// 定义结构体（类似 Java 的 class，Python 的 dataclass）
type User struct {
    Name string
    Age  int
}

// 给结构体添加方法（注意前面的接收者）
func (u User) Greet() string {
    return fmt.Sprintf("Hi, I'm %s, %d years old", u.Name, u.Age)
}

// 需要修改结构体时，用指针接收者
func (u *User) Birthday() {
    u.Age++
}

// 使用
user := User{Name: "Alice", Age: 25}
fmt.Println(user.Greet())
user.Birthday()
```

大写开头 = 公开（exported），小写开头 = 私有。没有 public/private 关键字。

8. 接口（隐式实现）
   这是 Go 和 Java 最大区别--不需要写`implements`

```go
type Speaker interface {
    Speak() string
}

type Dog struct{ Name string }
type Cat struct{ Name string }

func (d Dog) Speak() string { return d.Name + ": 汪汪!" }
func (c Cat) Speak() string { return c.Name + ": 喵~" }

// Dog 和 Cat 自动实现了 Speaker 接口，不需要声明
func MakeNoise(s Speaker) {
    fmt.Println(s.Speak())
}
```

只要你的类型有接口要求的所有方法，就自动满足接口。这叫"鸭子类型"——和 Python 的思路类似，但有编译时检查。

9. Goroutine & Channel（Go 的并发，核心卖点）

```go
// 启动一个 goroutine（比 Java 的 Thread 轻量得多）
go func() {
    fmt.Println("我在另一个 goroutine 里运行")
}()

// Channel：goroutine 之间通信
ch := make(chan string)

go func() {
    ch <- "hello from goroutine"  // 发送
}()

msg := <-ch  // 接收（会阻塞等待）
fmt.Println(msg)
```

类比：goroutine 像超轻量的线程，channel 像线程安全的队列。

10. 错误处理模式
    Go 没有 try/catch，错误处理靠约定

```go
file, err := os.Open("test.txt")
if err != nil {
    log.Fatal(err)  // 处理错误
}
defer file.Close()  // defer 确保函数结束时关闭文件（类似 Python 的 with）
```

你会写很多 if err != nil，这是 Go 的风格，习惯就好。

---

## 包管理和工具链

### Go Modules 是什么？

Go Modules 是 Go 官方的依赖管理系统，从 **Go 1.11** 引入，**Go 1.16 起默认开启**。

**是不是所有项目都需要 `go mod`？**

| 场景                          | 需要 go mod？  |
| ----------------------------- | -------------- |
| 单文件脚本，只用标准库        | 不需要         |
| 有第三方依赖（如 gin、cobra） | **需要**       |
| 多文件项目                    | **需要**       |
| 现代 Go 项目（1.16+）         | **几乎都需要** |

简单说：只要你的项目超过一个文件，或者用了任何第三方库，就应该用 `go mod`。

---

### 初始化项目

```bash
mkdir myproject && cd myproject
go mod init github.com/yourname/myproject
```

执行后会生成 `go.mod` 文件：

```
module github.com/yourname/myproject

go 1.22
```

> `github.com/yourname/myproject` 是模块名，如果项目不发布到 GitHub，写 `myproject` 也行。

---

### 核心文件说明

**`go.mod`** — 依赖声明文件（类似 npm 的 `package.json`）

```
module github.com/yourname/myproject

go 1.22

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/spf13/cobra v1.8.0
)
```

**`go.sum`** — 依赖版本锁定文件（类似 `package-lock.json`），**不要手动编辑**，由 Go 自动维护。

---

### 常用命令

```bash
# 添加依赖（会自动更新 go.mod 和 go.sum）
go get github.com/gin-gonic/gin@latest

# 添加指定版本
go get github.com/gin-gonic/gin@v1.9.1

# 清理未使用的依赖 / 补全缺失的依赖
go mod tidy

# 下载所有依赖到本地缓存
go mod download

# 查看依赖树
go mod graph

# 将依赖复制到项目的 vendor 目录（离线场景）
go mod vendor
```

---

### 典型工作流

```bash
# 1. 新建项目
mkdir myapp && cd myapp
go mod init myapp

# 2. 写代码，import 了新的第三方包后，执行：
go mod tidy        # 自动添加缺失依赖，删除未使用依赖

# 3. 编译运行
go run main.go
go build -o myapp

# 4. 升级某个依赖
go get github.com/gin-gonic/gin@latest

# 5. 查看当前所有依赖
go list -m all
```

---

### 常用 Go 命令

```bash
# 运行代码（开发时）
go run main.go

# 编译成二进制
go build -o myapp

# 格式化代码（Go 的强制规范）
go fmt ./...

# 静态检查（找潜在 bug）
go vet ./...

# 运行测试
go test ./...

# 运行测试并显示覆盖率
go test -cover ./...

# 查看依赖树
go mod graph
```

### 项目结构最佳实践

```
myproject/
├── main.go              # 入口文件
├── go.mod               # 依赖管理
├── go.sum               # 依赖版本锁定
├── cmd/                 # 命令行入口（多命令项目）
│   └── server/
│       └── main.go
├── internal/            # 私有代码（不能被外部 import）
│   ├── handler/         # HTTP 处理器
│   ├── service/         # 业务逻辑
│   └── repository/      # 数据访问
├── pkg/                 # 公开库（可以被外部 import）
│   └── utils/
└── tests/               # 测试文件
```

---

## 常用标准库实战

### 1. HTTP 服务器（`net/http`）

最简单的 Web 服务器：

```go
package main

import (
    "fmt"
    "net/http"
)

func helloHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, %s!", r.URL.Path[1:])
}

func main() {
    http.HandleFunc("/", helloHandler)
    fmt.Println("Server running at http://localhost:8080")
    http.ListenAndServe(":8080", nil)
}
```

访问 `http://localhost:8080/World` → 返回 "Hello, World!"

### 2. JSON 处理（`encoding/json`）

```go
package main

import (
    "encoding/json"
    "fmt"
)

type User struct {
    Name  string `json:"name"`
    Email string `json:"email"`
    Age   int    `json:"age"`
}

func main() {
    // 结构体 → JSON
    user := User{Name: "Alice", Email: "alice@example.com", Age: 25}
    jsonData, _ := json.Marshal(user)
    fmt.Println(string(jsonData))
    // {"name":"Alice","email":"alice@example.com","age":25}

    // JSON → 结构体
    jsonStr := `{"name":"Bob","email":"bob@example.com","age":30}`
    var newUser User
    json.Unmarshal([]byte(jsonStr), &newUser)
    fmt.Printf("%+v\n", newUser)
    // {Name:Bob Email:bob@example.com Age:30}
}
```

### 3. 文件操作（`os`/`io`）

```go
package main

import (
    "fmt"
    "os"
)

func main() {
    // 写文件
    content := []byte("Hello, Go!\n")
    os.WriteFile("test.txt", content, 0644)

    // 读文件
    data, err := os.ReadFile("test.txt")
    if err != nil {
        panic(err)
    }
    fmt.Print(string(data))

    // 删除文件
    os.Remove("test.txt")
}
```

---

## 实战案例：构建一个简单的 RESTful API

让我们用 Go 标准库构建一个待办事项（Todo）API，涵盖 CRUD 操作。

### 完整代码

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "strconv"
    "sync"
)

// Todo 待办事项结构
type Todo struct {
    ID        int    `json:"id"`
    Title     string `json:"title"`
    Completed bool   `json:"completed"`
}

// 内存存储（实际项目用数据库）
var (
    todos   = make(map[int]Todo)
    nextID  = 1
    todosMu sync.RWMutex
)

func main() {
    // 路由
    http.HandleFunc("/todos", todosHandler)
    http.HandleFunc("/todos/", todoHandler) // 带 ID 的路由

    fmt.Println("🚀 Server running at http://localhost:8080")
    fmt.Println("📝 Try: curl http://localhost:8080/todos")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

// GET /todos - 列出所有
// POST /todos - 创建新 todo
func todosHandler(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case "GET":
        listTodos(w, r)
    case "POST":
        createTodo(w, r)
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}

// GET /todos/{id} - 获取单个
// PUT /todos/{id} - 更新
// DELETE /todos/{id} - 删除
func todoHandler(w http.ResponseWriter, r *http.Request) {
    // 从 URL 提取 ID：/todos/1 → 1
    idStr := r.URL.Path[len("/todos/"):]
    id, err := strconv.Atoi(idStr)
    if err != nil {
        http.Error(w, "Invalid ID", http.StatusBadRequest)
        return
    }

    switch r.Method {
    case "GET":
        getTodo(w, r, id)
    case "PUT":
        updateTodo(w, r, id)
    case "DELETE":
        deleteTodo(w, r, id)
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}

func listTodos(w http.ResponseWriter, r *http.Request) {
    todosMu.RLock()
    defer todosMu.RUnlock()

    list := make([]Todo, 0, len(todos))
    for _, todo := range todos {
        list = append(list, todo)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(list)
}

func createTodo(w http.ResponseWriter, r *http.Request) {
    var todo Todo
    if err := json.NewDecoder(r.Body).Decode(&todo); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    todosMu.Lock()
    todo.ID = nextID
    nextID++
    todos[todo.ID] = todo
    todosMu.Unlock()

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(todo)
}

func getTodo(w http.ResponseWriter, r *http.Request, id int) {
    todosMu.RLock()
    todo, exists := todos[id]
    todosMu.RUnlock()

    if !exists {
        http.Error(w, "Todo not found", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(todo)
}

func updateTodo(w http.ResponseWriter, r *http.Request, id int) {
    todosMu.Lock()
    defer todosMu.Unlock()

    if _, exists := todos[id]; !exists {
        http.Error(w, "Todo not found", http.StatusNotFound)
        return
    }

    var updated Todo
    if err := json.NewDecoder(r.Body).Decode(&updated); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    updated.ID = id
    todos[id] = updated

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(updated)
}

func deleteTodo(w http.ResponseWriter, r *http.Request, id int) {
    todosMu.Lock()
    defer todosMu.Unlock()

    if _, exists := todos[id]; !exists {
        http.Error(w, "Todo not found", http.StatusNotFound)
        return
    }

    delete(todos, id)
    w.WriteHeader(http.StatusNoContent)
}
```

### 测试 API

```bash
# 1. 创建 todo
curl -X POST http://localhost:8080/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"学习 Go 语言","completed":false}'

# 返回: {"id":1,"title":"学习 Go 语言","completed":false}

# 2. 再创建一个
curl -X POST http://localhost:8080/todos \
  -d '{"title":"写 RESTful API","completed":true}'

# 3. 列出所有
curl http://localhost:8080/todos

# 4. 获取单个
curl http://localhost:8080/todos/1

# 5. 更新
curl -X PUT http://localhost:8080/todos/1 \
  -d '{"title":"学习 Go 语言","completed":true}'

# 6. 删除
curl -X DELETE http://localhost:8080/todos/1
```

### 代码解析

**关键点：**

1. **并发安全**：使用 `sync.RWMutex` 保护共享的 `todos` map
2. **路由**：通过解析 `r.URL.Path` 实现简单路由（生产环境建议用 `gin`/`chi` 框架）
3. **JSON 处理**：`json.NewEncoder(w).Encode()` 直接写入 HTTP 响应
4. **错误处理**：每个操作都检查错误并返回合适的 HTTP 状态码

**改进方向：**

- 加数据库（PostgreSQL + `pgx`）
- 加参数验证（`go-playground/validator`）
- 加中间件（日志、CORS、认证）
- 用框架重构（Gin/Echo/Fiber）

---

## 下一步学习路径

### 推荐资源

**官方文档**

- [Go 官网](https://go.dev/)：官方教程和文档
- [Go by Example](https://gobyexample.com/)：通过示例学习 Go
- [Effective Go](https://go.dev/doc/effective_go)：Go 编程最佳实践

**书籍推荐**

- 《Go 语言圣经》（The Go Programming Language）
- 《Go 语言实战》（Go in Action）
- 《Go Web 编程》

**在线教程**

- [Tour of Go](https://tour.golang.org/)：交互式入门教程
- [Go 语言中文网](https://studygolang.com/)

### 进阶主题

掌握基础后，可以深入以下方向：

**语言进阶**

- Context 上下文管理
- 反射（reflection）
- 泛型（Go 1.18+）
- 内存管理和 GC 优化

**并发编程**

- Channel 高级模式
- Select 多路复用
- sync.WaitGroup / sync.Pool
- 并发安全的数据结构

**Web 开发**

- Gin/Echo/Fiber 框架
- gRPC 微服务
- WebSocket 实时通信
- GraphQL API

**数据库**

- database/sql 标准库
- GORM（ORM 框架）
- Redis 缓存（go-redis）
- MongoDB（mongo-go-driver）

**测试与调试**

- 单元测试（testing 包）
- 基准测试（benchmarking）
- 性能分析（pprof）
- Mock 测试（gomock）

**DevOps**

- Docker 容器化
- Kubernetes Operator 开发
- CLI 工具（Cobra）
- 监控和日志（Prometheus/Zap）

### 实战项目建议

从简单到复杂：

1. **命令行工具**：文件处理、系统监控、批处理脚本
2. **RESTful API**：博客后端、用户管理系统
3. **微服务**：电商系统、支付网关
4. **实时应用**：聊天室、消息推送服务
5. **分布式系统**：任务调度器、分布式缓存

---

深入探讨 Go 语言的各个方面，从基础语法到高级特性，帮助你成为 Go 开发专家。
