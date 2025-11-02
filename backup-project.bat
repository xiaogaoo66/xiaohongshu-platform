@echo off
chcp 65001 >nul
echo Backing up Xiaohongshu Content Distribution Platform...
echo.

echo Creating backup directory...
if not exist "E:\小红书分发" mkdir "E:\小红书分发"

echo Copying project files...
echo This may take a few minutes...

REM 使用 robocopy 复制文件，排除 node_modules
robocopy "D:\xrsp\video-render-api" "E:\小红书分发" /E /XD node_modules .git /XF package-lock.json /NP /NFL

if %ERRORLEVEL% LEQ 1 (
    echo.
    echo ========================================
    echo Backup completed successfully!
    echo Location: E:\小红书分发
    echo ========================================
) else (
    echo.
    echo Backup completed with some warnings.
    echo Check the output above for details.
)

echo.
pause


