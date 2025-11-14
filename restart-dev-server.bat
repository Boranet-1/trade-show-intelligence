@echo off
echo ================================================
echo Trade Show Intelligence - Dev Server Restart
echo ================================================
echo.

echo [1/5] Killing all Node.js processes...
taskkill /F /IM node.exe /T >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ Node processes killed
) else (
    echo    - No Node processes found
)

echo.
echo [2/5] Waiting for processes to terminate...
ping 127.0.0.1 -n 3 >nul

echo.
echo [3/5] Deleting Next.js cache and lock files...
if exist ".next" (
    rmdir /s /q ".next"
    echo    ✓ Deleted .next folder
) else (
    echo    - No .next folder found
)

echo.
echo [4/5] Verifying port 3000 is free...
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo    ! Port 3000 is still in use
    echo    ! Run force-kill-port-3000.ps1 if needed
) else (
    echo    ✓ Port 3000 is free
)

echo.
echo [5/5] Starting development server...
echo    Starting on http://localhost:3000
echo.
echo ================================================
echo.
npm run dev
