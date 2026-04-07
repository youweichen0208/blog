import { defineConfig } from 'vitepress'

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

export default defineConfig({
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
            { text: 'CLI + Agent 项目', link: '/projects/cli-agent/' },
          ],
        },
      ],
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],
  },
})
