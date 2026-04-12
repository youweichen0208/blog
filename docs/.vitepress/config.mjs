import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const aiDevSidebar = [
  {
    text: 'MCP 协议',
    items: [
      { text: '概述', link: '/mcp/' },
      { text: '快速入门', link: '/mcp/getting-started' },
      { text: '传输协议详解', link: '/mcp/transport' },
      { text: 'Claude 配置', link: '/mcp/claude-config' },
      { text: '构建 MCP 服务器', link: '/mcp/build-server' },
      { text: '运维实战', link: '/mcp/devops-practice' },
    ],
  },
  {
    text: 'CLI 开发',
    items: [
      { text: '概述', link: '/cli/' },
    ],
  },
  {
    text: 'Agent 开发',
    items: [
      { text: '概述', link: '/agent/' },
    ],
  },
]

export default withMermaid(defineConfig({
  lang: 'zh-CN',
  title: '我的博客',
  description: '基于 VitePress 的个人博客',
  base: '/blog/',

  themeConfig: {
    // 导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: '博客', link: '/posts/' },
      { text: '技术教程', link: '/tutorials/' },
      { text: 'AIOps 专栏', link: '/aiops/' },
      { text: '数据结构', link: '/data-structures/' },
      { text: 'Go 语言', link: '/go/' },
      {
        text: 'AI 开发',
        items: [
          { text: 'MCP 协议', link: '/mcp/' },
          { text: 'CLI 开发', link: '/cli/' },
          { text: 'Agent 开发', link: '/agent/' },
        ],
      },
      { text: '项目实战', link: '/projects/' },
      { text: 'GitHub', link: 'https://github.com' },
    ],

    // 侧边栏
    sidebar: {
      '/posts/': [
        {
          text: '博客文章',
          items: [
            { text: 'Hello World', link: '/posts/hello-world' },
          ],
        },
      ],
      '/tutorials/': [
        {
          text: '技术教程',
          items: [
            { text: 'VPN 搭建教程', link: '/tutorials/build-vpn' },
            { text: 'Jenkins CI/CD 实战', link: '/tutorials/jenkins-cicd' },
          ],
        },
      ],
      '/aiops/': [
        {
          text: 'AIOps 专栏',
          items: [
            { text: '概述', link: '/aiops/' },
            { text: '智能体 Coze', link: '/aiops/coze' },
            { text: 'RAG 实战指南', link: '/aiops/rag' },
            { text: 'Prometheus + Grafana 监控', link: '/aiops/prometheus' },
          ],
        },
      ],
      '/data-structures/': [
        {
          text: '数据结构',
          items: [
            { text: '概述', link: '/data-structures/' },
            { text: '递归详解', link: '/data-structures/recursion' },
            { text: '链表', link: '/data-structures/linked-list' },
          ],
        },
      ],
      '/go/': [
        {
          text: 'Go 语言',
          items: [
            { text: '简介', link: '/go/' },
            { text: '指针详解', link: '/go/pointer' },
            { text: '函数', link: '/go/func' },
            { text: '结构体', link: '/go/struct' },
            { text: '接口', link: '/go/interface' },
            { text: '错误处理', link: '/go/error' },
            { text: 'Goroutine', link: '/go/goroutine' },
            { text: 'Channel', link: '/go/channel' },
          ],
        },
      ],
      '/mcp/': aiDevSidebar,
      '/cli/': aiDevSidebar,
      '/agent/': aiDevSidebar,
      '/projects/': [
        {
          text: '项目实战',
          items: [
            { text: '概述', link: '/projects/' },
            {
              text: 'OpenTaurus 专栏',
              items: [
                { text: '专栏概述', link: '/projects/opentaurus/' },
                { text: '架构设计', link: '/projects/opentaurus/architecture' },
                { text: '需求设计', link: '/projects/opentaurus/requirements' },
                { text: '项目随记', link: '/projects/opentaurus/notes' },
                { text: '如何获取 AK/SK', link: '/projects/opentaurus/aksk' },
              ],
            },
          ],
        },
      ],
    '/open-taurus/': [
        {
          text: 'Open Taurus — HWRDS CLI',
          items: [
            { text: '专栏概述', link: '/open-taurus/' },
            { text: 'M01 · configure 配置命令', link: '/open-taurus/m01-configure' },
            { text: 'M02 · config-store 配置存储', link: '/open-taurus/m02-config-store' },
            { text: 'M03 · sdk-client HTTP 客户端', link: '/open-taurus/m03-sdk-client' },
            { text: 'M04 · ak-sk-signer 签名模块', link: '/open-taurus/m04-ak-sk-signer' },
            { text: 'M05 · flavor-list 规格查询', link: '/open-taurus/m05-flavor-list' },
            { text: 'M06 · formatter 格式化输出', link: '/open-taurus/m06-formatter' },
            { text: 'M07 · color 彩色输出', link: '/open-taurus/m07-color' },
            { text: 'M08 · instance-create 创建实例', link: '/open-taurus/m08-instance-create' },
            { text: 'M09 · waiter 等待机制', link: '/open-taurus/m09-waiter' },
            { text: 'M10 · instance-list 列出实例', link: '/open-taurus/m10-instance-list' },
            { text: 'M11 · instance-show 查看详情', link: '/open-taurus/m11-instance-show' },
            { text: 'M12 · instance-delete 删除实例', link: '/open-taurus/m12-instance-delete' },
            { text: 'M13 · instance-restart 重启实例', link: '/open-taurus/m13-instance-restart' },
            { text: 'M14 · error-polish-test 收尾', link: '/open-taurus/m14-error-polish-test' },
          ],
        },
      ],
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],
  },
}))
