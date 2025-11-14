# PowerShell script to force-kill process on port 3000
# Run as Administrator if needed

Write-Host "Finding process on port 3000..." -ForegroundColor Yellow

$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "Found process PID: $process" -ForegroundColor Cyan

    try {
        Stop-Process -Id $process -Force -ErrorAction Stop
        Write-Host "Successfully killed process $process" -ForegroundColor Green
        Start-Sleep -Seconds 2

        # Verify port is free
        $check = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
        if (-not $check) {
            Write-Host "Port 3000 is now free!" -ForegroundColor Green
        } else {
            Write-Host "Port 3000 is still in use. You may need to run this script as Administrator." -ForegroundColor Red
        }
    } catch {
        Write-Host "Failed to kill process. Try running as Administrator." -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
    }
} else {
    Write-Host "No process found on port 3000" -ForegroundColor Green
}
