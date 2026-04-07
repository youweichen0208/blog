# Go 错误处理（Error）完全教程

## 1. error 是一个接口

Go 的错误处理不用 try-catch，而是把 error 作为返回值显式处理。

```go
// error 接口的定义（标准库）
type error interface {
    Error() string
}

// 最简单的用法
result, err := doSomething()
if err != nil {
    // 处理错误
}
```

这就是 Go 错误处理的全部核心——返回 error，检查 error。

---

## 2. 创建错误

### 2.1 errors.New

```go
import "errors"

func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("除以零")
    }
    return a / b, nil
}

result, err := divide(10, 0)
if err != nil {
    fmt.Println("错误:", err)  // 错误: 除以零
}
```

### 2.2 fmt.Errorf（格式化错误信息）

```go
func getUser(id int) (*User, error) {
    if id <= 0 {
        return nil, fmt.Errorf("无效的用户 ID: %d", id)
    }
    // ...
    return nil, fmt.Errorf("用户 %d 不存在", id)
}
```

### 2.3 自定义错误类型

```go
// 实现 error 接口
type NotFoundError struct {
    Resource string
    ID       int
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s (ID: %d) 不存在", e.Resource, e.ID)
}

func getUser(id int) (*User, error) {
    // ...
    return nil, &NotFoundError{Resource: "用户", ID: id}
}

// 使用时可以类型断言获取详细信息
err := getUser(42)
if nfe, ok := err.(*NotFoundError); ok {
    fmt.Println("找不到:", nfe.Resource, nfe.ID)
}
```

### 2.4 带状态码的错误

```go
type HTTPError struct {
    Code    int
    Message string
}

func (e *HTTPError) Error() string {
    return fmt.Sprintf("HTTP %d: %s", e.Code, e.Message)
}

func fetchData(url string) ([]byte, error) {
    // ...
    return nil, &HTTPError{Code: 404, Message: "Not Found"}
}
```

---

## 3. 错误包装（Error Wrapping）

Go 1.13 引入了错误包装机制，可以在传递错误时添加上下文信息。

### 3.1 用 `%w` 包装错误

```go
func readConfig(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("读取配置文件失败: %w", err)
    }
    return data, nil
}

func initApp() error {
    data, err := readConfig("/etc/app/config.json")
    if err != nil {
        return fmt.Errorf("初始化应用失败: %w", err)
    }
    // ...
    return nil
}

// 错误链：初始化应用失败: 读取配置文件失败: open /etc/app/config.json: no such file or directory
```

### 3.2 errors.Is（判断错误链中是否包含某个错误）

```go
var ErrNotFound = errors.New("not found")
var ErrPermission = errors.New("permission denied")

func getFile(path string) error {
    return fmt.Errorf("获取文件失败: %w", ErrNotFound)
}

err := getFile("/secret")
if errors.Is(err, ErrNotFound) {
    fmt.Println("文件不存在")  //  命中
}
if errors.Is(err, ErrPermission) {
    fmt.Println("权限不足")  // 不命中
}
```

### 3.3 errors.As（从错误链中提取特定类型）

```go
func process() error {
    return fmt.Errorf("处理失败: %w", &NotFoundError{Resource: "用户", ID: 42})
}

err := process()
var nfe *NotFoundError
if errors.As(err, &nfe) {
    fmt.Println(nfe.Resource) // "用户"
    fmt.Println(nfe.ID)       // 42
}
```

### 3.4 errors.Unwrap

```go
wrappedErr := fmt.Errorf("外层: %w", errors.New("内层错误"))
inner := errors.Unwrap(wrappedErr)
fmt.Println(inner)  // "内层错误"
```

---

## 4. 哨兵错误（Sentinel Errors）

预定义的错误值，用于判断特定的错误条件。

```go
// 标准库中的哨兵错误
import "io"
if err == io.EOF {
    fmt.Println("读到文件末尾")
}

// 自定义哨兵错误
var (
    ErrUserNotFound  = errors.New("user not found")
    ErrAlreadyExists = errors.New("already exists")
    ErrUnauthorized  = errors.New("unauthorized")
)

func getUser(id int) (*User, error) {
    // ...
    return nil, ErrUserNotFound
}

err := getUser(42)
if errors.Is(err, ErrUserNotFound) {
    // 处理用户不存在
}
```

---

## 5. 错误处理模式

### 5.1 提前返回（最常用）

```go
func processOrder(orderID int) error {
    order, err := getOrder(orderID)
    if err != nil {
        return fmt.Errorf("获取订单失败: %w", err)
    }

    user, err := getUser(order.UserID)
    if err != nil {
        return fmt.Errorf("获取用户失败: %w", err)
    }

    err = validateOrder(order, user)
    if err != nil {
        return fmt.Errorf("订单校验失败: %w", err)
    }

    err = chargeUser(user, order.Amount)
    if err != nil {
        return fmt.Errorf("扣款失败: %w", err)
    }

    return nil
}
```

### 5.2 错误类型分支处理

```go
func handleError(err error) {
    var httpErr *HTTPError
    var notFound *NotFoundError

    switch {
    case errors.As(err, &httpErr):
        if httpErr.Code == 404 {
            fmt.Println("资源不存在")
        } else if httpErr.Code >= 500 {
            fmt.Println("服务器错误，请重试")
        }
    case errors.As(err, &notFound):
        fmt.Printf("%s 不存在\n", notFound.Resource)
    case errors.Is(err, ErrUnauthorized):
        fmt.Println("请先登录")
    default:
        fmt.Println("未知错误:", err)
    }
}
```

### 5.3 重试模式

```go
func withRetry(fn func() error, maxRetries int) error {
    var lastErr error
    for i := 0; i < maxRetries; i++ {
        err := fn()
        if err == nil {
            return nil
        }
        lastErr = err
        time.Sleep(time.Duration(i+1) * time.Second)  // 递增退避
        fmt.Printf("第 %d 次重试...\n", i+1)
    }
    return fmt.Errorf("重试 %d 次后仍然失败: %w", maxRetries, lastErr)
}

err := withRetry(func() error {
    return callExternalAPI()
}, 3)
```

### 5.4 多错误收集

```go
func validateUser(u User) error {
    var errs []error

    if u.Name == "" {
        errs = append(errs, errors.New("名字不能为空"))
    }
    if u.Age < 0 {
        errs = append(errs, errors.New("年龄不能为负数"))
    }
    if u.Email == "" {
        errs = append(errs, errors.New("邮箱不能为空"))
    }

    // Go 1.20+ 可以用 errors.Join
    return errors.Join(errs...)
}

err := validateUser(User{})
fmt.Println(err)
// 名字不能为空
// 年龄不能为负数
// 邮箱不能为空
```

---

## 6. panic 和 recover

`panic` 是 Go 的异常机制，但**只用于真正不可恢复的错误**。

### 6.1 panic

```go
// panic 会中断当前函数，逐层向上传播，最终终止程序
func mustGetEnv(key string) string {
    val := os.Getenv(key)
    if val == "" {
        panic(fmt.Sprintf("缺少必要的环境变量: %s", key))
    }
    return val
}

// 常见的 panic 场景
// - 程序初始化时缺少必要配置
// - 明确不应该发生的逻辑错误（程序 bug）
// - 标准库中以 Must 开头的函数
template.Must(template.New("t").Parse("{{.Name}}"))
regexp.MustCompile(`\d+`)
```

### 6.2 recover

```go
// recover 只能在 defer 中调用，用于捕获 panic
func safeDiv(a, b int) (result int, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("recovered: %v", r)
        }
    }()
    return a / b, nil  // 如果 b == 0 会 panic
}

result, err := safeDiv(10, 0)
if err != nil {
    fmt.Println(err)  // "recovered: runtime error: integer divide by zero"
}
```

### 6.3 在 HTTP 服务中用 recover

```go
func recoveryMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                log.Printf("panic: %v\n%s", err, debug.Stack())
                http.Error(w, "Internal Server Error", 500)
            }
        }()
        next.ServeHTTP(w, r)
    })
}
```

---

## 7. error vs panic 的选择

|          | error                          | panic                            |
| -------- | ------------------------------ | -------------------------------- |
| 使用场景 | 可预期的错误                   | 不可恢复的严重错误               |
| 示例     | 文件不存在、网络超时、输入无效 | 数组越界、nil 解引用、初始化失败 |
| 处理方式 | `if err != nil`                | `defer + recover`                |
| 频率     | 99% 的情况                     | 极少数情况                       |

**经验法则**：如果调用者可以合理地处理这个错误，用 `error`。如果这个错误意味着程序有 bug，用 `panic`。

---

## 8. 实战：完整的错误处理示例

```go
// 定义领域错误
var (
    ErrUserNotFound = errors.New("user not found")
    ErrInvalidInput = errors.New("invalid input")
)

type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("字段 %s: %s", e.Field, e.Message)
}

// Repository 层
func (r *UserRepo) FindByID(id int) (*User, error) {
    user, err := r.db.Query("SELECT * FROM users WHERE id = ?", id)
    if err != nil {
        return nil, fmt.Errorf("查询用户失败: %w", err)
    }
    if user == nil {
        return nil, ErrUserNotFound
    }
    return user, nil
}

// Service 层
func (s *UserService) GetUser(id int) (*User, error) {
    if id <= 0 {
        return nil, &ValidationError{Field: "id", Message: "必须大于 0"}
    }

    user, err := s.repo.FindByID(id)
    if err != nil {
        return nil, fmt.Errorf("获取用户服务失败: %w", err)
    }
    return user, nil
}

// Handler 层
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.Atoi(r.URL.Query().Get("id"))

    user, err := h.service.GetUser(id)
    if err != nil {
        var valErr *ValidationError
        switch {
        case errors.As(err, &valErr):
            http.Error(w, valErr.Error(), 400)
        case errors.Is(err, ErrUserNotFound):
            http.Error(w, "用户不存在", 404)
        default:
            log.Printf("内部错误: %v", err)
            http.Error(w, "服务器内部错误", 500)
        }
        return
    }

    json.NewEncoder(w).Encode(user)
}
```

---

## 9. 最佳实践

- **永远检查 error**，不要用 `_` 忽略（除非你真的确定不需要）。
- **添加上下文信息**：用 `fmt.Errorf("做某事失败: %w", err)` 包装错误。
- **在最外层处理错误**：底层返回，中间层包装，最外层（如 HTTP handler）决定怎么响应。
- **用 `errors.Is` 和 `errors.As`**，不要用 `==` 或类型断言（它们不支持包装链）。
- **哨兵错误用 `var Err...`**，自定义错误类型用 `type ...Error struct{}`。
- **不要 panic 普通错误**，panic 只用于真正的程序 bug。
- **错误信息小写开头、不加句号**：`fmt.Errorf("open file: %w", err)` 而不是 `"Open file failed."`。
- **日志记录一次就够**：不要在每一层都打日志，容易重复。在最外层统一记录。
