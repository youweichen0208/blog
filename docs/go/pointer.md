---
lang: zh-CN
title: Go 指针（Pointer）完全教程
description: 理解 Go 指针、取地址、解引用、值传递、逃逸分析和与 C 指针的差异。
date: 2026-05-01
tags:
  - Go
  - Pointer
---

# Go 指针（Pointer）完全教程

## 1. 什么是指针？

指针是一个变量，存储的是另一个变量的**内存地址**，而不是值本身。Go 的指针比 C/C++ 安全得多——不支持指针运算，不会出现野指针。

### Go 指针 vs C 指针对比

| 特性     | C 语言（手动挡）                                               | Go 语言（自动挡）                            |
| -------- | -------------------------------------------------------------- | -------------------------------------------- |
| 行为     | 盲目执行                                                       | 智能分析                                     |
| 后果     | 产生野指针（Dangling Pointer），访问时可能 Segfault 或读到乱码 | 安全访问，变量被安全地保存在堆里             |
| 生命周期 | 开发者必须手动 malloc 和 free                                  | GC（垃圾回收）负责，只要有人引用就不会被释放 |
| 指针运算 | 支持（p++、p+5 等）                                            | 不支持，更安全                               |

### 核心运算符

- `&`：取地址（"这个变量住在哪里？"）
- `*`：解引用（"这个地址里放了什么？"）

**示例：**

```go
x := 42
p := &x       // p 存的是 x 的内存地址，类型是 *int

fmt.Println(p)   // 0xc0000b2008（内存地址）
fmt.Println(*p)  // 42（解引用，拿到地址里的值）

*p = 100         // 通过指针修改 x 的值
fmt.Println(x)   // 100
```

## 2. 声明指针

```go
// 方式 1：通过 & 取地址
x := 42
p := &x           // p 的类型是 *int

// 方式 2：先声明后赋值
var p *int         // 声明一个 int 指针，零值是 nil
p = &x             // 指向 x

// 方式 3：用 new 分配
p := new(int)      // 分配一块 int 大小的内存，返回指针
fmt.Println(*p)    // 0（int 的零值）
*p = 55
fmt.Println(*p)    // 55

// 各种类型的指针
var sp *string
var bp *bool
var slp *[]int
var mp *map[string]int
```

## 3. 指针的零值是 nil

```go
var p *int
fmt.Println(p)        // <nil>
fmt.Println(p == nil) // true

// 解引用 nil 指针会 panic
// fmt.Println(*p)    // panic: runtime error: invalid memory address

// 使用前一定要检查
if p != nil {
    fmt.Println(*p)
}
```

## 4. 值传递 vs 指针传递

Go 的函数参数**全部是值传递**。传指针本质上是传了"地址的副本"，但通过这个地址可以修改原始数据。

### 4.1 值传递（不影响原值）

```go
func double(n int) {
    n *= 2
    fmt.Println("函数内:", n)  // 20
}

func main() {
    x := 10
    double(x)
    fmt.Println("函数外:", x)  // 10（没变）
}
```

### 4.2 指针传递（可以修改原值）

```go
func double(n *int) {
    *n *= 2
    fmt.Println("函数内:", *n)  // 20
}

func main() {
    x := 10
    double(&x)
    fmt.Println("函数外:", x)  // 20（被修改了）
}
```

### 4.3 图解对比

```
值传递：
main:  x = 10
         ↓ 复制值
double: n = 10 → n = 20（只改了副本）
main:  x = 10（不变）

指针传递：
main:  x = 10    地址: 0xAABB
         ↓ 复制地址
double: n = 0xAABB → 通过地址修改 → *n = 20
main:  x = 20（被改了，因为指向同一块内存）
```

## 5. 结构体与指针

这是指针最高频的使用场景。

### 5.1 基本用法

```go
type User struct {
    Name string
    Age  int
}

u := User{Name: "Alice", Age: 25}
p := &u

// Go 自动解引用，以下两种写法等价
fmt.Println((*p).Name)  // "Alice"（标准写法）
fmt.Println(p.Name)     // "Alice"（Go 的语法糖，推荐）

p.Age = 26
fmt.Println(u.Age)  // 26
```

### 5.2 创建结构体指针

```go
// 方式 1：& 取地址
u := &User{Name: "Alice", Age: 25}  // u 是 *User

// 方式 2：new（很少用，因为无法直接初始化字段）
u := new(User)   // u 是 *User，所有字段为零值
u.Name = "Alice"
u.Age = 25

// 方式 3：先创建再取地址
u := User{Name: "Alice"}
p := &u
```

### 5.3 方法接收者

```go
type Counter struct {
    count int
}

// 值接收者：操作的是副本，不影响原值
func (c Counter) Value() int {
    return c.count
}

// 指针接收者：操作的是原值，可以修改
func (c *Counter) Increment() {
    c.count++
}

func (c *Counter) Reset() {
    c.count = 0
}

c := Counter{}
c.Increment()
c.Increment()
fmt.Println(c.Value())  // 2
c.Reset()
fmt.Println(c.Value())  // 0
```

### 5.4 值接收者 vs 指针接收者

```go
type BigStruct struct {
    Data [1024]byte  // 很大的结构体
    Name string
}

// 值接收者：每次调用都拷贝整个结构体
func (b BigStruct) GetName() string {
    return b.Name
}

// 指针接收者：只拷贝一个地址（8 字节）
func (b *BigStruct) GetNameFast() string {
    return b.Name
}
```

|          | 值接收者 `(s Struct)` | 指针接收者 `(s *Struct)` |
| -------- | --------------------- | ------------------------ |
| 修改原值 | no                    | yes                      |
| 拷贝成本 | 拷贝整个结构体        | 只拷贝地址（8 字节）     |
| nil 安全 | 不会 nil              | 需注意 nil               |
| 使用场景 | 小结构体、只读        | 大结构体、需要修改       |

经验法则：如果拿不准，**用指针接收者**。如果有一个方法用了指针接收者，所有方法最好都统一用指针接收者。

## 6. 函数返回指针

Go 中函数可以安全地返回局部变量的指针——编译器会做**逃逸分析**，自动把变量分配到堆上。

```go
func newUser(name string, age int) *User {
    u := User{Name: name, Age: age}
    return &u  //安全！u 会逃逸到堆上
}

// 更简洁的写法
func newUser(name string, age int) *User {
    return &User{Name: name, Age: age}
}

u := newUser("Alice", 25)
fmt.Println(u.Name)  // "Alice"
```

对比 C 语言：返回局部变量地址是未定义行为（悬垂指针）。Go 完全不用担心这个。

## 7. 指针与切片/Map

切片和 Map 本身就是引用类型，传递时不需要额外用指针。

```go
// 切片——自带引用语义
func modifySlice(s []int) {
    s[0] = 999  // 会修改原切片的元素
}

nums := []int{1, 2, 3}
modifySlice(nums)
fmt.Println(nums[0])  // 999

// 但 append 可能不会影响原切片（因为可能扩容生成新底层数组）
func appendToSlice(s []int) {
    s = append(s, 4)  // 这个 append 的结果不会反映到外面
}

// 如果需要 append 影响外部，传指针或返回新切片
func appendToSlice(s *[]int) {
    *s = append(*s, 4)
}

// Map——也是引用类型
func modifyMap(m map[string]int) {
    m["new"] = 100  // 会修改原 map
}
```

## 8. 指针的指针

Go 支持多级指针，但实际开发中很少用到。

```go
x := 42
p := &x    // *int
pp := &p   // **int

fmt.Println(**pp)  // 42

**pp = 100
fmt.Println(x)  // 100
```

## 9. 指针与接口

### 9.1 接口的隐式指针行为

```go
type Stringer interface {
    String() string
}

type User struct {
    Name string
}

// 指针接收者实现接口
func (u *User) String() string {
    return u.Name
}

var s Stringer
// s = User{Name: "Alice"}   // 编译错误！值类型没有实现接口
s = &User{Name: "Alice"}     // 指针类型才实现了接口
```

这是因为指针接收者的方法只属于指针类型，不属于值类型。但反过来，值接收者的方法同时属于值类型和指针类型。

```go
// 值接收者
func (u User) Greet() string { return "Hi, " + u.Name }

u := User{Name: "Alice"}
p := &u

u.Greet()  // ✅ 可以调用
p.Greet()  // ✅ 可以调用（Go 自动解引用）
```

### 9.2 nil 指针与接口的陷阱

```go
type MyError struct {
    Code int
}

func (e *MyError) Error() string {
    return fmt.Sprintf("error code: %d", e.Code)
}

func mayFail() error {
    var err *MyError = nil
    // 做了一些操作...
    return err  // 返回的不是 nil 接口！
}

func main() {
    err := mayFail()
    fmt.Println(err == nil)  // false！

    // 接口值 = (类型, 值)
    // 这里是 (*MyError, nil)，类型不为空，所以接口不为 nil
}

// 正确做法
func mayFail() error {
    // ...
    return nil  // 显式返回 nil
}
```

## 10. 指针数组 vs 数组指针

```go
// 指针数组：数组里的元素是指针
a := [3]*int{new(int), new(int), new(int)}
*a[0] = 10
*a[1] = 20
*a[2] = 30

// 数组指针：指向数组的指针
arr := [3]int{10, 20, 30}
p := &arr
fmt.Println(p[1])  // 20（Go 自动解引用）

// 切片的指针（不常用，因为切片本身就是引用类型）
s := []int{1, 2, 3}
sp := &s
(*sp)[0] = 99
// 一般不这么做，直接传切片就行
```

|          | 语法    | 本质             | 大小         |
| -------- | ------- | ---------------- | ------------ |
| 指针数组 | `[n]*T` | 数组，元素是指针 | n × 指针大小 |
| 数组指针 | `*[n]T` | 指针，指向数组   | 1 个指针大小 |

**记忆技巧：** 看 `*` 和 `[]` 谁在外面。`[3]*int` → `[]` 在外 → 是个数组；`*[3]int` → `*` 在外 → 是个指针。

## 11. 逃逸分析

Go 编译器会自动决定变量分配在栈上还是堆上。

```go
// 栈分配（快，函数结束自动回收）
func add(a, b int) int {
    sum := a + b  // sum 在栈上
    return sum
}

// 堆分配（慢，需要 GC 回收）
func newInt(n int) *int {
    x := n
    return &x  // x 逃逸到堆上，因为函数外还要用
}
```

### 内存的两个房间

- **栈（Stack）：** 像一个**自动整理的工位**。函数开始执行时分配空间，函数结束（`return`）时，工位上的东西立刻被清空。速度极快，但"寿命"很短。
- **堆（Heap）：** 像一个公共的大仓库。里面的东西除非被"环卫工"（GC 垃圾回收）清理，否则会一直存在。速度比栈慢，但"寿命"长。

### "逃逸"到底在逃什么？

在 C 语言中，如果我们返回一个局部变量的指针，程序会直接崩溃，因为函数结束时栈内存就被销毁了。但在 Go 里，编译器会进行逃逸分析：

**编译器的独白：**
"嘿，这个变量 `u` 虽然是在函数内部创建的，但函数结束后，外部的代码还要用它的地址。如果把它留在**栈**上，函数一退它就没了，那外部拿到的就是个死指针。没办法，只能让它**逃逸到堆**上，让它活得久一点！"

**总结：** 逃逸就是变量从"短命的栈"搬家到"长命的堆"的过程。

### 为什么要做"逃逸"分析？

既然更安全，为什么不干脆把所有东西都放堆上？原因有三：

- **性能提升：** 栈的分配和回收速度极快，只需要操作寄存器（SP）
- **减轻 GC 压力：** 堆上的对象越多，GC 扫描的工作量就越大。减少逃逸能让变量留在栈上，避免 GC 频繁触发导致的程序"卡顿"
- **降低心智负担：** 开发者只需关注业务逻辑，无需像 C/C++ 程序员那样纠结是用 `new` 还是直接声明。**Go 帮你选好了最合适的位置**

### Go vs C 的内存管理对比

| 特性     | C 语言（手动挡）                                               | Go 语言（自动挡）                            |
| -------- | -------------------------------------------------------------- | -------------------------------------------- |
| 行为     | 盲目执行                                                       | 智能分析                                     |
| 后果     | 产生野指针（Dangling Pointer），访问时可能 Segfault 或读到乱码 | 安全访问，变量被安全地保存在堆里             |
| 生命周期 | 开发者必须手动 malloc 和 free                                  | GC（垃圾回收）负责，只要有人引用就不会被释放 |

在 Go 中，**我们不可能"忘了"做逃逸分析，因为这是编译器自动完成的硬性任务，而不是开发者的选项。**

### 查看逃逸分析结果

```bash
go build -gcflags="-m" main.go

# 输出示例：
# ./main.go:5:2: moved to heap: x
# ./main.go:10:6: &User{} escapes to heap
```

### 减少堆分配的技巧

```go
// ❌ 产生堆分配
func process() *Result {
    r := &Result{}  // 逃逸到堆
    r.Compute()
    return r
}

// ✅ 让调用方提供内存
func process(r *Result) {
    r.Compute()  // r 可能在调用方的栈上
}

// ✅ 返回值而不是指针（小结构体）
func process() Result {
    r := Result{}  // 栈上
    r.Compute()
    return r       // 值拷贝，但小结构体拷贝很快
}
```

## 12. 最佳实践

- **小结构体传值，大结构体传指针**。一般超过 3-4 个字段就考虑用指针。
- **需要修改原值时用指针**，只读时传值更安全。
- **不要返回 nil 指针给 error 接口**，要显式返回 `nil`。
- **使用前检查 nil**，避免 panic。
- **不需要指针就不用指针**：slice、map、channel 自带引用语义。
- **统一方法接收者类型**：一个类型的所有方法要么都用值接收者，要么都用指针接收者。
- **不要用 unsafe.Pointer**，除非你非常清楚自己在做什么。
- 记住核心口诀：**`&` 取地址，`*` 取值，传指针可以改原值**。
