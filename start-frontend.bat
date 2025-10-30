@echo off
chcp 65001 >nul
echo Starting Xiaohongshu Content Distribution Platform Frontend...
cd /d "D:\xrsp\video-render-api\frontend"
echo Current directory: %CD%
echo Installing dependencies...
call npm install
echo Starting development server...
call npm run dev
pause
