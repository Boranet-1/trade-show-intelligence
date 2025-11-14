@echo off
echo Cleaning up dev server...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
if exist .next\dev\lock del .next\dev\lock
if exist .next rmdir /s /q .next
echo Dev server cleaned
echo Starting fresh dev server...
npm run dev
