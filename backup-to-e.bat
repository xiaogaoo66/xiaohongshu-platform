@echo off
chcp 65001 >nul
echo ========================================
echo Backing up project to E:\小红书分发
echo ========================================
echo.

set SOURCE_DIR=D:\xrsp\video-render-api
set TARGET_DIR=E:\小红书分发

echo Creating target directory...
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo.
echo Copying project files...
echo This may take a few minutes...
echo.

xcopy "%SOURCE_DIR%\*" "%TARGET_DIR%\" /E /I /Y /EXCLUDE:exclude-list.txt

echo.
echo ========================================
echo Backup completed!
echo Location: %TARGET_DIR%
echo ========================================
pause
