---
lang: zh-CN
title: Go 结构体（Struct）完全教程
description: 从结构体定义、指针接收者、嵌套组合到标签和零值设计，整理 Go 数据建模方式。
date: 2026-05-03
tags:
  - Go
  - Struct
---

# Go 结构体（Struct）完全教程

## 1. 基本定义与使用

结构体是 Go 中组织数据的核心方式，相当于其他语言的 class（但没有继承）。

```go
type User struct {
    Name  string
    Age   int
    Email string
}

// 创建实例
u1 := User{"Alice", 25, "alice@example.com"}        // 按顺序（不推荐）
u2 := User{Name: "Bob", Age: 30}                     // 按字段名（推荐）
u3 := User{}                                          // 零值：{"", 0, ""}
var u4 User                                            // 同上

// 访问字段
fmt.Println(u2.Name)  // "Bob"
u2.Age = 31           // 修改字段
```

---

## 2. 结构体指针

```go
// 创建指针
u := &User{Name: "Alice", Age: 25}    // u 是 *User
u2 := new(User)                        // u2 也是 *User，所有字段为零值

// Go 自动解引用，不需要写 (*u).Name
fmt.Println(u.Name)   // "Alice"（不用写 (*u).Name）
u.Age = 26            // 直接通过指针修改
```

### 什么时候用指针？

```go
// 结构体较大时，传指针避免拷贝
func updateUser(u *User) {
    u.Age++
}

// 需要修改原值时
func (u *User) Birthday() {
    u.Age++
}

// 不需要修改时，可以传值
func (u User) FullInfo() string {
    return fmt.Sprintf("%s (%d)", u.Name, u.Age)
}
```

---

## 3. 构造函数（惯用模式）

Go 没有 class 构造器，惯例是写一个 `NewXxx` 函数。

```go
type Server struct {
    Host string
    Port int
}

// 构造函数（返回指针）
func NewServer(host string, port int) *Server {
    return &Server{
        Host: host,
        Port: port,
    }
}

// 带默认值的构造函数
func NewDefaultServer() *Server {
    return &Server{
        Host: "localhost",
        Port: 8080,
    }
}

s := NewServer("0.0.0.0", 9090)
```

---

## 4. 方法

```go
type Rect struct {
    Width, Height float64
}

// 值接收者
func (r Rect) Area() float64 {
    return r.Width * r.Height
}

// 指针接收者
func (r *Rect) Scale(factor float64) {
    r.Width *= factor
    r.Height *= factor
}

// 实现 fmt.Stringer 接口（类似 Java 的 toString）
func (r Rect) String() string {
    return fmt.Sprintf("Rect(%g x %g)", r.Width, r.Height)
}

r := Rect{10, 5}
fmt.Println(r.Area())  // 50
r.Scale(2)
fmt.Println(r)         // Rect(20 x 10)
```

---

## 5. 嵌入（Embedding）—— 组合代替继承

Go 没有继承，通过嵌入实现代码复用。

```go
type Animal struct {
    Name string
    Age  int
}

func (a Animal) Speak() string {
    return fmt.Sprintf("我是 %s", a.Name)
}

type Dog struct {
    Animal       // 匿名嵌入（不是继承，是组合）
    Breed string
}

d := Dog{
    Animal: Animal{Name: "旺财", Age: 3},
    Breed:  "柴犬",
}

// 直接访问嵌入字段的方法和属性
fmt.Println(d.Name)     // "旺财"（提升到外层）
fmt.Println(d.Speak())  // "我是 旺财"
fmt.Println(d.Breed)    // "柴犬"

// 也可以显式访问
fmt.Println(d.Animal.Name) // "旺财"
```

### 方法覆盖

```go
// Dog 可以定义自己的 Speak 方法
func (d Dog) Speak() string {
    return fmt.Sprintf("汪汪！我是 %s", d.Name)
}

d.Speak()           // "汪汪！我是 旺财"（调用 Dog 的方法）
d.Animal.Speak()    // "我是 旺财"（显式调用 Animal 的方法）
```

### 多重嵌入

```go
type Logger struct{}
func (l Logger) Log(msg string) { fmt.Println("[LOG]", msg) }

type Validator struct{}
func (v Validator) Validate() bool { return true }

type Service struct {
    Logger      // 嵌入日志能力
    Validator   // 嵌入校验能力
    Name string
}

s := Service{Name: "UserService"}
s.Log("started")       // 使用 Logger 的方法
s.Validate()            // 使用 Validator 的方法
```

---

## 6. 标签（Tag）

结构体标签用于元数据，最常见的是 JSON 序列化。

```go
type User struct {
    Name     string `json:"name"`
    Age      int    `json:"age"`
    Email    string `json:"email,omitempty"`  // 为空时不输出
    Password string `json:"-"`                // 永远不输出
    IsAdmin  bool   `json:"is_admin"`
}

u := User{Name: "Alice", Age: 25}
data, _ := json.Marshal(u)
fmt.Println(string(data))
// {"name":"Alice","age":25,"is_admin":false}
// 注意：Email 为空所以被 omitempty 省略了，Password 被 "-" 排除了

// JSON → 结构体
var u2 User
json.Unmarshal([]byte(`{"name":"Bob","age":30}`), &u2)
```

### 常见的 tag 用途

```go
type Config struct {
    Host string `json:"host" yaml:"host" env:"APP_HOST" validate:"required"`
    Port int    `json:"port" yaml:"port" env:"APP_PORT" validate:"min=1,max=65535"`
}
```

---

## 7. 匿名结构体

不需要命名就可以直接使用，适合临时数据。

```go
// 直接声明和初始化
point := struct {
    X, Y int
}{10, 20}

// 常见用法：测试中的表格驱动
tests := []struct {
    input    string
    expected int
}{
    {"hello", 5},
    {"", 0},
    {"go", 2},
}

for _, tt := range tests {
    if got := len(tt.input); got != tt.expected {
        t.Errorf("len(%q) = %d, want %d", tt.input, got, tt.expected)
    }
}
```

---

## 8. 结构体比较

```go
type Point struct {
    X, Y int
}

p1 := Point{1, 2}
p2 := Point{1, 2}
fmt.Println(p1 == p2) // true（所有字段相等）

// 注意：包含 slice、map、function 字段的结构体不能用 == 比较
type Data struct {
    Values []int  // slice 不可比较
}
// d1 == d2  // ❌ 编译错误
// 需要用 reflect.DeepEqual(d1, d2)
```

---

## 9. 空结构体 `struct{}`

空结构体不占内存（大小为 0），常用于特定场景。

```go
// 用作 Set（只关心 key，不关心 value）
set := map[string]struct{}{}
set["apple"] = struct{}{}
set["banana"] = struct{}{}
if _, ok := set["apple"]; ok {
    fmt.Println("存在")
}

// 用作信号 channel（只传信号，不传数据）
done := make(chan struct{})
go func() {
    // 做一些工作...
    close(done)  // 发送完成信号
}()
<-done  // 等待完成
```

---

## 10. 函数选项模式（Functional Options）

当构造函数参数很多时的惯用模式。

```go
type Server struct {
    host    string
    port    int
    timeout time.Duration
    maxConn int
}

type Option func(*Server)

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func WithTimeout(t time.Duration) Option {
    return func(s *Server) { s.timeout = t }
}

func WithMaxConn(n int) Option {
    return func(s *Server) { s.maxConn = n }
}

func NewServer(host string, opts ...Option) *Server {
    s := &Server{
        host:    host,
        port:    8080,               // 默认值
        timeout: 30 * time.Second,   // 默认值
        maxConn: 100,                // 默认值
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// 使用：清晰且灵活
s := NewServer("localhost",
    WithPort(9090),
    WithTimeout(60*time.Second),
)
```

---

## 11. 最佳实践

- 结构体名和导出字段用大写驼峰 `UserProfile`，私有字段用小写 `createdAt`。
- 小结构体（2-3 个字段）传值，大结构体传指针。
- 用 `NewXxx` 函数做构造器，而不是直接暴露结构体让外部填字段。
- 优先组合（嵌入）而不是模拟继承。
- JSON tag 用 `snake_case` 是常见约定。
- 字段较多时用函数选项模式，比一长串参数更可读。
