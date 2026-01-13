# VuePress 个人博客

基于 VuePress 2.x 和 GitHub Actions 的个人博客项目。

## 项目结构

```
blog/
├── docs/                    # 文档目录
│   ├── .vuepress/          # VuePress 配置
│   │   └── config.js       # 站点配置文件
│   ├── posts/              # 博客文章目录
│   │   ├── README.md       # 文章列表页
│   │   └── hello-world.md  # 示例文章
│   └── README.md           # 首页
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions 部署配置
├── package.json
└── .gitignore
```

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run docs:dev
```

访问 http://localhost:8080 查看博客。

### 构建生产版本

```bash
npm run docs:build
```

构建后的文件将生成在 `docs/.vuepress/dist` 目录。

## 部署到 GitHub Pages

### 1. 创建 GitHub 仓库

在 GitHub 上创建一个新仓库（例如：`blog`）。

### 2. 推送代码到 GitHub

```bash
git remote add origin https://github.com/你的用户名/blog.git
git push -u origin main
```

### 3. 配置 GitHub Pages

1. 进入仓库的 Settings > Pages
2. 在 "Source" 下选择 "GitHub Actions"
3. 推送代码后，GitHub Actions 会自动构建并部署

### 4. 更新 base 配置（如果需要）

如果你的仓库名不是 `<username>.github.io`，需要在 `docs/.vuepress/config.js` 中设置 `base`：

```javascript
export default defineUserConfig({
  base: '/blog/',  // 替换为你的仓库名
  // ...其他配置
})
```

## 添加新文章

1. 在 `docs/posts/` 目录下创建新的 Markdown 文件
2. 添加 frontmatter 元数据：

```markdown
---
lang: zh-CN
title: 文章标题
description: 文章描述
date: 2024-01-13
---

# 文章标题

文章内容...
```

3. 在 `docs/posts/README.md` 中添加文章链接
4. 在 `docs/.vuepress/config.js` 的侧边栏配置中添加文章路径

## 自定义配置

编辑 `docs/.vuepress/config.js` 来自定义：

- 站点标题和描述
- 导航栏
- 侧边栏
- 主题配置
- 等等...

## 技术栈

- [VuePress 2.x](https://v2.vuepress.vuejs.org/zh/) - 静态站点生成器
- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [GitHub Actions](https://github.com/features/actions) - CI/CD 自动化部署

## License

MIT
