#!/bin/bash
# ============================================================
# OpenQClaw — QClaw 残留配置文件清理脚本
# 用途: 清除 QClaw 原版遗留的配置文件和缓存，
#       解决安装 OpenQClaw 后出现"连接失败，请先验证邀请码"等问题。
# 使用: bash clean-qclaw.sh
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}${BOLD}🦞 OpenQClaw — QClaw 残留清理工具${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ---- 构建待清理路径列表 ----
# 固定路径（用户目录下）
HOME_DIR="$HOME"
PATHS=(
    "$HOME_DIR/Library/Application Support/QClaw"
    "$HOME_DIR/.qclaw"
    "$HOME_DIR/Library/Logs/QClaw"
    "$HOME_DIR/Library/Preferences/com.tencent.qclaw.plist"
)

# 动态路径（/var/folders 中的缓存目录，因用户不同路径会变化）
# 搜索所有可能匹配的 QClaw 缓存目录（统一一次 find，避免重复匹配）
path_in_list() {
    local candidate="$1"
    local existing

    for existing in "${PATHS[@]}"; do
        if [ "$existing" = "$candidate" ]; then
            return 0
        fi
    done

    return 1
}

while IFS= read -r -d '' dir; do
    if ! path_in_list "$dir"; then
        PATHS+=("$dir")
    fi
done < <(find /var/folders -maxdepth 4 -type d \( -name "com.tencent.qclaw" -o -name "com.tencent.qclaw.*" \) 2>/dev/null -print0)

# ---- 检测并展示发现的文件 ----
FOUND_PATHS=()
TOTAL_SIZE=0

echo -e "${BOLD}📋 扫描 QClaw 残留文件...${NC}"
echo ""

for path in "${PATHS[@]}"; do
    if [ -e "$path" ]; then
        # 获取大小（兼容 macOS 和 Linux）
        if [ -d "$path" ]; then
            size_bytes=$(du -sk "$path" 2>/dev/null | awk '{print $1}')
            size_bytes=$((size_bytes * 1024))
        else
            size_bytes=$(stat -f%z "$path" 2>/dev/null || stat --format=%s "$path" 2>/dev/null || echo "0")
        fi

        # 格式化大小显示
        if [ "$size_bytes" -ge 1073741824 ]; then
            size_display=$(echo "scale=2; $size_bytes / 1073741824" | bc)"GB"
        elif [ "$size_bytes" -ge 1048576 ]; then
            size_display=$(echo "scale=2; $size_bytes / 1048576" | bc)"MB"
        elif [ "$size_bytes" -ge 1024 ]; then
            size_display=$(echo "scale=2; $size_bytes / 1024" | bc)"KB"
        else
            size_display="${size_bytes}B"
        fi

        TOTAL_SIZE=$((TOTAL_SIZE + size_bytes))
        FOUND_PATHS+=("$path")

        # 类型标识
        if [ -d "$path" ]; then
            type_label="📁"
        else
            type_label="📄"
        fi

        echo -e "  ${type_label} ${YELLOW}${path}${NC}  (${size_display})"
    fi
done

echo ""

# ---- 没有发现残留文件 ----
if [ ${#FOUND_PATHS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ 未发现 QClaw 残留文件，无需清理。${NC}"
    echo ""
    exit 0
fi

# ---- 展示汇总信息 ----
if [ "$TOTAL_SIZE" -ge 1048576 ]; then
    total_display=$(echo "scale=2; $TOTAL_SIZE / 1048576" | bc)"MB"
elif [ "$TOTAL_SIZE" -ge 1024 ]; then
    total_display=$(echo "scale=2; $TOTAL_SIZE / 1024" | bc)"KB"
else
    total_display="${TOTAL_SIZE}B"
fi

echo -e "${BOLD}共发现 ${#FOUND_PATHS[@]} 个残留项，总大小约 ${total_display}${NC}"
echo ""

# ---- 请求用户确认 ----
echo -e "${RED}${BOLD}⚠️  以上文件将被永久删除，此操作不可撤回。${NC}"
echo ""
read -p "确认删除以上文件？(y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo ""
    echo -e "${YELLOW}已取消清理操作。${NC}"
    exit 0
fi

echo ""

# ---- 执行删除 ----
success_count=0
fail_count=0

for path in "${FOUND_PATHS[@]}"; do
    if rm -rf "$path" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} 已删除: $path"
        ((success_count++)) || true
    else
        echo -e "  ${RED}✗${NC} 删除失败（可能需要管理员权限）: $path"
        ((fail_count++)) || true
    fi
done

echo ""

# ---- 结果汇总 ----
if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}${BOLD}🎉 清理完成！已成功删除 ${success_count} 个残留项。${NC}"
else
    echo -e "${YELLOW}${BOLD}⚠️  清理部分完成：成功 ${success_count} 项，失败 ${fail_count} 项。${NC}"
    echo -e "${YELLOW}提示：部分文件可能需要 sudo 权限才能删除，请尝试：${NC}"
    echo -e "${CYAN}  sudo bash clean-qclaw.sh${NC}"
fi

echo ""
echo -e "${CYAN}现在可以重新启动 OpenQClaw 了 🦞${NC}"
echo ""
