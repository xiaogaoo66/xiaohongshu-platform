@echo off
chcp 65001 >nul
echo ========================================
echo 正在备份小红书项目...
echo ========================================
echo.

REM 源目录和目标目录
set SOURCE=D:\xrsp\video-render-api
set TARGET=E:\xiaohongshu-backup

REM 创建目标文件夹
if not exist "%TARGET%" (
    echo 正在创建备份目录: %TARGET%
    mkdir "%TARGET%"
)

echo.
echo 正在复制文件...
echo 源目录: %SOURCE%
echo 目标目录: %TARGET%
echo.

REM 使用 robocopy 复制文件，排除 node_modules 和 .git 目录
REM /E: 复制所有子目录（包括空目录）
REM /XD: 排除指定目录
REM /XF: 排除指定文件
REM /R:3: 失败重试3次
REM /W:5: 重试等待5秒
REM /NP: 不显示进度百分比
REM /NFL: 不显示文件列表
REM /NDL: 不显示目录列表

robocopy "%SOURCE%" "%TARGET%" /E /XD node_modules .git backend\node_modules frontend\node_modules /XF *.log /R:3 /W:5 /NP /NFL /NDL

echo.
echo ========================================
echo 备份完成！
echo.
echo 源目录: %SOURCE%
echo 目标目录: %TARGET%
echo.
echo 已排除: node_modules, .git, *.log
echo ========================================
echo.
pause



