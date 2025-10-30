@echo off
chcp 65001 >nul
echo Starting Xiaohongshu Backend Server...

echo Changing to project directory...
cd /d "D:\xrsp\video-render-api"
echo Current directory: %CD%

echo Starting backend server...
node backend\src\simple-server.js

pause
