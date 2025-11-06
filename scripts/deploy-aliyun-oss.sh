#!/bin/bash

# 阿里云 OSS 部署脚本
# 使用方法: ./deploy-aliyun-oss.sh [bucket-name] [region]

set -e

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
BUCKET_NAME=${1:-xiaohongshu-frontend}
REGION=${2:-oss-cn-hangzhou}
FRONTEND_DIR="frontend"
DIST_DIR="$FRONTEND_DIR/dist"

echo -e "${GREEN}开始部署到阿里云 OSS...${NC}"

# 检查是否安装了阿里云 CLI
if ! command -v aliyun &> /dev/null; then
    echo -e "${RED}错误: 未安装阿里云 CLI${NC}"
    echo -e "${YELLOW}请先安装: npm install -g @alicloud/cli${NC}"
    exit 1
fi

# 检查是否配置了 AccessKey
if [ ! -f ~/.aliyun/config.json ]; then
    echo -e "${RED}错误: 未配置阿里云 AccessKey${NC}"
    echo -e "${YELLOW}请先运行: aliyun configure${NC}"
    exit 1
fi

# 进入项目根目录
cd "$(dirname "$0")/.."

# 检查前端目录是否存在
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}错误: 前端目录不存在: $FRONTEND_DIR${NC}"
    exit 1
fi

# 安装依赖（如果 node_modules 不存在）
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}正在安装前端依赖...${NC}"
    cd "$FRONTEND_DIR"
    npm install
    cd ..
fi

# 构建前端
echo -e "${GREEN}正在构建前端...${NC}"
cd "$FRONTEND_DIR"
npm run build
cd ..

# 检查构建结果
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${RED}错误: 构建失败，dist 目录不存在${NC}"
    exit 1
fi

# 上传到 OSS
echo -e "${GREEN}正在上传到 OSS (Bucket: $BUCKET_NAME, Region: $REGION)...${NC}"
aliyun oss cp "$DIST_DIR/" "oss://$BUCKET_NAME/" \
    --region "$REGION" \
    --recursive \
    --force \
    --meta "Cache-Control:no-cache" || {
    echo -e "${RED}上传失败！${NC}"
    exit 1
}

# 设置默认首页
echo -e "${GREEN}配置默认首页...${NC}"
aliyun ossapi PutBucketWebsite \
    --bucket "$BUCKET_NAME" \
    --index-document index.html \
    --error-document index.html \
    --region "$REGION" || {
    echo -e "${YELLOW}警告: 设置默认首页失败，请手动在控制台配置${NC}"
}

echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${YELLOW}请访问你的 CDN 域名或 OSS 域名查看结果${NC}"


