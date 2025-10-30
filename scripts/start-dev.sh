#!/bin/bash

# 小红书内容分发平台 - 开发环境启动脚本

echo "🚀 启动小红书内容分发平台开发环境..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查环境变量文件
if [ ! -f "backend/.env" ]; then
    echo "⚠️  后端环境变量文件不存在，正在创建..."
    cp backend/env.example backend/.env
    echo "📝 请编辑 backend/.env 文件配置环境变量"
    echo "   特别是 AWS S3 相关配置"
    read -p "按回车键继续..."
fi

# 启动开发环境
echo "🐳 启动 Docker 容器..."
docker-compose -f docker-compose.dev.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose -f docker-compose.dev.yml ps

# 运行数据库迁移
echo "🗄️  运行数据库迁移..."
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev

echo ""
echo "✅ 开发环境启动完成！"
echo ""
echo "🌐 访问地址："
echo "   前端应用: http://localhost:5173"
echo "   后端API: http://localhost:3000"
echo "   API文档: http://localhost:3000/api/docs"
echo ""
echo "📋 管理后台: http://localhost:5173/admin/login"
echo "   首次使用请先注册管理员账号"
echo ""
echo "🛠️  常用命令："
echo "   查看日志: docker-compose -f docker-compose.dev.yml logs -f"
echo "   停止服务: docker-compose -f docker-compose.dev.yml down"
echo "   重启服务: docker-compose -f docker-compose.dev.yml restart"
echo ""
