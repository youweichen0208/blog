# M04 · ak-sk-signer — AK/SK 签名

## 做什么

**一句话描述**：实现华为云 HWS-HMAC-SHA256 请求签名算法，让所有 API 请求通过认证。

> 注意：如果使用华为云官方 Go SDK（`huaweicloud-sdk-go-v3`），可跳过此模块，SDK 内部处理签名。此模块仅在自行封装 `net/http` 时需要。

---

## 怎么做

**涉及文件**
```
sdk/signer.go    — SignRequest 函数
```

**签名流程**
```
1. 构造 CanonicalRequest
   = Method + \n + URI + \n + QueryString + \n + CanonicalHeaders + \n + SignedHeaders + \n + BodyHash

2. 构造 StringToSign
   = "SDK-HMAC-SHA256" + \n + Timestamp + \n + SHA256(CanonicalRequest)

3. 计算签名
   = HMAC-SHA256(SK, StringToSign)

4. 注入 Header
   Authorization: SDK-HMAC-SHA256 Access={AK}, SignedHeaders={...}, Signature={...}
```

**自动添加的 Header**
- `X-Sdk-Date`: 当前 UTC 时间
- `Host`: API Endpoint
- `Content-Type`: application/json

---

## 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M04-T01 | 构造 CanonicalRequest | P0 | 2h | 无 |
| M04-T02 | 构造 StringToSign | P0 | 1h | T01 |
| M04-T03 | HMAC-SHA256 签名计算 | P0 | 1h | T02 |
| M04-T04 | 注入 Authorization + X-Sdk-Date + Host Header | P0 | 0.5h | T03 |
| M04-T05 | 支持 GET / POST / DELETE 三种方法签名 | P0 | 0.5h | T04 |

---

## 验收用例

| 用例 ID | 测试场景 | 输入 | 期望输出 | 类型 |
|---|---|---|---|---|
| M04-TC01 | GET 签名正确 | GET /v3/{project}/flavors | 华为云 API 返回 200 | 集成测试 |
| M04-TC02 | POST 签名正确 | POST /v3/{project}/instances + body | 华为云 API 返回 200 | 集成测试 |
| M04-TC03 | 带 Query 参数签名 | GET ?database_name=MySQL | 签名包含排序后的 Query | 单元测试 |
