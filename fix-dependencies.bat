@echo off
chcp 65001 >nul
echo Fixing dependencies for Xiaohongshu Frontend...
cd /d "D:\xrsp\video-render-api\frontend"
echo Current directory: %CD%

echo Backing up original package.json...
copy package.json package.json.backup

echo Replacing with simplified package.json...
copy package-simple.json package.json

echo Cleaning node_modules and package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo Installing dependencies...
call npm install

if %ERRORLEVEL% EQU 0 (
    echo Dependencies installed successfully!
    echo Starting development server...
    call npm run dev
) else (
    echo Failed to install dependencies. Please check the error messages above.
)

pause
