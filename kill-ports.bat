@echo off
REM Kill all Node.js processes
taskkill /F /IM node.exe 2>nul
taskkill /F /IM next.exe 2>nul

REM Delete Next.js cache
if exist ".next" (
    rmdir /s /q ".next"
    echo Deleted .next cache
)

REM Delete dev lock file
if exist ".next\dev\lock" (
    del ".next\dev\lock"
    echo Deleted dev lock file
)

echo All processes killed and cache cleared
