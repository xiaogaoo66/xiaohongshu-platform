#!/bin/bash

# 小红书内容分发平台 - 生产环境启动脚本

echo "🚀 启动小红书内容分发平台生产环境..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查环境变量文件
if [ ! -f "backend/.env" ]; then
    echo "❌ 后端环境变量文件不存在，请先配置 backend/.env"
    exit 1
fi

# 检查必要的环境变量
if ! grep -q "OSS_ACCESS_KEY_ID" backend/.env; then
    echo "❌ 请在 backend/.env 中配置 OSS_ACCESS_KEY_ID"
    exit 1
fi

if ! grep -q "OSS_ACCESS_KEY_SECRET" backend/.env; then
    echo "❌ 请在 backend/.env 中配置 OSS_ACCESS_KEY_SECRET"
    exit 1
fi

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker-compose build

# 启动生产环境
echo "🐳 启动生产环境容器..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 15

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 运行数据库迁移
echo "🗄️  运行数据库迁移..."
docker-compose exec backend npx prisma migrate deploy

echo ""
echo "✅ 生产环境启动完成！"
echo ""
echo "🌐 访问地址："
echo "   前端应用: http://localhost"
echo "   后端API: http://localhost:3000"
echo "   API文档: http://localhost:3000/api/docs"
echo ""
echo "📋 管理后台: http://localhost/admin/login"
echo ""
echo "🛠️  常用命令："
echo "   查看日志: docker-compose logs -f"
echo "   停止服务: docker-compose down"
echo "   重启服务: docker-compose restart"
echo "   更新服务: docker-compose pull && docker-compose up -d"
echo ""


