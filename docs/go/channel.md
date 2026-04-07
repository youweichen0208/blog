# Go 通道（Channel）完全教程

## 1. 什么是 Channel？

Channel 是 goroutine 之间通信的管道。Go 的并发哲学是：**不要通过共享内存来通信，而要通过通信来共享内存。**

```go
// 创建 channel
ch := make(chan int)       // 无缓冲 channel
ch := make(chan string, 5) // 缓冲 channel（容量 5）

// 发送
ch <- 42

// 接收
val := <-ch
```

---

## 2. 无缓冲 Channel

无缓冲 channel 是同步的——发送方会阻塞直到接收方准备好，反之亦然。

```go
func main() {
    ch := make(chan string)

    go func() {
        ch <- "hello"  // 发送（会阻塞直到有人接收）
        fmt.Println("发送完成")
    }()

    msg := <-ch  // 接收（会阻塞直到有人发送）
    fmt.Println(msg)  // "hello"
}
```

### 无缓冲 channel 就像面对面交接

```
goroutine A                    goroutine B
    |                               |
    |--- "hello" ----->  阻塞等待    |
    |                    接收 "hello" |
    |   继续执行 <----   继续执行      |
```

两边必须同时到场，发送和接收才能完成。

---

## 3. 缓冲 Channel

缓冲 channel 有一个队列，发送方在队列满之前不会阻塞。

```go
ch := make(chan int, 3)  // 容量为 3

ch <- 1   // 不阻塞
ch <- 2   // 不阻塞
ch <- 3   // 不阻塞
// ch <- 4  // 阻塞！缓冲区满了

fmt.Println(<-ch)  // 1（FIFO）
fmt.Println(<-ch)  // 2
fmt.Println(<-ch)  // 3

// 查看 channel 状态
fmt.Println(len(ch))  // 当前元素数量
fmt.Println(cap(ch))  // 容量
```

### 什么时候用缓冲 channel？

| 场景                       | 选择               |
| -------------------------- | ------------------ |
| 需要同步（确认对方收到了） | 无缓冲             |
| 生产者和消费者速度不一致   | 缓冲               |
| 限制并发数量               | 缓冲（用作信号量） |
| 只发送一次信号             | 缓冲容量为 1       |

---

## 4. Channel 方向

可以限制 channel 只读或只写，增加类型安全。

```go
// 只写（只能发送）
func producer(ch chan<- int) {
    for i := 0; i < 5; i++ {
        ch <- i
    }
    close(ch)
}

// 只读（只能接收）
func consumer(ch <-chan int) {
    for val := range ch {
        fmt.Println(val)
    }
}

func main() {
    ch := make(chan int, 5)
    go producer(ch)  // chan int 自动转为 chan<- int
    consumer(ch)     // chan int 自动转为 <-chan int
}
```

---

## 5. 关闭 Channel

```go
ch := make(chan int, 5)
ch <- 1
ch <- 2
close(ch)  // 关闭 channel

// 关闭后仍可以接收剩余数据
fmt.Println(<-ch)  // 1
fmt.Println(<-ch)  // 2
fmt.Println(<-ch)  // 0（channel 已空，返回零值）

// 判断 channel 是否关闭
val, ok := <-ch
// ok == false 表示 channel 已关闭且无数据
```

### 关闭的规则

```go
//  由发送方关闭
func producer(ch chan<- int) {
    for i := 0; i < 5; i++ {
        ch <- i
    }
    close(ch)  // 发送方关闭
}

// ❌ 不要由接收方关闭（发送方再发送会 panic）
// ❌ 不要关闭已关闭的 channel（会 panic）
// ❌ 不要向已关闭的 channel 发送数据（会 panic）
```

---

## 6. range 遍历 Channel

```go
ch := make(chan int, 5)

go func() {
    for i := 1; i <= 5; i++ {
        ch <- i
    }
    close(ch)  // 必须 close，否则 range 会一直阻塞
}()

// range 会一直读取直到 channel 关闭
for val := range ch {
    fmt.Println(val)
}
// 输出：1 2 3 4 5
```

---

## 7. select —— 多路复用

`select` 可以同时等待多个 channel 操作，哪个先就绪就执行哪个。

```go
func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)

    go func() {
        time.Sleep(1 * time.Second)
        ch1 <- "来自 ch1"
    }()

    go func() {
        time.Sleep(2 * time.Second)
        ch2 <- "来自 ch2"
    }()

    // 等待第一个就绪的 channel
    select {
    case msg := <-ch1:
        fmt.Println(msg)
    case msg := <-ch2:
        fmt.Println(msg)
    }
    // 输出："来自 ch1"（因为它先完成）
}
```

### 7.1 超时控制

```go
select {
case result := <-ch:
    fmt.Println("收到结果:", result)
case <-time.After(3 * time.Second):
    fmt.Println("超时了！")
}
```

### 7.2 非阻塞操作

```go
select {
case msg := <-ch:
    fmt.Println("收到:", msg)
default:
    fmt.Println("没有数据，继续做其他事")
}
```

### 7.3 循环 select

```go
func worker(ctx context.Context, jobs <-chan int) {
    for {
        select {
        case <-ctx.Done():
            fmt.Println("收到取消信号，退出")
            return
        case job, ok := <-jobs:
            if !ok {
                fmt.Println("任务队列关闭")
                return
            }
            fmt.Printf("处理任务: %d\n", job)
        }
    }
}
```

---

## 8. 常见模式

### 8.1 信号通知（done channel）

```go
func doWork(done chan struct{}) {
    fmt.Println("工作中...")
    time.Sleep(2 * time.Second)
    fmt.Println("完成")
    close(done)  // 通知完成
}

func main() {
    done := make(chan struct{})
    go doWork(done)
    <-done  // 等待完成信号
    fmt.Println("继续执行")
}
```

### 8.2 信号量（限制并发数）

```go
func main() {
    // 用缓冲 channel 做信号量，限制同时运行 3 个 goroutine
    sem := make(chan struct{}, 3)
    var wg sync.WaitGroup

    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            sem <- struct{}{}        // 获取令牌（缓冲区满则阻塞）
            defer func() { <-sem }() // 释放令牌

            fmt.Printf("Worker %d 执行中\n", id)
            time.Sleep(time.Second)
        }(i)
    }

    wg.Wait()
}
```

### 8.3 Pipeline（管道）

```go
// 阶段 1：生成数字
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

// 阶段 2：平方
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

// 阶段 3：过滤（只保留偶数）
func filterEven(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            if n%2 == 0 {
                out <- n
            }
        }
        close(out)
    }()
    return out
}

func main() {
    // 组合管道
    nums := generate(1, 2, 3, 4, 5)
    squared := square(nums)
    even := filterEven(squared)

    for result := range even {
        fmt.Println(result)  // 4, 16（只有 2² 和 4² 是偶数）
    }
}
```

### 8.4 超时与取消

```go
func fetchWithTimeout(url string, timeout time.Duration) (string, error) {
    resultCh := make(chan string, 1)
    errCh := make(chan error, 1)

    go func() {
        resp, err := http.Get(url)
        if err != nil {
            errCh <- err
            return
        }
        defer resp.Body.Close()
        body, _ := io.ReadAll(resp.Body)
        resultCh <- string(body)
    }()

    select {
    case result := <-resultCh:
        return result, nil
    case err := <-errCh:
        return "", err
    case <-time.After(timeout):
        return "", errors.New("请求超时")
    }
}
```

### 8.5 Or-Done Channel（任一完成即返回）

```go
// 同时请求多个服务，谁先响应用谁
func fastest(urls []string) string {
    ch := make(chan string, len(urls))

    for _, url := range urls {
        go func(u string) {
            resp, err := http.Get(u)
            if err != nil {
                return
            }
            defer resp.Body.Close()
            body, _ := io.ReadAll(resp.Body)
            ch <- string(body)
        }(url)
    }

    return <-ch  // 返回最快的结果
}
```

---

## 9. Channel 的零值和 nil

```go
// nil channel 的行为
var ch chan int  // nil

// 向 nil channel 发送会永远阻塞
// ch <- 1  // 永远阻塞

// 从 nil channel 接收也会永远阻塞
// <-ch  // 永远阻塞

// 关闭 nil channel 会 panic
// close(ch)  // panic

// nil channel 在 select 中很有用（禁用某个 case）
var ch1 chan int  // nil：不会被选中
ch2 := make(chan int, 1)
ch2 <- 42

select {
case v := <-ch1:  // 永远不会命中
    fmt.Println(v)
case v := <-ch2:  // 会命中
    fmt.Println(v)
}
```

---

## 10. Channel 行为速查表

| 操作             | nil channel | 已关闭 channel   | 正常 channel |
| ---------------- | ----------- | ---------------- | ------------ |
| 发送 `ch <-`     | 永远阻塞    | **panic**        | 阻塞或成功   |
| 接收 `<-ch`      | 永远阻塞    | 返回零值 + false | 阻塞或成功   |
| 关闭 `close(ch)` | **panic**   | **panic**        | 成功         |
| `len(ch)`        | 0           | 剩余元素数       | 缓冲元素数   |
| `cap(ch)`        | 0           | 缓冲容量         | 缓冲容量     |

---

## 11. 最佳实践

- **由发送方关闭 channel**，永远不要在接收方关闭。
- **明确 channel 的所有权**：谁创建、谁发送、谁关闭、谁接收，要清晰。
- 优先使用无缓冲 channel（更容易推理正确性），只在需要时才加缓冲。
- 用 `select` + `context` 处理超时和取消。
- 用 `chan struct{}` 做信号通知（不传数据，只传信号）。
- 注意 goroutine 泄漏：确保所有发送/接收操作最终都能完成。
