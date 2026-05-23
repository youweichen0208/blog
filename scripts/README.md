# 图片重命名脚本使用指南

## 快速开始

```bash
# 查看帮助
./scripts/rename-images.sh help

# 交互模式（推荐）
./scripts/rename-images.sh interactive ~/Downloads

# 自动模式
./scripts/rename-images.sh auto ~/Downloads

# 批量模式
./scripts/rename-images.sh batch ~/Downloads "desc1,desc2,desc3"
```

## 三种模式详解

### 1. 自动模式 (auto)

**适用场景**：快速重命名，不需要自定义描述

```bash
./scripts/rename-images.sh auto ~/Downloads
```

**效果**：
```
WeChat1234567890.png                   →  2024-01-13-screenshot-01.png
WeChat1234567891.png                   →  2024-01-13-screenshot-02.png
Screenshot 2024-01-13 at 10.30.45.png  →  2024-01-13-screenshot-03.png
IMG_1234.png                           →  2024-01-13-image-01.png
```

**特点**：
- ✅ 速度快，无需交互
- ✅ 自动按序号命名
- ❌ 文件名不够语义化

---

### 2. 交互模式 (interactive) ⭐ 推荐

**适用场景**：需要为每张图片指定有意义的描述

```bash
./scripts/rename-images.sh interactive ~/Downloads
```

**交互过程**：
```
=== 交互重命名模式 ===
目录: /Users/you/Downloads
日期: 2024-01-13
提示: 输入描述（英文或拼音），留空跳过，输入 'q' 退出

文件 1: WeChat1234567890.png
请输入描述: vuepress-homepage
✓ 重命名为: 2024-01-13-vuepress-homepage.png

文件 2: WeChat1234567891.png
请输入描述: config-file
✓ 重命名为: 2024-01-13-config-file.png

文件 3: WeChat1234567892.png
请输入描述:
⊘ 跳过

完成！
  重命名: 2 个
  跳过: 1 个
```

**特点**：
- ✅ 文件名语义化，易于管理
- ✅ 可以跳过不需要的文件
- ✅ 支持中途退出（输入 q）
- ⚠️ 需要手动输入每个描述

**描述命名建议**：
- 使用英文或拼音
- 用连字符分隔单词：`vuepress-setup`
- 简洁明了：`homepage`, `config`, `error-message`
- 避免特殊字符（脚本会自动清理）

---

### 3. 批量模式 (batch)

**适用场景**：已知所有图片的描述，一次性重命名

```bash
./scripts/rename-images.sh batch ~/Downloads "vuepress-setup,github-actions,deployment-success"
```

**效果**：
```
=== 批量重命名模式 ===
目录: /Users/you/Downloads
日期: 2024-01-13
文件数: 3
描述数: 3

✓ Screenshot 1.png → 2024-01-13-vuepress-setup.png
✓ Screenshot 2.png → 2024-01-13-github-actions.png
✓ Screenshot 3.png → 2024-01-13-deployment-success.png

完成！共重命名 3 个文件
```

**特点**：
- ✅ 快速批量处理
- ✅ 适合脚本化
- ⚠️ 需要提前准备描述列表
- ⚠️ 描述数量要匹配文件数量

**注意事项**：
- 描述用逗号分隔，不要有空格
- 如果文件数多于描述数，多余文件会被跳过
- 描述会自动转为小写并清理特殊字符

---

## 完整工作流示例

### 场景：为新文章准备截图

1. **截图保存到下载目录**
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

   依次输入：
   - `vuepress-homepage`
   - `config-file`
   - `deployment-success`

3. **创建目标目录（如果不存在）**
   ```bash
   mkdir -p docs/.vitepress/public/images/posts/$(date +%Y/%m)
   ```

4. **移动图片到博客目录**
   ```bash
   mv ~/Downloads/2024-01-13-*.png docs/.vitepress/public/images/posts/2024/01/
   ```

5. **在文章中引用**
   ```markdown
   ![VuePress 首页](/images/posts/2024/01/2024-01-13-vuepress-homepage.png)
   ![配置文件](/images/posts/2024/01/2024-01-13-config-file.png)
   ![部署成功](/images/posts/2024/01/2024-01-13-deployment-success.png)
   ```

---

## 支持的文件格式

脚本会自动识别以下格式的文件：

| 文件名模式 | 系统/来源 | 重命名后 |
|-----------|----------|---------|
| `WeChat*.png` | 微信截图 | `YYYY-MM-DD-screenshot-NN.png` |
| `企业微信截图*.png` | 企业微信 | `YYYY-MM-DD-screenshot-NN.png` |
| `Screenshot*.png` | macOS 截图 | `YYYY-MM-DD-screenshot-NN.png` |
| `截屏*.png` | macOS 中文 | `YYYY-MM-DD-screenshot-NN.png` |
| `屏幕截图*.png` | Windows | `YYYY-MM-DD-screenshot-NN.png` |
| `IMG_*.png/jpg` | 相机照片 | `YYYY-MM-DD-image-NN.png/jpg` |
| `image*.png/jpg` | 通用图片 | `YYYY-MM-DD-screenshot-NN.png/jpg` |

---

## 高级用法

### 一键重命名并移动

创建别名或函数简化操作：

```bash
# 添加到 ~/.zshrc 或 ~/.bashrc
blog-img() {
    cd ~/projects/blog
    ./scripts/rename-images.sh interactive ~/Downloads
    mkdir -p docs/.vitepress/public/images/posts/$(date +%Y/%m)
    mv ~/Downloads/$(date +%Y-%m-%d)-*.{png,jpg} docs/.vitepress/public/images/posts/$(date +%Y/%m)/ 2>/dev/null
    echo "图片已移动到: docs/.vitepress/public/images/posts/$(date +%Y/%m)/"
}
```

使用：
```bash
blog-img
```

### 批量处理多个目录

```bash
for dir in ~/Downloads ~/Desktop; do
    ./scripts/rename-images.sh auto "$dir"
done
```

### 预览模式（不实际重命名）

修改脚本，将 `mv` 改为 `echo`：

```bash
# 临时预览
sed 's/mv /echo mv /g' scripts/rename-images.sh > /tmp/preview.sh
bash /tmp/preview.sh interactive ~/Downloads
```

---

## 常见问题

### Q: 描述中可以用中文吗？

A: 不推荐。脚本会将非字母数字字符替换为连字符。建议使用：
- 英文：`vuepress-setup`
- 拼音：`shouye-jietp` (首页截图)

### Q: 如果输入错误怎么办？

A:
- **交互模式**：留空跳过，稍后手动重命名
- **批量模式**：重新运行脚本，已重命名的文件会被跳过

### Q: 文件名冲突怎么办？

A: 脚本会检测冲突并跳过，显示警告信息。你需要：
1. 手动重命名冲突文件
2. 或使用不同的描述

### Q: 可以重命名其他格式的图片吗？

A: 可以修改脚本的 `get_files()` 函数，添加更多文件模式：

```bash
-name "photo*.png" -o \
-name "pic*.jpg" -o \
```

### Q: 如何撤销重命名？

A: 脚本不支持撤销。建议：
1. 重命名前备份重要文件
2. 或使用 Git 版本控制

---

## 脚本特性

- ✅ 支持三种模式（auto/interactive/batch）
- ✅ 自动清理描述中的特殊字符
- ✅ 检测文件名冲突
- ✅ 彩色输出，易于阅读
- ✅ 支持中途退出（交互模式）
- ✅ 统计重命名和跳过的文件数
- ✅ 支持多种截图格式
- ✅ 跨平台（macOS/Linux）

---

## 获取帮助

```bash
./scripts/rename-images.sh help
```

更多信息请查看：[图片管理指南](../docs/IMAGE_GUIDE.md)
