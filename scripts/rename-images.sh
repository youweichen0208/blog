#!/bin/bash
# 图片批量重命名工具 - 支持方案一（日期+描述）
# 用法: ./rename-images.sh [模式] [目标目录] [可选参数]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    cat << EOF
${BLUE}图片批量重命名工具${NC}

${YELLOW}用法:${NC}
  $0 <模式> [目标目录] [可选参数]

${YELLOW}模式:${NC}
  ${GREEN}auto${NC}         自动模式 - 快速重命名为 日期-screenshot-序号.png
  ${GREEN}interactive${NC}  交互模式 - 逐个询问描述（推荐）
  ${GREEN}batch${NC}        批量模式 - 一次性提供多个描述

${YELLOW}示例:${NC}
  # 自动模式
  $0 auto ~/Downloads

  # 交互模式（推荐）
  $0 interactive ~/Downloads

  # 批量模式
  $0 batch ~/Downloads "vuepress-setup,github-actions,deployment"

${YELLOW}支持的文件格式:${NC}
  - Screenshot*.png (macOS 截图)
  - 截屏*.png (macOS 中文)
  - 屏幕截图*.png (Windows)
  - IMG_*.png, IMG_*.jpg (相机照片)
  - image*.png (通用图片)

${YELLOW}命名规范:${NC}
  格式: YYYY-MM-DD-描述.扩展名
  示例: 2024-01-13-vuepress-setup.png

EOF
}

# 检查参数
if [ $# -lt 1 ]; then
    show_help
    exit 1
fi

MODE="$1"
TARGET_DIR="${2:-.}"
DATE=$(date +%Y-%m-%d)

# 验证目录
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}错误: 目录不存在: $TARGET_DIR${NC}"
    exit 1
fi

# 获取所有需要重命名的文件
get_files() {
    local dir="$1"
    find "$dir" -maxdepth 1 \( \
        -name "Screenshot*.png" -o \
        -name "截屏*.png" -o \
        -name "屏幕截图*.png" -o \
        -name "IMG_*.png" -o \
        -name "IMG_*.jpg" -o \
        -name "IMG_*.jpeg" -o \
        -name "image*.png" -o \
        -name "image*.jpg" \
    \) -type f 2>/dev/null | sort
}

# 模式1: 自动模式
auto_mode() {
    local counter=1
    local renamed=0

    echo -e "${BLUE}=== 自动重命名模式 ===${NC}"
    echo -e "目录: ${YELLOW}$TARGET_DIR${NC}"
    echo -e "日期: ${YELLOW}$DATE${NC}"
    echo ""

    while IFS= read -r file; do
        if [ -f "$file" ]; then
            local ext="${file##*.}"
            local basename=$(basename "$file")
            local dirname=$(dirname "$file")

            # 判断文件类型
            if [[ "$basename" =~ ^IMG_ ]]; then
                local new_name="${dirname}/${DATE}-image-$(printf "%02d" $counter).${ext}"
            else
                local new_name="${dirname}/${DATE}-screenshot-$(printf "%02d" $counter).${ext}"
            fi

            mv "$file" "$new_name"
            echo -e "${GREEN}✓${NC} $(basename "$file") → $(basename "$new_name")"
            counter=$((counter + 1))
            renamed=$((renamed + 1))
        fi
    done < <(get_files "$TARGET_DIR")

    if [ $renamed -eq 0 ]; then
        echo -e "${YELLOW}未找到需要重命名的文件${NC}"
    else
        echo ""
        echo -e "${GREEN}完成！共重命名 $renamed 个文件${NC}"
    fi
}

# 模式2: 交互模式
interactive_mode() {
    local counter=1
    local renamed=0
    local skipped=0

    echo -e "${BLUE}=== 交互重命名模式 ===${NC}"
    echo -e "目录: ${YELLOW}$TARGET_DIR${NC}"
    echo -e "日期: ${YELLOW}$DATE${NC}"
    echo -e "${YELLOW}提示: 输入描述（英文或拼音），留空跳过，输入 'q' 退出${NC}"
    echo ""

    while IFS= read -r file; do
        if [ -f "$file" ]; then
            local ext="${file##*.}"
            local basename=$(basename "$file")
            local dirname=$(dirname "$file")

            echo -e "${BLUE}文件 $counter:${NC} $basename"
            read -p "请输入描述: " description

            # 检查是否退出
            if [ "$description" = "q" ] || [ "$description" = "Q" ]; then
                echo -e "${YELLOW}用户取消操作${NC}"
                break
            fi

            # 如果留空，跳过
            if [ -z "$description" ]; then
                echo -e "${YELLOW}⊘ 跳过${NC}"
                skipped=$((skipped + 1))
                counter=$((counter + 1))
                echo ""
                continue
            fi

            # 清理描述（移除特殊字符，替换空格为连字符）
            description=$(echo "$description" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9\-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')

            local new_name="${dirname}/${DATE}-${description}.${ext}"

            # 检查文件是否已存在
            if [ -f "$new_name" ]; then
                echo -e "${RED}✗ 文件已存在: $(basename "$new_name")${NC}"
                skipped=$((skipped + 1))
            else
                mv "$file" "$new_name"
                echo -e "${GREEN}✓ 重命名为: $(basename "$new_name")${NC}"
                renamed=$((renamed + 1))
            fi

            counter=$((counter + 1))
            echo ""
        fi
    done < <(get_files "$TARGET_DIR")

    echo -e "${GREEN}完成！${NC}"
    echo -e "  重命名: ${GREEN}$renamed${NC} 个"
    if [ $skipped -gt 0 ]; then
        echo -e "  跳过: ${YELLOW}$skipped${NC} 个"
    fi
}

# 模式3: 批量模式
batch_mode() {
    local descriptions="$1"

    if [ -z "$descriptions" ]; then
        echo -e "${RED}错误: 批量模式需要提供描述列表${NC}"
        echo -e "用法: $0 batch <目录> \"desc1,desc2,desc3\""
        exit 1
    fi

    # 将描述分割为数组
    IFS=',' read -ra DESC_ARRAY <<< "$descriptions"

    local counter=0
    local renamed=0
    local total_files=$(get_files "$TARGET_DIR" | wc -l)
    local total_desc=${#DESC_ARRAY[@]}

    echo -e "${BLUE}=== 批量重命名模式 ===${NC}"
    echo -e "目录: ${YELLOW}$TARGET_DIR${NC}"
    echo -e "日期: ${YELLOW}$DATE${NC}"
    echo -e "文件数: ${YELLOW}$total_files${NC}"
    echo -e "描述数: ${YELLOW}$total_desc${NC}"
    echo ""

    if [ $total_files -gt $total_desc ]; then
        echo -e "${YELLOW}警告: 文件数($total_files)多于描述数($total_desc)，多余文件将被跳过${NC}"
        echo ""
    fi

    while IFS= read -r file; do
        if [ -f "$file" ] && [ $counter -lt $total_desc ]; then
            local ext="${file##*.}"
            local basename=$(basename "$file")
            local dirname=$(dirname "$file")
            local description="${DESC_ARRAY[$counter]}"

            # 清理描述
            description=$(echo "$description" | xargs | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9\-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')

            if [ -z "$description" ]; then
                echo -e "${YELLOW}⊘ 跳过 (描述为空): $basename${NC}"
                counter=$((counter + 1))
                continue
            fi

            local new_name="${dirname}/${DATE}-${description}.${ext}"

            # 检查文件是否已存在
            if [ -f "$new_name" ]; then
                echo -e "${RED}✗ 文件已存在: $(basename "$new_name")${NC}"
            else
                mv "$file" "$new_name"
                echo -e "${GREEN}✓${NC} $basename → $(basename "$new_name")"
                renamed=$((renamed + 1))
            fi

            counter=$((counter + 1))
        fi
    done < <(get_files "$TARGET_DIR")

    echo ""
    echo -e "${GREEN}完成！共重命名 $renamed 个文件${NC}"
}

# 主逻辑
case "$MODE" in
    auto)
        auto_mode
        ;;
    interactive)
        interactive_mode
        ;;
    batch)
        batch_mode "$3"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}错误: 未知模式 '$MODE'${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
