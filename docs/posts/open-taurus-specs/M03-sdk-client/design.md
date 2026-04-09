# M03: SDK 客户端 — 怎么做

## 涉及文件
```
sdk/client.go    — RdsClient 结构体 + HTTP 请求方法
sdk/signer.go    — AK/SK 签名（M04）
sdk/rds.go       — RDS API 请求/响应定义
sdk/errors.go    — 错误码解析（M14 完善）
```

## 核心接口
```go
type RdsClient struct {
    endpoint   string
    ak, sk     string
    projectID  string
    httpClient *http.Client
}

func NewRdsClient(profile string) (*RdsClient, error)
func (c *RdsClient) Get(path string) ([]byte, error)
func (c *RdsClient) Post(path string, body interface{}) ([]byte, error)
func (c *RdsClient) Delete(path string) error
```

## 重试策略
```
请求失败
  ├─ 状态码 429 / 503 → 重试（指数退避）
  ├─ 网络超时           → 重试
  ├─ 状态码 4xx（非429）→ 不重试，直接报错
  └─ 重试 3 次仍失败    → 返回最后一次的错误
```

## 依赖关系
- 依赖 M02（config/store.go）读取认证信息
- 依赖 M04（signer.go）签名
- 被所有 Service 调用
