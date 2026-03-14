$ErrorActionPreference = 'Stop'

# Root of repo (scripts/..)
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$backend = Join-Path $root 'backend'

Write-Host "[ra] Stopping running node/ng/PowerShell background processes..."
Get-Process node, ng -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Stop PowerShell background jobs
Get-Job | Stop-Job -ErrorAction SilentlyContinue
Get-Job | Remove-Job -ErrorAction SilentlyContinue

Write-Host "[ra] Starting backend (node server.js) in background..."
Start-Job -ScriptBlock { Set-Location $using:backend; node server.js } -Name BackendServer | Out-Null

Start-Sleep -Seconds 3

Write-Host "[ra] Starting frontend (ng serve) in background..."
Start-Job -ScriptBlock { Set-Location $using:root; ng serve } -Name FrontendServer | Out-Null

Start-Sleep -Seconds 5

Write-Host "`n=== Application Started ===" -ForegroundColor Green
Write-Host "Backend running on http://localhost:3000" -ForegroundColor Cyan
Write-Host "Frontend running on http://localhost:4200" -ForegroundColor Cyan
Write-Host "`nTo view logs:" -ForegroundColor Yellow
Write-Host "  Backend:  Receive-Job -Name BackendServer -Keep" -ForegroundColor Gray
Write-Host "  Frontend: Receive-Job -Name FrontendServer -Keep" -ForegroundColor Gray
Write-Host "`nTo stop:" -ForegroundColor Yellow
Write-Host "  Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Gray
