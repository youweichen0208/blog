---
lang: zh-CN
title: Go 接口（Interface）完全教程
description: 理解 Go 的隐式接口、空接口、类型断言、接口组合和工程边界设计。
date: 2026-05-02
tags:
  - Go
  - Interface
---

# Go 接口（Interface）完全教程

## 1. 基本概念

Go 的接口是**隐式实现**的——不需要声明 `implements`，只要一个类型实现了接口定义的所有方法，它就自动满足该接口。

```go
// 定义接口
type Speaker interface {
    Speak() string
}

// Dog 实现了 Speaker（隐式，不需要声明）
type Dog struct{ Name string }
func (d Dog) Speak() string { return "汪汪！" }

// Cat 也实现了 Speaker
type Cat struct{ Name string }
func (c Cat) Speak() string { return "喵喵！" }

// 使用接口
func greet(s Speaker) {
    fmt.Println(s.Speak())
}

greet(Dog{Name: "旺财"})  // 汪汪！
greet(Cat{Name: "咪咪"})  // 喵喵！
```

对比 Java：

```java
// Java 必须显式声明
class Dog implements Speaker { ... }
```

Go 不需要，实现了方法就行。这被称为"鸭子类型"——如果它走起来像鸭子、叫起来像鸭子，那它就是鸭子。

---

## 2. 接口的定义

```go
// 单方法接口（Go 最推荐的风格）
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

// 多方法接口
type ReadWriter interface {
    Read(p []byte) (n int, err error)
    Write(p []byte) (n int, err error)
}

// 接口组合（推荐方式）
type ReadWriter interface {
    Reader
    Writer
}

// 更复杂的组合
type ReadWriteCloser interface {
    Reader
    Writer
    Close() error
}
```

---

## 3. 标准库中的常见接口

Go 标准库定义了很多小接口，学会它们就能融入整个生态。

```go
// fmt.Stringer —— 类似 Java 的 toString()
type Stringer interface {
    String() string
}

type User struct{ Name string; Age int }
func (u User) String() string {
    return fmt.Sprintf("%s (%d岁)", u.Name, u.Age)
}
fmt.Println(User{"Alice", 25})  // "Alice (25岁)"

// error —— Go 的错误就是一个接口
type error interface {
    Error() string
}

// io.Reader / io.Writer —— 最重要的接口
type Reader interface {
    Read(p []byte) (n int, err error)
}
// 文件、网络连接、HTTP body、压缩流……都实现了 io.Reader

// sort.Interface —— 排序接口
type Interface interface {
    Len() int
    Less(i, j int) bool
    Swap(i, j int)
}
```

---

## 4. 空接口 `interface{}` / `any`

空接口没有方法，所以**任何类型都满足空接口**，类似其他语言的 `Object`。

```go
// Go 1.18 之前
var anything interface{}

// Go 1.18+ 可以用 any（它就是 interface{} 的别名）
var anything any

anything = 42
anything = "hello"
anything = []int{1, 2, 3}
anything = User{Name: "Alice"}

// 常见用途：接受任意类型的函数
func printAnything(v any) {
    fmt.Println(v)
}

// JSON 解析到 map
var data map[string]any
json.Unmarshal(jsonBytes, &data)
```

---

## 5. 类型断言（Type Assertion）

从接口值中取出具体类型。

```go
var s Speaker = Dog{Name: "旺财"}

// 基本断言（如果类型不对会 panic）
d := s.(Dog)
fmt.Println(d.Name)  // "旺财"

// 安全断言（推荐）
d, ok := s.(Dog)
if ok {
    fmt.Println(d.Name)
} else {
    fmt.Println("不是 Dog 类型")
}

// 对 any 类型也适用
var v any = "hello"
str, ok := v.(string)  // ok = true, str = "hello"
num, ok := v.(int)     // ok = false, num = 0
```

---

## 6. 类型选择（Type Switch）

处理接口值可能是多种类型的情况。

```go
func describe(v any) string {
    switch val := v.(type) {
    case int:
        return fmt.Sprintf("整数: %d", val)
    case string:
        return fmt.Sprintf("字符串: %s", val)
    case bool:
        return fmt.Sprintf("布尔: %t", val)
    case []int:
        return fmt.Sprintf("切片: %v", val)
    case nil:
        return "nil"
    default:
        return fmt.Sprintf("未知类型: %T", val)
    }
}

describe(42)        // "整数: 42"
describe("hello")   // "字符串: hello"
describe(true)      // "布尔: true"
```

---

## 7. 接口的零值是 `nil`

```go
var s Speaker  // nil
fmt.Println(s) // <nil>

// 调用 nil 接口的方法会 panic
// s.Speak()  // ❌ panic: nil pointer dereference

// 但注意这个陷阱
var d *Dog = nil
var s Speaker = d

fmt.Println(s == nil)  // false！
// s 不是 nil，它是一个"持有 nil 指针的接口值"
// 接口值 = (类型, 值)，这里是 (*Dog, nil)，类型不为空
```

### nil 接口陷阱详解

```go
// 这是 Go 中最常见的坑之一
func getUser() *User {
    return nilW
}

func process() error {
    u := getUser()
    if u == nil {
        return u  // ❌ 返回的 error 不是 nil！
    }
    return nil    //  要显式返回 nil
}

err := process()
fmt.Println(err == nil) // false（即使 *User 值是 nil）
```

---

## 8. 接口组合实战

```go
// 小接口定义
type Saver interface {
    Save(data []byte) error
}

type Loader interface {
    Load(key string) ([]byte, error)
}

type Deleter interface {
    Delete(key string) error
}

// 组合成大接口
type Storage interface {
    Saver
    Loader
    Deleter
}

// 实现
type FileStorage struct{ dir string }
func (fs *FileStorage) Save(data []byte) error           { /* ... */ return nil }
func (fs *FileStorage) Load(key string) ([]byte, error)  { /* ... */ return nil, nil }
func (fs *FileStorage) Delete(key string) error           { /* ... */ return nil }
// FileStorage 自动满足 Saver、Loader、Deleter、Storage 四个接口

// 函数只依赖需要的最小接口
func backup(s Saver) error {
    return s.Save([]byte("backup data"))
}

func restore(l Loader) ([]byte, error) {
    return l.Load("backup")
}

// FileStorage 可以传给任何一个
fs := &FileStorage{dir: "/data"}
backup(fs)   //  只用到 Saver
restore(fs)  //  只用到 Loader
```

---

## 9. 接口与多态

```go
type Shape interface {
    Area() float64
    Perimeter() float64
}

type Circle struct{ Radius float64 }
func (c Circle) Area() float64      { return math.Pi * c.Radius * c.Radius }
func (c Circle) Perimeter() float64 { return 2 * math.Pi * c.Radius }

type Rect struct{ Width, Height float64 }
func (r Rect) Area() float64      { return r.Width * r.Height }
func (r Rect) Perimeter() float64 { return 2 * (r.Width + r.Height) }

// 多态：统一处理不同形状
func totalArea(shapes []Shape) float64 {
    total := 0.0
    for _, s := range shapes {
        total += s.Area()
    }
    return total
}

shapes := []Shape{
    Circle{Radius: 5},
    Rect{Width: 10, Height: 3},
    Circle{Radius: 2},
}
fmt.Println(totalArea(shapes))  // 所有形状面积之和
```

---

## 10. 接口与测试（Mock）

接口最强大的用途之一是方便测试。

```go
// 定义接口
type EmailSender interface {
    Send(to, subject, body string) error
}

// 真实实现
type SMTPSender struct{ host string }
func (s *SMTPSender) Send(to, subject, body string) error {
    // 真正发送邮件...
    return nil
}

// 业务代码依赖接口，而不是具体实现
type UserService struct {
    sender EmailSender
}

func (us *UserService) Register(email string) error {
    // 注册逻辑...
    return us.sender.Send(email, "Welcome!", "Thanks for joining!")
}

// 测试时用 Mock
type MockSender struct {
    Calls []string
}
func (m *MockSender) Send(to, subject, body string) error {
    m.Calls = append(m.Calls, to)
    return nil
}

func TestRegister(t *testing.T) {
    mock := &MockSender{}
    svc := &UserService{sender: mock}
    svc.Register("alice@test.com")

    if len(mock.Calls) != 1 {
        t.Error("应该发送了一封邮件")
    }
}
```

---

## 11. 泛型约束接口（Go 1.18+）

```go
// 用接口做类型约束
type Number interface {
    int | int32 | int64 | float32 | float64
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}

// comparable：内置约束，支持 == 比较的类型
func Contains[T comparable](slice []T, target T) bool {
    for _, v := range slice {
        if v == target {
            return true
        }
    }
    return false
}
```

---

## 12. 最佳实践

- **接口要小**：Go 社区推崇 1-3 个方法的小接口。`io.Reader` 只有一个方法，却是整个生态的基石。
- **在消费端定义接口**：不要在实现方提前定义，而是在使用方按需定义。
- **接受接口，返回具体类型**：函数参数用接口，返回值用具体 struct。
- **不要为了接口而接口**：只有一个实现的接口通常是过度设计（除非是为了测试）。
- **命名约定**：单方法接口以 `-er` 结尾：`Reader`、`Writer`、`Stringer`、`Closer`。
