import { defineConfig } from 'vitepress'

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
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],
  },
})
