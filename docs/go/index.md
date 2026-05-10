---
lang: zh-CN
title: Go 语言学习路线
description: 从语法基础、指针、结构体、接口到并发模型的 Go 学习索引。
date: 2026-05-10
---

# Go 语言学习路线

这里记录 Go 语言的基础语法与常用特性。这个专题更偏工程速查：每篇文章先讲概念，再给可运行的代码片段，最后补常见误区。

## 建议阅读顺序

| 阶段 | 文章 | 解决的问题 |
| --- | --- | --- |
| 基础语法 | [Go 指针](./pointer.md)、[Go 函数](./func.md)、[Go 结构体](./struct.md) | 理解 Go 的值、地址、函数组织方式和数据建模方式 |
| 抽象能力 | [Go 接口](./interface.md)、[Go 错误处理](./error.md) | 写出更稳定的模块边界和错误传播路径 |
| 并发模型 | [Goroutine](./goroutine.md)、[Channel](./channel.md) | 理解 Go 的并发执行、通信和退出控制 |
| Java 迁移 | [Java 和 Go 数据结构对照](./data-structure.md) | 把 Java 思维迁移到 Go 的 slice、map、struct 和 interface |

## 基本编译

```bash
go build #编译当前目录的包
go build main.go #编译制定文件
go build -o myapp #指定输出文件名
```

## 交叉编译（跨平台）

通过设置`GOOS`和`GOARCH`环境变量来编译不同平台的可执行文件：

```bash
# Linux
GOOS=linux GOARCH=amd64 go build -o myapp-linux

# Windows
GOOS=windows GOARCH=amd64 go build -o myapp.exe

# macOS (Intel)
GOOS=darwin GOARCH=amd64 go build -o myapp-mac

# macOS (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -o myapp-mac-arm
```

## 开始阅读

- [Go 指针（Pointer）完全教程](./pointer.md)
- [Go 函数（Function）完全教程](./func.md)
- [Go 结构体（Struct）完全教程](./struct.md)
- [Go 接口（Interface）完全教程](./interface.md)
- [Go 错误处理（Error）完全教程](./error.md)
- [Go 协程（Goroutine）完全教程](./goroutine.md)
- [Go 通道（Channel）完全教程](./channel.md)
- [Java 和 Go 数据结构对照](./data-structure.md)

## 写作计划

- 补一篇 Go module、package 和 import 的工程组织笔记。
- 补一篇 context、timeout、cancel 的并发控制专题。
- 把常见面试题整理成“概念 -> 代码 -> 追问”的格式。
