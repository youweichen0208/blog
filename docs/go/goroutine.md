# Go 协程（Goroutine）完全教程

## 1. 什么是 Goroutine？

Goroutine 是 Go 的轻量级线程，由 Go 运行时（而非操作系统）管理。创建成本极低（约 2-8KB 栈空间），可以轻松创建数十万个。

```go
// 只需要在函数调用前加 go 关键字
go doSomething()

// 使用匿名函数
go func() {
    fmt.Println("我在另一个 goroutine 中运行")
}()
```

对比其他语言的线程：

|          | Goroutine           | OS 线程 (Java/C++) |
| -------- | ------------------- | ------------------ |
| 创建成本 | ~2KB                | ~1MB               |
| 创建时间 | 微秒级              | 毫秒级             |
| 数量上限 | 轻松百万级          | 通常几千个         |
| 调度     | Go 运行时（用户态） | 操作系统（内核态） |

---

## 2. 基本使用

```go
func say(msg string) {
    for i := 0; i < 3; i++ {
        fmt.Println(msg)
        time.Sleep(100 * time.Millisecond)
    }
}

func main() {
    go say("hello")   // 启动 goroutine
    say("world")       // main goroutine 继续执行

    // 如果 main 函数退出，所有 goroutine 都会被终止
    // 所以需要等待机制
}
```

### 注意：main 退出 = 程序结束

```go
func main() {
    go fmt.Println("hello")
    // 程序可能在 goroutine 执行前就退出了
    // 什么都不会打印
}

// 简单的等待方式（不推荐用于生产）
func main() {
    go fmt.Println("hello")
    time.Sleep(time.Second)  // 等一秒（不可靠）
}
```

---

## 3. sync.WaitGroup —— 等待一组 goroutine 完成

```go
func main() {
    var wg sync.WaitGroup

    for i := 0; i < 5; i++ {
        wg.Add(1)  // 计数 +1
        go func(id int) {
            defer wg.Done()  // 计数 -1
            fmt.Printf("Worker %d 开始\n", id)
            time.Sleep(time.Second)
            fmt.Printf("Worker %d 完成\n", id)
        }(i)
    }

    wg.Wait()  // 阻塞直到计数归零
    fmt.Println("所有 worker 完成")
}
```

### WaitGroup 的规则

```go
//  正确：在启动 goroutine 之前 Add
wg.Add(1)
go func() {
    defer wg.Done()
    // ...
}()

// ❌ 错误：在 goroutine 内部 Add（可能来不及）
go func() {
    wg.Add(1)  // 可能 Wait 已经返回了
    defer wg.Done()
}()
```

---

## 4. 并发 vs 并行

```go
// 并发（Concurrency）：多个任务交替执行
// 并行（Parallelism）：多个任务同时执行

// Go 默认使用所有 CPU 核心
fmt.Println(runtime.NumCPU())       // 查看 CPU 核心数
fmt.Println(runtime.GOMAXPROCS(0))  // 查看当前使用的核心数

// 可以手动设置（一般不需要）
runtime.GOMAXPROCS(4)  // 使用 4 个核心
```

---

## 5. Goroutine 的常见模式

### 5.1 并行执行多个任务

```go
func fetchURL(url string) string {
    resp, _ := http.Get(url)
    defer resp.Body.Close()
    body, _ := io.ReadAll(resp.Body)
    return string(body)
}

func main() {
    urls := []string{
        "https://api.example.com/users",
        "https://api.example.com/orders",
        "https://api.example.com/products",
    }

    results := make([]string, len(urls))
    var wg sync.WaitGroup

    for i, url := range urls {
        wg.Add(1)
        go func(idx int, u string) {
            defer wg.Done()
            results[idx] = fetchURL(u)  // 每个 goroutine 写不同索引，安全
        }(i, url)
    }

    wg.Wait()
    // 所有请求已并行完成
}
```

### 5.2 Worker Pool（工作池）

```go
func worker(id int, jobs <-chan int, results chan<- int) {
    for j := range jobs {
        fmt.Printf("Worker %d 处理任务 %d\n", id, j)
        time.Sleep(time.Second)  // 模拟耗时操作
        results <- j * 2
    }
}

func main() {
    jobs := make(chan int, 100)
    results := make(chan int, 100)

    // 启动 3 个 worker
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }

    // 发送 9 个任务
    for j := 1; j <= 9; j++ {
        jobs <- j
    }
    close(jobs)

    // 收集结果
    for r := 1; r <= 9; r++ {
        fmt.Println(<-results)
    }
}
```

### 5.3 Fan-out / Fan-in

```go
// Fan-out：一个输入分发给多个 goroutine
// Fan-in：多个 goroutine 的输出合并到一个 channel

func producer(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

func merge(channels ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup
    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan int) {
            defer wg.Done()
            for v := range c {
                out <- v
            }
        }(ch)
    }
    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}

func main() {
    in := producer(1, 2, 3, 4, 5)

    // Fan-out：两个 goroutine 同时处理
    c1 := square(in)
    c2 := square(in)

    // Fan-in：合并结果
    for result := range merge(c1, c2) {
        fmt.Println(result)
    }
}
```

---

## 6. 并发安全

### 6.1 数据竞争（Race Condition）

```go
// ❌ 有数据竞争
counter := 0
var wg sync.WaitGroup
for i := 0; i < 1000; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        counter++  // 多个 goroutine 同时读写
    }()
}
wg.Wait()
fmt.Println(counter)  // 结果不确定，可能小于 1000
```

### 6.2 Mutex（互斥锁）

```go
var mu sync.Mutex
counter := 0
var wg sync.WaitGroup

for i := 0; i < 1000; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        mu.Lock()
        counter++
        mu.Unlock()
    }()
}
wg.Wait()
fmt.Println(counter)  // 稳定输出 1000
```

### 6.3 RWMutex（读写锁）

```go
// 适用于读多写少的场景
var rwmu sync.RWMutex
data := map[string]string{}

// 写操作：排他锁
func write(key, value string) {
    rwmu.Lock()
    defer rwmu.Unlock()
    data[key] = value
}

// 读操作：共享锁（多个读可以并发）
func read(key string) string {
    rwmu.RLock()
    defer rwmu.RUnlock()
    return data[key]
}
```

### 6.4 sync.Map（并发安全 map）

```go
var m sync.Map

// 写
m.Store("key", "value")

// 读
val, ok := m.Load("key")

// 删
m.Delete("key")

// 遍历
m.Range(func(key, value any) bool {
    fmt.Println(key, value)
    return true  // 返回 false 停止遍历
})
```

### 6.5 atomic（原子操作）

```go
import "sync/atomic"

var counter int64

// 原子递增（比 Mutex 更轻量）
atomic.AddInt64(&counter, 1)

// 原子读取
val := atomic.LoadInt64(&counter)

// 原子写入
atomic.StoreInt64(&counter, 100)

// CAS（Compare And Swap）
atomic.CompareAndSwapInt64(&counter, 100, 200)
```

---

## 7. 检测数据竞争

```bash
# Go 内置竞争检测器
go run -race main.go
go test -race ./...

# 输出示例：
# WARNING: DATA RACE
# Goroutine 7 at 0x...
# Previous write at 0x...
```

开发和测试时**一定要开 `-race`**，能帮你发现很多隐藏的并发 bug。

---

## 8. context 控制 Goroutine 生命周期

```go
func worker(ctx context.Context, id int) {
    for {
        select {
        case <-ctx.Done():
            fmt.Printf("Worker %d 收到取消信号\n", id)
            return
        default:
            fmt.Printf("Worker %d 工作中...\n", id)
            time.Sleep(500 * time.Millisecond)
        }
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()

    for i := 1; i <= 3; i++ {
        go worker(ctx, i)
    }

    <-ctx.Done()  // 等待超时
    time.Sleep(100 * time.Millisecond)  // 给 goroutine 时间打印
    fmt.Println("所有 worker 已停止")
}
```

---

## 9. Goroutine 泄漏

Goroutine 不会被垃圾回收，如果一直阻塞就会泄漏。

```go
// ❌ 泄漏：channel 永远没人读
func leak() {
    ch := make(chan int)
    go func() {
        ch <- 42  // 永远阻塞，因为没人读这个 channel
    }()
    // 函数返回，但 goroutine 还活着
}

//  修复：用 context 或 buffered channel
func noLeak() {
    ch := make(chan int, 1)  // 缓冲 channel，写入不阻塞
    go func() {
        ch <- 42
    }()
    // 即使没人读，goroutine 也能完成
}
```

---

## 10. 最佳实践

- 用 `sync.WaitGroup` 等待 goroutine 完成，不要用 `time.Sleep`。
- 用 `context` 控制 goroutine 的取消和超时。
- 用 `-race` 标志检测数据竞争。
- 确保每个 goroutine 都有退出的路径，避免泄漏。
- 优先用 channel 通信，而不是共享内存 + 锁。
- 不要启动你无法停止的 goroutine。
