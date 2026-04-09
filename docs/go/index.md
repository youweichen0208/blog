# Go 项目随记

> 记录用 Go 开发 CLI 工具过程中遇到的知识点，以 `taurusdb-cli` 项目为主线。

## Cobra 命令行框架

### 项目结构规范

![main.go 只调用 cmd 包](/images/go/cobra-main.png)

Cobra 的最佳实践把代码拆成两层：

- **`main.go`**：极简入口，只负责调用 `cmd.Execute()`
- **`cmd/` 目录**：存放所有命令逻辑（`root.go`、`configure.go`、`instance_create.go` 等）

这样设计的好处是：添加新命令（比如 `taurusdb backup`）只需在 `cmd/` 下新增一个文件，`main.go` 完全不用动。

### `cmd.Execute()` 做了什么

调用一次 `cmd.Execute()`，Cobra 在幕后完成四件事：

| 步骤     | 说明                                    |
| -------- | --------------------------------------- |
| 解析参数 | 读取命令行输入，如 `-u root` 或子命令名 |
| 验证标志 | 检查必填参数是否缺失、类型是否正确      |
| 路由分发 | 找到匹配的子命令，调用其 `RunE` 函数    |
| 错误处理 | 捕获 panic / error，以友好方式输出      |

> `cmd` 包是整个 CLI 的"大脑"。没有它，`main.go` 是一个空壳，无法处理任何用户输入。

### 命令挂载机制

![configure.go 中的 init 函数](/images/go/cobra-configure.png)

每个子命令文件里都有一个 `init()` 函数：

```go
func init() {
    rootCmd.AddCommand(configureCmd)
}
```

- `rootCmd` 是根命令（`Use: "taurusdb"`）
- `AddCommand` 把子命令注册进去
- 没有这一行，`taurusdb configure` 永远找不到目标

**`init()` 的自动执行顺序：**

1. Go 编译器初始化 `rootCmd` 和 `configureCmd`
2. 各文件的 `init()` 自动运行 → `configure` 被挂载到根命令
3. `main.go` 的 `cmd.Execute()` 才开始执行

### `Execute()` 的路由过程

在终端输入 `./taurusdb configure` 时，`Execute()` 像交警一样：

1. **扫描输入** — 看到 `configure`
2. **查找匹配** — 在子命令列表里找到 `Use: "configure"` 的对象
3. **触发运行** — 调用该对象的 `RunE` 函数

### 交互式界面（survey 库）

进入 `RunE` 后，`runConfigure` 函数使用了 `survey` 库：

```go
survey.Ask(qs, &answers)
```

`survey` 接管终端输入流，负责：

- **暂停程序**，等待键盘输入
- **渲染 UI**，比如 `Select` 的上下箭头选择 Region
- **捕获结果**，填入 `answers` 结构体

**完整调用链路：**

```
./taurusdb configure
  │
  ├─ Cobra 路由 → configureCmd.RunE
  ├─ survey 弹出问卷 → 输入 AK / SK / Region / ProjectID
  └─ config.Save() → 写入 ~/.hwrds/config.yaml
```
