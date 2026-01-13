# 图片管理

这个目录用于存放博客中使用的所有图片。

## 目录说明

- `posts/` - 博客文章配图
  - 可以按文章名创建子目录，如 `posts/hello-world/`
  - 或按时间创建子目录，如 `posts/2024/01/`
- `common/` - 公共图片（logo、头像、图标等）

## 使用方法

在 Markdown 文章中使用图片：

```markdown
![图片描述](/images/posts/your-folder/image-name.png)
```

## 命名建议

推荐使用有意义的名称，例如：
- `2024-01-13-vuepress-setup.png`
- `github-actions-workflow.png`
- `homepage-screenshot.png`

避免使用：
- `Screenshot 2024-01-13 at 10.30.45.png`
- `IMG_1234.png`
- `image1.png`

详细的图片管理指南请查看：[IMAGE_GUIDE.md](../../IMAGE_GUIDE.md)
