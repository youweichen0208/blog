# M04: AK/SK 签名 — 做什么

## 一句话描述
实现华为云 HWS-HMAC-SHA256 请求签名算法，让所有 API 请求通过认证。

> 注意：如果使用华为云官方 Go SDK（`huaweicloud-sdk-go-v3`），可跳过此模块，SDK 内部处理签名。此模块仅在自行封装 `net/http` 时需要。
