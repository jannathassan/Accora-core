# Run Accora Core Frontend
Write-Host "Starting Accora Core Vite Frontend on http://localhost:5173..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\frontend"
cmd /c "npm run dev"
