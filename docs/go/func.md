# Go 函数（Function）完全教程

## 1. 基本语法

```go
func 函数名(参数列表) 返回值类型 {
    // 函数体
}

// 示例
func add(a int, b int) int {
    return a + b
}

// 参数类型相同时可以合并
func add(a, b int) int {
    return a + b
}
```

---

## 2. 多返回值

Go 函数可以返回多个值，这是 Go 最有特色的设计之一。

```go
// 返回两个值
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("除以零")
    }
    return a / b, nil
}

result, err := divide(10, 3)
if err != nil {
    log.Fatal(err)
}
```

### 命名返回值

```go
func divide(a, b float64) (result float64, err error) {
    if b == 0 {
        err = errors.New("除以零")
        return  // 裸 return，自动返回 result 和 err
    }
    result = a / b
    return
}
```

命名返回值可以让代码更清晰，但不建议在长函数中使用裸 return，因为可读性会下降。

---

## 3. 可变参数

```go
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

sum(1, 2, 3)       // 6
sum(1, 2, 3, 4, 5) // 15

// 传入切片时要用 ... 展开
nums := []int{1, 2, 3}
sum(nums...)        // 6
```

---

## 4. 函数是一等公民

Go 中函数可以像变量一样传递、赋值、作为参数和返回值。

### 4.1 函数赋值给变量

```go
add := func(a, b int) int {
    return a + b
}
fmt.Println(add(1, 2))  // 3
```

### 4.2 函数作为参数（高阶函数）

```go
func apply(nums []int, fn func(int) int) []int {
    result := make([]int, len(nums))
    for i, n := range nums {
        result[i] = fn(n)
    }
    return result
}

doubled := apply([]int{1, 2, 3}, func(n int) int {
    return n * 2
})
// [2, 4, 6]
```

### 4.3 函数作为返回值

```go
func multiplier(factor int) func(int) int {
    return func(n int) int {
        return n * factor
    }
}

double := multiplier(2)
triple := multiplier(3)
fmt.Println(double(5))  // 10
fmt.Println(triple(5))  // 15
```

### 4.4 函数类型

```go
// 定义函数类型，让签名更清晰
type MathFunc func(int, int) int

func calculate(a, b int, op MathFunc) int {
    return op(a, b)
}

calculate(10, 3, func(a, b int) int { return a + b })  // 13
calculate(10, 3, func(a, b int) int { return a - b })  // 7
```

---

## 5. 匿名函数

`func(){...}`只是**定义**了一个匿名函数， 并没有**调用**它。

```go
go func() { ch <- 42 }    // ❌ 只定义，没调用，go 后面必须是函数调用
go func() { ch <- 42 }()  // ✅ 末尾 () 表示立即调用这个函数
```

类比普通函数：

```go
func hello() { fmt.Println("hi") }

hello    // ❌ 只是引用函数，什么都不会发生
hello()  // ✅ 调用函数
```

```go
// 声明并立即执行
result := func(a, b int) int {
    return a + b
}(3, 4)
// result = 7

// 常见用法：goroutine 中
go func() {
    fmt.Println("在另一个 goroutine 中执行")
}()
```

**注意**
`go`关键字的语法要求后面必须是一个**函数调用表达式**，所以：

```go
go hello()   // ✅ 普通函数调用
go func(){...}() // ✅ 匿名函数定义 + 立即调用
go func() {...} // ❌ 编译报错
```

`()`就是“执行函数”的意思，没有它函数永远不会执行。

---

## 6. 闭包（Closure）

闭包是引用了外部变量的函数，该变量的生命周期会被延长。

```go
func counter() func() int {
    n := 0
    return func() int {
        n++       // 引用了外部变量 n
        return n
    }
}

c := counter()
fmt.Println(c())  // 1
fmt.Println(c())  // 2
fmt.Println(c())  // 3

// 每次调用 counter() 都会创建独立的 n
c2 := counter()
fmt.Println(c2()) // 1（独立计数）
```

### 闭包的常见陷阱

```go
// ❌ 错误：循环变量被共享
funcs := make([]func(), 5)
for i := 0; i < 5; i++ {
    funcs[i] = func() {
        fmt.Println(i)  // 所有函数都会打印 5
    }
}

//  正确：通过参数捕获当前值
for i := 0; i < 5; i++ {
    i := i  // 在循环内重新声明（Go 的惯用写法）
    funcs[i] = func() {
        fmt.Println(i)  // 0, 1, 2, 3, 4
    }
}
```

---

## 7. defer

`defer` 会在函数返回前执行，常用于资源清理。

```go
func readFile(path string) error {
    file, err := os.Open(path)
    if err != nil {
        return err
    }
    defer file.Close()  // 函数返回前自动关闭

    // 读取文件...
    return nil
}
```

### defer 的执行顺序：后进先出（LIFO）

```go
func main() {
    defer fmt.Println("1")
    defer fmt.Println("2")
    defer fmt.Println("3")
}
// 输出：3, 2, 1
```

### defer 与循环

```go
// 不要在循环中 defer（资源不会及时释放）
for _, file := range files {
    f, _ := os.Open(file)
    defer f.Close()  // 直到函数结束才会关闭所有文件
}

//  用一个内部函数包裹
for _, file := range files {
    func() {
        f, _ := os.Open(file)
        defer f.Close()  // 每次循环结束就关闭
        // 处理文件...
    }()
}
```

---

## 8. init 函数

每个包可以有一个或多个 `init` 函数，在程序启动时自动执行。

```go
package main

var config map[string]string

func init() {
    // 在 main 之前自动执行
    config = map[string]string{
        "env":  "production",
        "port": "8080",
    }
    fmt.Println("初始化完成")
}

func main() {
    fmt.Println(config["env"])  // production
}
```

执行顺序：全局变量初始化 → `init()` → `main()`

---

## 9. 方法（Method）

方法是绑定到类型上的函数，通过**接收者（receiver）**实现。

```go
type Rect struct {
    Width, Height float64
}

// 值接收者 —— 不会修改原值
func (r Rect) Area() float64 {
    return r.Width * r.Height
}

// 指针接收者 —— 可以修改原值
func (r *Rect) Scale(factor float64) {
    r.Width *= factor
    r.Height *= factor
}

rect := Rect{10, 5}
fmt.Println(rect.Area())   // 50
rect.Scale(2)
fmt.Println(rect.Area())   // 200
```

### 值接收者 vs 指针接收者

|              | 值接收者 `(r Rect)` | 指针接收者 `(r *Rect)` |
| ------------ | ------------------- | ---------------------- |
| 能否修改原值 | ❌ 操作的是副本     | 操作的是原值           |
| 适用场景     | 只读方法            | 需要修改、或结构体很大 |
| 调用方式     | 值和指针都能调用    | 值和指针都能调用       |

经验法则：如果有一个方法用了指针接收者，那这个类型的所有方法最好都用指针接收者，保持一致。

---

## 10. 泛型函数（Go 1.18+）

```go
// 泛型函数
func Min[T int | float64 | string](a, b T) T {
    if a < b {
        return a
    }
    return b
}

Min(3, 5)       // 3
Min(3.14, 2.71) // 2.71
Min("a", "b")   // "a"

// 使用类型约束
type Number interface {
    int | int8 | int16 | int32 | int64 |
    float32 | float64
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}
```

---

## 11. 最佳实践

- 函数保持短小，一个函数只做一件事。
- 优先返回 `error` 而不是 `panic`。
- 接收者命名用类型首字母小写：`func (u *User)` 而不是 `func (self *User)` 或 `func (this *User)`。
- `defer` 紧跟在资源获取之后，别隔太远。
- 导出函数（大写开头）要写注释，以函数名开头：`// GetUser returns a user by ID.`
- 避免嵌套过深，善用"提前返回"：

```go
// 嵌套深
func process(data []byte) error {
    if data != nil {
        if len(data) > 0 {
            // 处理...
            return nil
        }
        return errors.New("empty")
    }
    return errors.New("nil data")
}

// 提前返回
func process(data []byte) error {
    if data == nil {
        return errors.New("nil data")
    }
    if len(data) == 0 {
        return errors.New("empty")
    }
    // 处理...
    return nil
}
```
