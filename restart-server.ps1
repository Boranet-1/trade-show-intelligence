# Restart Development Server Script
# Kills all node processes, clears cache, and restarts

Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "Cache cleared!" -ForegroundColor Green
}

Write-Host "Starting development server..." -ForegroundColor Yellow
npm run dev
