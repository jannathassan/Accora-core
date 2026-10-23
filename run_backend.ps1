# Run Accora Core Backend
Write-Host "Starting Accora Core FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
$env:PYTHONPATH = "$PSScriptRoot\backend"
& "$PSScriptRoot\backend\venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir "$PSScriptRoot\backend" --host 127.0.0.1 --port 8000 --reload
