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
            │   │   ├── 02/
            │   │   └── ...
            │   └── 2025/
            │       └── 01/
            └── common/         # 公共图片（logo、头像等）
```

## 图片命名规范

采用 **日期 + 描述** 的命名方式：

```
2024-01-13-vuepress-setup.png
2024-01-13-github-actions-config.png
2024-01-13-deployment-success.png
```

**优点**：
- ✅ 时间顺序清晰，便于按时间查找
- ✅ 描述性强，见名知意
- ✅ 避免重名冲突
- ✅ 配合年月目录结构，管理更清晰

**避免使用**：
- ❌ `WeChat1234567890.png`（微信截图默认名）
- ❌ `Screenshot 2024-01-13 at 10.30.45.png`（系统默认截图名）
- ❌ `IMG_1234.png`（相机默认名）
- ❌ `image1.png`（无意义名称）

## 目录组织方式

按 **年份/月份** 组织图片：

```
docs/.vuepress/public/images/posts/
├── 2024/
│   ├── 01/
│   │   ├── 2024-01-13-vuepress-setup.png
│   │   ├── 2024-01-13-github-actions.png
│   │   └── 2024-01-15-deployment.png
│   ├── 02/
│   │   └── 2024-02-01-new-feature.png
│   └── 12/
└── 2025/
    └── 01/
        └── 2025-01-10-year-summary.png
```

**优点**：
- 长期维护友好
- 图片按时间自然归档
- 避免单个目录文件过多

## 在 Markdown 中使用图片

### 基本用法

```markdown
![图片描述](/images/posts/2024/01/2024-01-13-vuepress-setup.png)
```

### 带标题

```markdown
![VuePress 配置](/images/posts/2024/01/2024-01-13-config.png "VuePress 配置文件")
```

### 控制尺寸

```markdown
<img src="/images/posts/2024/01/2024-01-13-large-image.png" alt="大图" width="600">
```

## 批量重命名工具

项目提供了 `scripts/rename-images.sh` 脚本，支持三种模式：

### 模式 1：自动模式（快速）

自动将截图重命名为 `日期-screenshot-序号.png`：

```bash
./scripts/rename-images.sh auto ~/Downloads
```

**结果**：
```
WeChat1234567890.png                   →  2024-01-13-screenshot-01.png
WeChat1234567891.png                   →  2024-01-13-screenshot-02.png
Screenshot 2024-01-13 at 10.30.45.png  →  2024-01-13-screenshot-03.png
IMG_1234.png                           →  2024-01-13-image-01.png
```

### 模式 2：交互模式（推荐）

逐个文件询问描述，生成有意义的文件名：

```bash
./scripts/rename-images.sh interactive ~/Downloads
```

**交互示例**：
```
文件: WeChat1234567890.png
请输入描述 (留空跳过): vuepress-setup
✓ 重命名为: 2024-01-13-vuepress-setup.png

文件: WeChat1234567891.png
请输入描述 (留空跳过): github-actions-config
✓ 重命名为: 2024-01-13-github-actions-config.png
```

### 模式 3：批量描述模式

一次性提供多个描述，按顺序重命名：

```bash
./scripts/rename-images.sh batch ~/Downloads "vuepress-setup,github-actions,deployment-success"
```

**结果**：
```
WeChat1234567890.png  →  2024-01-13-vuepress-setup.png
WeChat1234567891.png  →  2024-01-13-github-actions.png
WeChat1234567892.png  →  2024-01-13-deployment-success.png
```

### 移动到目标目录

重命名后，将图片移动到博客图片目录：

```bash
# 重命名
./scripts/rename-images.sh interactive ~/Downloads

# 移动到当前月份目录
mv ~/Downloads/2024-01-13-*.png docs/.vuepress/public/images/posts/2024/01/
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
- **WebP**：现代浏览器，体积更小（推荐）

### 3. 控制图片尺寸

- 博客宽度通常 800-1200px
- 截图建议宽度：800px 或 1000px
- 缩略图：200-400px
- 避免上传超大原图（如 4K 截图）

### 4. 使用图床（可选）

如果图片很多，可以使用图床服务：
- **GitHub Issues**（免费，适合小项目）
- **七牛云、阿里云 OSS**（国内访问快）
- **Cloudinary、Imgur**（国外服务）

## 完整工作流示例

### 场景：写一篇新文章并添加截图

1. **截图并保存到下载目录**
   ```
   ~/Downloads/WeChat1234567890.png
   ~/Downloads/WeChat1234567891.png
   ~/Downloads/WeChat1234567892.png
   ```

2. **使用交互模式重命名**
   ```bash
   cd ~/projects/blog
   ./scripts/rename-images.sh interactive ~/Downloads
   ```

   依次输入描述：
   - `vuepress-homepage`
   - `config-file`
   - `deployment-success`

3. **移动到博客目录**
   ```bash
   mv ~/Downloads/2024-01-13-*.png docs/.vuepress/public/images/posts/2024/01/
   ```

4. **在文章中引用**
   ```markdown
   ---
   title: VuePress 博客搭建
   date: 2024-01-13
   ---

   # VuePress 博客搭建

   ## 首页效果

   ![VuePress 首页](/images/posts/2024/01/2024-01-13-vuepress-homepage.png)

   ## 配置文件

   ![配置文件](/images/posts/2024/01/2024-01-13-config-file.png)

   ## 部署成功

   ![部署成功](/images/posts/2024/01/2024-01-13-deployment-success.png)
   ```

5. **提交到 Git**
   ```bash
   git add docs/.vuepress/public/images/posts/2024/01/
   git add docs/posts/your-article.md
   git commit -m "Add new article with images"
   git push
   ```

## 最佳实践

1. **及时重命名**：截图后立即重命名，避免积累
2. **描述要清晰**：使用英文或拼音，避免特殊字符
3. **定期清理**：删除未使用的图片
4. **压缩后上传**：减小仓库体积
5. **使用描述性 alt 文本**：有利于 SEO 和无障碍访问

## 常见问题

### Q: 图片路径写错了怎么办？

A: VuePress 开发模式会显示图片加载失败。检查：
- 路径是否以 `/images/` 开头
- 年月目录是否正确
- 文件名是否完全匹配（注意大小写）

### Q: 图片太大加载慢怎么办？

A:
1. 使用 TinyPNG 等工具压缩
2. 调整截图分辨率（不要用 Retina 原始尺寸）
3. 考虑使用 WebP 格式

### Q: 可以用中文命名吗？

A: 技术上可以，但不推荐：
- URL 编码后不美观
- 可能有兼容性问题
- 建议用拼音或英文

### Q: 需要每次都创建年月目录吗？

A: 是的，但可以用脚本自动创建：
```bash
mkdir -p docs/.vuepress/public/images/posts/$(date +%Y/%m)
```

## 快速参考

```bash
# 交互式重命名（推荐）
./scripts/rename-images.sh interactive ~/Downloads

# 自动重命名
./scripts/rename-images.sh auto ~/Downloads

# 批量重命名
./scripts/rename-images.sh batch ~/Downloads "desc1,desc2,desc3"

# 创建当月目录
mkdir -p docs/.vuepress/public/images/posts/$(date +%Y/%m)

# 移动图片
mv ~/Downloads/2024-01-13-*.png docs/.vuepress/public/images/posts/2024/01/
```

---

就这么简单！开始管理你的博客图片吧 📸
