#!/bin/bash
# 批量重命名截图文件
# 用法: ./rename-screenshots.sh [目标目录]

TARGET_DIR="${1:-.}"
DATE=$(date +%Y-%m-%d)
COUNTER=1

echo "开始处理目录: $TARGET_DIR"
echo "日期前缀: $DATE"
echo ""

# 处理 macOS 截图格式
for file in "$TARGET_DIR"/Screenshot*.png "$TARGET_DIR"/截屏*.png; do
  if [ -f "$file" ]; then
    NEW_NAME="${TARGET_DIR}/${DATE}-screenshot-$(printf "%02d" $COUNTER).png"
    mv "$file" "$NEW_NAME"
    echo "✓ 重命名: $(basename "$file") -> $(basename "$NEW_NAME")"
    COUNTER=$((COUNTER + 1))
  fi
done

# 处理 Windows 截图格式
for file in "$TARGET_DIR"/屏幕截图*.png; do
  if [ -f "$file" ]; then
    NEW_NAME="${TARGET_DIR}/${DATE}-screenshot-$(printf "%02d" $COUNTER).png"
    mv "$file" "$NEW_NAME"
    echo "✓ 重命名: $(basename "$file") -> $(basename "$NEW_NAME")"
    COUNTER=$((COUNTER + 1))
  fi
done

# 处理通用格式 IMG_xxxx.png
for file in "$TARGET_DIR"/IMG_*.png "$TARGET_DIR"/IMG_*.jpg; do
  if [ -f "$file" ]; then
    EXT="${file##*.}"
    NEW_NAME="${TARGET_DIR}/${DATE}-image-$(printf "%02d" $COUNTER).${EXT}"
    mv "$file" "$NEW_NAME"
    echo "✓ 重命名: $(basename "$file") -> $(basename "$NEW_NAME")"
    COUNTER=$((COUNTER + 1))
  fi
done

if [ $COUNTER -eq 1 ]; then
  echo "未找到需要重命名的文件"
else
  echo ""
  echo "完成！共重命名 $((COUNTER - 1)) 个文件"
fi
