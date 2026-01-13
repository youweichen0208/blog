# 图片管理指南

## 目录结构

```
docs/
└── .vuepress/
    └── public/
        └── images/
            ├── posts/          # 博客文章配图
            │   ├── 2024/       # 按年份分类
            │   │   ├── 01/     # 按月份分类
            │   │   └── 02/
            │   └── hello-world/  # 或按文章名分类
            └── common/         # 公共图片（logo、头像等）
```

## 图片命名规范

### 方案一：按日期 + 描述命名（推荐）

```
2024-01-13-vuepress-setup.png
2024-01-13-github-actions-config.png
2024-01-13-deployment-success.png
```

**优点**：
- 时间顺序清晰
- 描述性强，易于查找
- 避免重名

### 方案二：按文章 + 序号命名

```
hello-world-01.png
hello-world-02.png
hello-world-03.png
```

**优点**：
- 与文章关联明确
- 序号简洁

### 方案三：语义化命名

```
vuepress-homepage-screenshot.png
github-actions-workflow.png
blog-architecture-diagram.png
```

**优点**：
- 见名知意
- 便于复用

## 推荐的目录组织方式

### 方式一：按文章分类（推荐用于图片多的文章）

```
docs/.vuepress/public/images/posts/
├── hello-world/
│   ├── screenshot-01.png
│   ├── screenshot-02.png
│   └── diagram.png
├── vuepress-guide/
│   ├── setup-01.png
│   └── config-02.png
└── github-actions/
    └── workflow.png
```

### 方式二：按时间分类（推荐用于长期维护）

```
docs/.vuepress/public/images/posts/
├── 2024/
│   ├── 01/
│   │   ├── 2024-01-13-vuepress-setup.png
│   │   └── 2024-01-15-deployment.png
│   └── 02/
│       └── 2024-02-01-new-feature.png
└── 2025/
    └── 01/
```

## 在 Markdown 中使用图片

### 绝对路径（推荐）

```markdown
![图片描述](/images/posts/hello-world/screenshot-01.png)
![配置截图](/images/posts/2024/01/2024-01-13-config.png)
```

### 相对路径

```markdown
<!-- 如果图片和文章在同一目录 -->
![图片描述](./screenshot.png)
```

### 带标题和尺寸

```markdown
![VuePress 首页](/images/posts/hello-world/homepage.png "VuePress 首页截图")

<!-- HTML 方式，可控制尺寸 -->
<img src="/images/posts/hello-world/large-image.png" alt="大图" width="600">
```

## 图片优化建议

### 1. 压缩图片

使用工具压缩图片以提升加载速度：
- [TinyPNG](https://tinypng.com/) - 在线压缩
- [ImageOptim](https://imageoptim.com/) - Mac 应用
- [Squoosh](https://squoosh.app/) - Google 出品

### 2. 选择合适的格式

- **PNG**：截图、图标、需要透明背景
- **JPG**：照片、复杂图像
- **WebP**：现代浏览器，体积更小
- **SVG**：矢量图、图标

### 3. 控制图片尺寸

- 博客宽度通常 800-1200px
- 截图建议宽度：800px 或 1000px
- 缩略图：200-400px

### 4. 使用图床（可选）

如果图片很多，可以使用图床服务：
- GitHub Issues（免费）
- 七牛云、阿里云 OSS
- Cloudinary、Imgur

## 实用脚本

### 批量重命名截图

创建 `scripts/rename-images.sh`：

```bash
#!/bin/bash
# 将截图重命名为日期格式

DATE=$(date +%Y-%m-%d)
COUNTER=1

for file in Screenshot*.png; do
  if [ -f "$file" ]; then
    NEW_NAME="${DATE}-screenshot-$(printf "%02d" $COUNTER).png"
    mv "$file" "$NEW_NAME"
    echo "Renamed: $file -> $NEW_NAME"
    COUNTER=$((COUNTER + 1))
  fi
done
```

### 图片压缩脚本

```bash
#!/bin/bash
# 使用 ImageMagick 压缩图片

for img in *.png; do
  convert "$img" -quality 85 -resize 1000x "optimized-$img"
done
```

## 最佳实践

1. **统一命名规范**：团队协作时保持一致
2. **及时整理**：定期清理未使用的图片
3. **添加 .gitignore**：排除临时文件
4. **使用描述性 alt 文本**：有利于 SEO 和无障碍访问
5. **考虑 CDN**：大量图片时使用 CDN 加速

## 示例：完整的文章图片使用

```markdown
---
title: VuePress 博客搭建指南
date: 2024-01-13
---

# VuePress 博客搭建指南

## 安装配置

首先安装 VuePress：

![安装过程](/images/posts/vuepress-guide/2024-01-13-installation.png)

## 目录结构

项目结构如下：

![目录结构](/images/posts/vuepress-guide/2024-01-13-directory-structure.png)

## 配置文件

配置 `config.js`：

![配置文件](/images/posts/vuepress-guide/2024-01-13-config-file.png)
```

## 快速开始

1. 将截图保存到 `docs/.vuepress/public/images/posts/` 对应目录
2. 重命名为有意义的名称（如：`2024-01-13-description.png`）
3. 在 Markdown 中使用 `/images/posts/...` 路径引用
4. 提交到 Git 并推送

就这么简单！
