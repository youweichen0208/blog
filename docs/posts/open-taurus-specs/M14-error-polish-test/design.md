# M14: 错误处理 + 体验打磨 + 测试 — 怎么做

## 错误码映射表（sdk/errors.go）

| 华为云错误码 | 翻译 | 建议 |
|---|---|---|
| APIGW.0301 | AK/SK 认证失败 | 运行 hwrds configure 重新配置 |
| DBS.200001 | 资源不存在 | 运行 hwrds instance list 查看 |
| DBS.200019 | 规格不存在 | 运行 hwrds flavor list 查看 |
| DBS.200040 | 配额超限 | 联系华为云提升配额 |
| DBS.200108 | 密码不合规 | 需包含大小写+数字，≥8位 |
| 网络超时 | 请求超时 | 检查网络后重试 |
| 429 | 请求频繁 | 已自动重试 |

## CI 流水线（.github/workflows/ci.yml）
```
Push / PR → Lint → Test → Coverage → Build
Tag push  → goreleaser → 5 平台二进制 → GitHub Release
```

## Mock 策略
- 定义 SDK 接口 `RdsClientInterface`
- 测试时注入 MockClient
- Service 层测试不依赖真实 API
