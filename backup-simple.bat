@echo off
chcp 65001 >nul
echo ========================================
echo Backing up Xiaohongshu Project
echo ========================================
echo.

REM 创建目标文件夹
set TARGET=E:\小红书分发
if not exist "%TARGET%" (
    echo Creating directory: %TARGET%
    mkdir "%TARGET%"
)

echo.
echo Copying files...
echo.

REM 复制项目文件（排除 node_modules 和 .git）
robocopy "D:\xrsp\video-render-api" "%TARGET%" /E /XD node_modules .git backend\node_modules frontend\node_modules /XF *.log /R:3 /W:5 /NP

echo.
echo ========================================
echo Backup completed!
echo.
echo Source: D:\xrsp\video-render-api
echo Target: %TARGET%
echo ========================================
pause
