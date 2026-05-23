#!/bin/bash

# 自动整理图片脚本
# 将 inbox 目录中的图片移动到 YYYY/MM 目录并按时间重命名

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INBOX_DIR="$PROJECT_ROOT/docs/.vitepress/public/images/posts/inbox"
PUBLIC_IMAGES_DIR="$PROJECT_ROOT/docs/.vitepress/public/images/posts"

# 获取当前日期
YEAR=$(date +%Y)
MONTH=$(date +%m)
DATE_PREFIX=$(date +%Y-%m-%d)

# 目标目录
TARGET_DIR="$PUBLIC_IMAGES_DIR/$YEAR/$MONTH"

# 创建目标目录
mkdir -p "$TARGET_DIR"

# 检查 inbox 目录是否存在
if [ ! -d "$INBOX_DIR" ]; then
  echo "inbox 目录不存在，跳过图片整理"
  exit 0
fi

# 统计图片数量
IMAGE_COUNT=$(find "$INBOX_DIR" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.webp" -o -name "*.svg" \) | wc -l | tr -d ' ')

if [ "$IMAGE_COUNT" -eq 0 ]; then
  echo "inbox 目录中没有图片，跳过"
  exit 0
fi

echo "=== 自动整理图片 ==="
echo "发现 $IMAGE_COUNT 个图片需要整理"

# 处理每个图片
for img in "$INBOX_DIR"/*.{png,jpg,jpeg,gif,webp,svg} 2>/dev/null; do
  if [ ! -f "$img" ]; then
    continue
  fi

  # 获取原始文件名和扩展名
  original_name=$(basename "$img")
  ext="${original_name##*.}"

  # 生成新文件名：YYYY-MM-DD-HHMMSS.ext
  timestamp=$(date +%H%M%S)
  new_name="${DATE_PREFIX}-${timestamp}.${ext}"

  # 如果同一秒有多个文件，添加序号
  counter=1
  while [ -f "$TARGET_DIR/$new_name" ]; do
    new_name="${DATE_PREFIX}-${timestamp}-${counter}.${ext}"
    counter=$((counter + 1))
  done

  # 移动文件
  mv "$img" "$TARGET_DIR/$new_name"
  echo "✓ $original_name → $YEAR/$MONTH/$new_name"
done

echo ""
echo "图片已移动到: docs/.vitepress/public/images/posts/$YEAR/$MONTH/"
echo "=== 整理完成 ==="