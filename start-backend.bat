@echo off
chcp 65001 >nul
echo Starting Xiaohongshu Backend Server...

echo Changing to project directory...
cd /d "D:\xrsp\video-render-api"
echo Current directory: %CD%

echo Installing dependencies in backend folder...
cd backend
call npm install

echo Starting backend server...
node src/simple-server.js

pause
