# M03 · sdk-client — SDK HTTP 客户端

## 做什么

**一句话描述**：封装华为云 HTTP 客户端，统一处理签名、超时、重试，上层 Service 无需关心 HTTP 细节。

**用户故事**
> 作为开发者，我希望 Service 层只需要调用 `client.ListFlavors("MySQL")` 就能拿到结果，不需要关心签名、重试、错误解析等底层细节。

**业务规则**
- 统一超时 30s
- 自动重试最多 3 次（指数退避 1s → 2s → 4s）
- 非 2xx 响应统一解析为结构化错误
- Endpoint 根据 Region 自动拼接

---

## 怎么做

**涉及文件**
```
sdk/client.go    — RdsClient 结构体 + HTTP 请求方法
sdk/signer.go    — AK/SK 签名（M04）
sdk/rds.go       — RDS API 请求/响应定义
sdk/errors.go    — 错误码解析（M14 完善）
```

**核心接口**
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

**重试策略**
```
请求失败
  ├─ 状态码 429 / 503 → 重试（指数退避）
  ├─ 网络超时           → 重试
  ├─ 状态码 4xx（非429）→ 不重试，直接报错
  └─ 重试 3 次仍失败    → 返回最后一次的错误
```

**依赖关系**
- 依赖 M02（config/store.go）读取认证信息
- 依赖 M04（signer.go）签名
- 被所有 Service 调用

---

## 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M03-T01 | 定义 RdsClient 结构体 + NewRdsClient 工厂方法 | P0 | 1h | M02 |
| M03-T02 | 实现 Endpoint 自动拼接 | P0 | 0.5h | T01 |
| M03-T03 | 实现 Get / Post / Delete 方法（含签名调用） | P0 | 2h | T01, M04 |
| M03-T04 | 实现自动重试（指数退避，最多 3 次） | P1 | 2h | T03 |
| M03-T05 | 实现响应错误统一解析 | P0 | 1h | T03 |

---

## 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M03-TC01 | 正常请求 | 正确 AK/SK + GET flavors | 200 OK，返回 JSON | 集成测试 |
| M03-TC02 | 认证失败 | 错误 AK/SK | 错误: `AK/SK 认证失败` | 单元测试(Mock) |
| M03-TC03 | 网络超时 | Mock 30s 无响应 | 错误: `请求超时` | 单元测试(Mock) |
| M03-TC04 | 限流重试 | Mock 前 2 次 429，第 3 次 200 | 成功返回，日志显示重试 2 次 | 单元测试(Mock) |
