# M04: AK/SK 签名 — 怎么做

## 涉及文件
```
sdk/signer.go    — SignRequest 函数
```

## 签名流程
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

## 自动添加的 Header
- `X-Sdk-Date`: 当前 UTC 时间
- `Host`: API Endpoint
- `Content-Type`: application/json
