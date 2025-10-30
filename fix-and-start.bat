@echo off
chcp 65001 >nul
echo Fixing and starting Xiaohongshu Frontend...
cd /d "D:\xrsp\video-render-api\frontend"
echo Current directory: %CD%

echo Cleaning node_modules and package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo Installing dependencies...
call npm install

echo Starting development server...
call npm run dev

pause
