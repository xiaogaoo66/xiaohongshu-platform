@echo off
chcp 65001 >nul
echo Starting Xiaohongshu Backend Server...

echo Changing to project directory...
cd /d "D:\xrsp\video-render-api"
echo Current directory: %CD%

echo Checking if port 3000 is in use...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Port 3000 is in use by process %%a, killing it...
    taskkill /PID %%a /F >nul 2>&1
)

echo Waiting for port to be released...
timeout /t 2 /nobreak >nul

echo Starting backend server...
node backend\src\simple-server.js

pause


