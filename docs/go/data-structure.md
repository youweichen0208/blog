---
lang: zh-CN
title: Java 和 Go 数据结构对照
description: 从 Java 迁移到 Go 时，理解 slice、map、struct、interface 和 nil 的常见思维差异。
date: 2026-04-20
tags:
  - Go
  - Java
  - Data Structure
---

# Java 和 Go 数据结构对照

## 1. java 和 go 的区别

**纠正一个思维惯性**：在 java 中，“一切皆对象”，所以我们习惯到处 new。在 go 中，我们更倾向于直接操作**值**。

- **Java**: `User u = new User();`
- **Go**: `u := User{}` （栈上分配，比 new 更高效）

## 2. 切片(slice) - 对应 java 的 arraylist

**基本概念**
slice 是对底层数组的引用，由 3 个部分组成：**指针**，**长度（len）**，**容量（cap）**

```go
// 声明方式
var s []int // nil slice, len=0, cap=0
s := []int{1, 2, 3} //字面量初始化
s := make([]int, 3, 5) //len=3, cap=5
```

**关键操作**

```go
s := []int{1, 2, 3}

// append -- 超出cap时自动扩容（新底层数组）
// append(s, 4, 5)就是向切片末尾添加元素4和5。
s = append(s, 4, 5) //[1 2 3 4 5]
s = append(s, 6) // 加一个
```

**为什么要 s=重新赋值？**
因为 append 不修改原切片，而是返回新切片。如果容量不够触发了扩容，底层数组就会换一个新的，原来的 s 就指向旧的了。所以必须返回值覆盖原变量。不够触发了扩容，底层数组会换一个新的，原来的 s 就指向旧的了。**注：**如果没触发扩容，append 直接在原底层数组上写入新元素，返回的新切片和原切片**共享同一个底层数组**。这就是为什么即使没有扩容也必须 s=接收返回值--不是因为底层数组变了，而是因为 append 返回的切片 len 变了，原来的 s 的 len 还是旧的，访问不到新追加的元素。

## 3. map

**基本用法**

```go
// 声明（nil map，不能写入！）
var m map[string]int

// 初始化
m := make(map[string]int)
m := map[string]int{"a":1, "b":2}


// 增删改查
m["key"] = 42 //写
v := m["key"] //读 （不存在返回零值）
delete(m, "key") //删
```

## 4. channel

Channel 是 Go 里 goroutine 之间传递数据的管道。可以把它想象成一个队列。一个 goroutine 往里放数据，另一个 goroutine 里取数据。

Go 的并发哲学是：**不要通过共享内存来通信，而要通过通信来共享内存。**
其他语言（java 和 python）并发通常是多个线程共享一个变量，然后加锁。Go 推荐的方式是把数据通过 channel 传递，避免共享。

```go
	ch := make(chan int)

	go func() {
		ch <- 42
	}()

	result := <-ch
	fmt.Println(result)
```

**适用 channel 的场景**

1. 任务分发/生产者消费者

```go
func main() {
	jobs := make(chan int, 100) // 创建一个能装100个int的缓冲channel
	var wg sync.WaitGroup       // 创建计数器，初始值为0

	// 生产者
	go func() {
		for i := 0; i < 100; i++ {
			jobs <- i // 把 0~99 依次放入 channel
		}
		close(jobs) // 放完了，关闭 channel，通知消费者没有新数据了
	}()

	// 多个消费者 worker
	for w := 0; w < 3; w++ {
		wg.Add(1) // 计数器 +1，现在是 1、2、3
		go func() {
			defer wg.Done()         // 注册：这个 goroutine 结束时计数器 -1
			for job := range jobs { // 不断从 channel 取数据
				fmt.Println("处理任务:", job)
			}
			// range jobs 会在 channel 关闭且取完后自动退出循环
		}()
	}

	wg.Wait() // 计数器不为0就一直阻塞，直到3个worker都Done()
}
```

2. 控制并发数量（信号量）
3. 超时控制
4. 退出信号通知
5. 适合用 sync.Mutex 场景

### command-ok 用法

### range 用法

遍历各种类型

```go
// slice / array
for i, v := range []int{1,2,3} {
    fmt.Println(i, v)
}

// map （顺序不确定！）
for k, v := range map[string]int{"a":1} {
    fmt.Println(i,v)
}

// channel
for v := range ch {
    fmt.Println(v)
}

for i, r := range "你好" {
    fmt.Printf("%d: %c\n", i, r)
}
```

## 初始化分号(Init Statement)用法

Go 中的 if，switch，for 语句都支持在主条件前加一个**初始化语句**，格式是：

```go
关键字 初始化语句；条件 {

}
```

**if 的初始化语句**

```go
// 基本格式
if 初始化； 条件 {

}

// 实际例子
if v, ok := m["key"]; ok {
    fmt.Println(v)
}

// 等价于
v, ok := m["key"]
if ok {
    fmt.Println(v)
}
```

**switch 的初始化语句**

```go
// 基本格式
switch 初始化; 表达式 {
}

// 例子1：初始化 + 匹配变量
switch x := compute(); x {
case 1:
    fmt.Println("one")
case 2:
    fmt.Println("two")
}

// 例子2：初始化 + 无表达式（相当于 if-else）
switch x := getScore(); {
case x >= 90:
    fmt.Println("优秀")
case x >= 60:
    fmt.Println("及格")
default:
    fmt.Println("不及格")
}

// 例子3：处理错误
switch err := doWork(); {
case err == nil:
    fmt.Println("成功")
case errors.Is(err, io.EOF):
    fmt.Println("文件结束")
default:
    fmt.Println("未知错误:", err)
}
```

**for 的初始化语句**
for 的三段式本质就是初始化语句的体现：

```go
// 格式：for 初始化; 条件; 后置语句 { }
for i := 0; i < 10; i++ {
    fmt.Println(i)
}

// 初始化多个变量
for i, j := 0, 10; i < j; i, j = i+1, j-1 {
    fmt.Println(i, j)
}
// 输出：
// 0 10
// 1 9
// 2 8
// 3 7
// 4 6
```

## make 用法

`make`专用于初始化`slice`, `map`, `channel` 三种引用类型，返回初始化好的值（不是指针）。

```go
// Slice
make([]T, length)           // len=length, cap=length
make([]T, length, capacity) // len=length, cap=capacity

// Map
make(map[K]V)         // 空 map
make(map[K]V, hint)   // 预分配 hint 个 bucket（优化性能）

// Channel
make(chan T)        // 无缓冲
make(chan T, size)  // 有缓冲，容量 size
```

场景总结：
`mapVal := make(map[int]int, len(nums))`运行速度远大于`mapVal := make(map[int]int)`

`map` 底层是哈希表，需要分配内存桶（bucket）来存数据。不预设容量的话，随着元素增多，map 会反复**扩容**——重新分配更大的内存，把已有的数据搬过去。这个过程开销不小。
预设了容量，Go 一开始就分配足够的桶，减少甚至避免扩容，所以更快。
不过要注意：**数据量小的时候差别可以忽略不计**。比如只有几十个元素，加不加都无所谓。数据量大（成千上万）时差别才明显。
一个简单的原则：**如果你已经知道大概有多少元素，就顺手加上，没坏处**。 `slice` 也一样。

```go
s := make([]int, 0, len(nums))
```

这算是 go 里一个低成本高收益的小习惯。
