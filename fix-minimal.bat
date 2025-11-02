@echo off
chcp 65001 >nul
echo Installing minimal dependencies for Xiaohongshu Frontend...
cd /d "D:\xrsp\video-render-api\frontend"
echo Current directory: %CD%

echo Replacing with minimal package.json...
copy package-minimal.json package.json

echo Cleaning node_modules and package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo Installing minimal dependencies...
call npm install

if %ERRORLEVEL% EQU 0 (
    echo Dependencies installed successfully!
    echo Starting development server...
    call npm run dev
) else (
    echo Failed to install dependencies. Please check the error messages above.
    echo Trying to install without optional dependencies...
    call npm install --no-optional
    if %ERRORLEVEL% EQU 0 (
        echo Dependencies installed successfully!
        echo Starting development server...
        call npm run dev
    ) else (
        echo Still failed. Please check the error messages above.
    )
)

pause


