@echo off
echo ========================================
echo Backing up project to E drive
echo ========================================
echo.

set SOURCE=D:\xrsp\video-render-api
set TARGET=E:\xiaohongshu-backup

echo Creating target directory...
if not exist "%TARGET%" mkdir "%TARGET%"

echo.
echo Copying project files...
echo This may take a few minutes...
echo.

robocopy "%SOURCE%" "%TARGET%" /E /XD node_modules .git /XF *.log /R:3 /W:5 /NP

echo.
echo ========================================
echo Backup completed!
echo.
echo Source: %SOURCE%
echo Target: %TARGET%
echo ========================================
echo.
echo You can find your backup at: E:\xiaohongshu-backup
pause
