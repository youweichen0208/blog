# Go 语言简介

这里记录 Go 语言的基础语法与常用特性（偏速查/笔记风格）。

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

- 指针：`/go/pointer`
- 函数：`/go/func`
- 结构体：`/go/struct`
- 接口：`/go/interface`
- 错误处理：`/go/error`
- 并发：`/go/goroutine`、`/go/channel`
