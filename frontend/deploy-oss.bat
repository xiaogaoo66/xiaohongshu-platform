@echo off
REM 阿里云 OSS 部署脚本 (Windows)
REM 使用方法：双击运行或在命令行执行 deploy-oss.bat

REM 配置信息（请修改为你的实际信息）
set OSS_BUCKET=xhs-content
set OSS_REGION=cn-chengdu
set OSS_ENDPOINT=oss-cn-chengdu.aliyuncs.com

echo 开始部署前端到阿里云 OSS...

REM 检查是否在 frontend 目录
if not exist "package.json" (
    echo 错误：请在 frontend 目录下执行此脚本
    pause
    exit /b 1
)

REM 检查是否安装了依赖
if not exist "node_modules" (
    echo 未检测到 node_modules，正在安装依赖...
    call npm install
)

REM 构建项目
echo 正在构建项目...
call npm run build

if errorlevel 1 (
    echo 构建失败！
    pause
    exit /b 1
)

REM 检查 dist 目录
if not exist "dist" (
    echo 错误：dist 目录不存在，构建可能失败
    pause
    exit /b 1
)

echo 构建完成！

REM 检查是否安装了 ossutil
where ossutil >nul 2>nul
if errorlevel 1 (
    echo 未检测到 ossutil，请先安装：
    echo 1. 下载：https://help.aliyun.com/document_detail/120075.html
    echo 2. 配置：ossutil config
    echo 3. 或使用其他方式上传 dist 目录内容到 OSS
    pause
    exit /b 1
)

REM 上传到 OSS
echo 正在上传文件到 OSS...
ossutil cp -r dist/ oss://%OSS_BUCKET%/ --update

if errorlevel 1 (
    echo 上传失败！
    pause
    exit /b 1
) else (
    echo 部署成功！
    echo 访问地址：http://%OSS_BUCKET%.%OSS_ENDPOINT%
)

pause

