# M04: AK/SK 签名 — 任务拆分

| 任务 ID | 任务描述 | 优先级 | 预估 | 依赖 |
|---|---|---|---|---|
| M04-T01 | 构造 CanonicalRequest | P0 | 2h | 无 |
| M04-T02 | 构造 StringToSign | P0 | 1h | T01 |
| M04-T03 | HMAC-SHA256 签名计算 | P0 | 1h | T02 |
| M04-T04 | 注入 Authorization + X-Sdk-Date + Host Header | P0 | 0.5h | T03 |
| M04-T05 | 支持 GET / POST / DELETE 三种方法签名 | P0 | 0.5h | T04 |
