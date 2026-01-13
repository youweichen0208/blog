---
lang: zh-CN
title: Hello World
description: 我的第一篇博客文章
date: 2024-01-13
---

# Hello World

欢迎来到我的博客！这是我的第一篇文章。

## 关于这个博客

这个博客使用 VuePress 搭建，具有以下特点：

- 📝 使用 Markdown 编写文章
- 🎨 简洁美观的界面
- 🚀 快速的页面加载速度
- 📱 响应式设计，支持移动端

## 开始写作

你可以在 `docs/posts/` 目录下创建新的 Markdown 文件来发布新文章。

### 添加图片

图片应保存在 `docs/.vuepress/public/images/` 目录下，然后在文章中引用：

```markdown
![图片描述](/images/posts/your-folder/image-name.png)
```

**图片管理建议**：
- 按文章或日期组织图片目录
- 使用有意义的文件名（如：`2024-01-13-vuepress-config.png`）
- 避免使用系统默认的截图名称

详细指南请查看：[图片管理指南](/IMAGE_GUIDE.html)

### 代码示例

VuePress 支持代码高亮：

```javascript
function hello() {
  console.log('Hello, VuePress!')
}
```

```python
def hello():
    print("Hello, VuePress!")
```

## 下一步

- 自定义博客配置
- 添加更多文章
- 部署到 GitHub Pages

Happy blogging! 🎉
