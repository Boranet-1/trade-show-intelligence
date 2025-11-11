@echo off
echo Stopping Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Clearing Next.js cache...
if exist ".next" (
    rmdir /s /q ".next"
    echo Cache cleared!
)

echo Starting development server...
npm run dev
