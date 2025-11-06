#!/bin/bash

# 阿里云 OSS 部署脚本
# 使用方法：./deploy-oss.sh

# 配置信息（请修改为你的实际信息）
OSS_BUCKET="your-bucket-name"
OSS_REGION="cn-hangzhou"
OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}开始部署前端到阿里云 OSS...${NC}"

# 检查是否在 frontend 目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误：请在 frontend 目录下执行此脚本${NC}"
    exit 1
fi

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}未检测到 node_modules，正在安装依赖...${NC}"
    npm install
fi

# 构建项目
echo -e "${GREEN}正在构建项目...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}构建失败！${NC}"
    exit 1
fi

# 检查 dist 目录
if [ ! -d "dist" ]; then
    echo -e "${RED}错误：dist 目录不存在，构建可能失败${NC}"
    exit 1
fi

echo -e "${GREEN}构建完成！${NC}"

# 检查是否安装了 ossutil
if ! command -v ossutil &> /dev/null; then
    echo -e "${YELLOW}未检测到 ossutil，请先安装：${NC}"
    echo "1. 下载：https://help.aliyun.com/document_detail/120075.html"
    echo "2. 配置：ossutil config"
    echo "3. 或使用其他方式上传 dist 目录内容到 OSS"
    exit 1
fi

# 上传到 OSS
echo -e "${GREEN}正在上传文件到 OSS...${NC}"
ossutil cp -r dist/ oss://${OSS_BUCKET}/ --update

if [ $? -eq 0 ]; then
    echo -e "${GREEN}部署成功！${NC}"
    echo -e "${GREEN}访问地址：http://${OSS_BUCKET}.${OSS_ENDPOINT}${NC}"
else
    echo -e "${RED}上传失败！${NC}"
    exit 1
fi

