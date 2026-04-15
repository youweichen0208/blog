# Taurus 数据面 MCP Server 专栏

这里记录 TaurusDB 数据面 MCP Server 的设计与实现过程，核心关注点不再是“云资源运维操作”，而是“让 AI 在安全边界内通过自然语言完成数据库查询与 SQL 执行”。

这个专题重点回答 3 个问题：

- 为什么 TaurusDB 的 MCP 更应该先做数据面，而不是继续堆管控面工具
- 如何把自然语言请求稳定收敛成 schema 感知、可审计、可回放的 SQL 执行链路
- 如何在“能查、能跑 SQL”和“默认安全”之间建立可落地的产品边界

## 文章导航

- [华为云 TaurusDB 数据面 MCP Server — 需求背景与概要设计](./requirements)
- [华为云 TaurusDB 数据面 MCP Server — 架构与方案设计](./taurusdb-architecture)
