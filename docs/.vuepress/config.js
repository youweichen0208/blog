import { viteBundler } from '@vuepress/bundler-vite'
import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress'

export default defineUserConfig({
  lang: 'zh-CN',
  title: '我的博客',
  description: '基于 VuePress 的个人博客',

  // 配置打包工具
  bundler: viteBundler(),

  // 配置主题
  theme: defaultTheme({
    // 导航栏
    navbar: [
      {
        text: '首页',
        link: '/',
      },
      {
        text: '博客',
        link: '/posts/',
      },
      {
        text: '技术教程',
        link: '/tutorials/',
      },
      {
        text: 'GitHub',
        link: 'https://github.com',
      },
    ],

    // 侧边栏
    sidebar: {
      '/posts/': [
        {
          text: '博客文章',
          children: [
            '/posts/hello-world.md',
          ],
        },
      ],
      '/tutorials/': [
        {
          text: '技术教程',
          children: [
            '/tutorials/build-vpn.md',
          ],
        },
      ],
    },
  }),

  // 设置 base，如果部署到 GitHub Pages，需要设置为仓库名
  base: '/blog/',
})
