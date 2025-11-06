@echo off
REM 阿里云 OSS 部署脚本 (Windows)
REM 使用方法: deploy-aliyun-oss.bat [bucket-name] [region]

setlocal enabledelayedexpansion

REM 配置
set BUCKET_NAME=%1
if "%BUCKET_NAME%"=="" set BUCKET_NAME=xiaohongshu-frontend
set REGION=%2
if "%REGION%"=="" set REGION=oss-cn-hangzhou
set FRONTEND_DIR=frontend
set DIST_DIR=%FRONTEND_DIR%\dist

echo 开始部署到阿里云 OSS...

REM 检查是否安装了阿里云 CLI
where aliyun >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未安装阿里云 CLI
    echo 请先安装: npm install -g @alicloud/cli
    exit /b 1
)

REM 检查是否配置了 AccessKey
if not exist "%USERPROFILE%\.aliyun\config.json" (
    echo 错误: 未配置阿里云 AccessKey
    echo 请先运行: aliyun configure
    exit /b 1
)

REM 进入项目根目录
cd /d "%~dp0\.."

REM 检查前端目录是否存在
if not exist "%FRONTEND_DIR%" (
    echo 错误: 前端目录不存在: %FRONTEND_DIR%
    exit /b 1
)

REM 安装依赖（如果 node_modules 不存在）
if not exist "%FRONTEND_DIR%\node_modules" (
    echo 正在安装前端依赖...
    cd %FRONTEND_DIR%
    call npm install
    cd ..
)

REM 构建前端
echo 正在构建前端...
cd %FRONTEND_DIR%
call npm run build
cd ..

REM 检查构建结果
if not exist "%DIST_DIR%" (
    echo 错误: 构建失败，dist 目录不存在
    exit /b 1
)

REM 上传到 OSS
echo 正在上传到 OSS (Bucket: %BUCKET_NAME%, Region: %REGION%)...
aliyun oss cp "%DIST_DIR%\*" "oss://%BUCKET_NAME%/" --region %REGION% --recursive --force
if %errorlevel% neq 0 (
    echo 上传失败！
    exit /b 1
)

REM 设置默认首页（需要手动配置，脚本暂不支持）
echo 部署完成！
echo 请访问你的 CDN 域名或 OSS 域名查看结果
echo 注意: 请手动在阿里云控制台配置静态网站托管（默认首页: index.html, 404页: index.html）

pause


