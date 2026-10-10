# One-shot local setup: deps, migrations, readiness, frontend build
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$py = Join-Path $backend ".venv\Scripts\python.exe"

Write-Host "==> Backend: install deps"
& $py -m pip install -r (Join-Path $backend "requirements.txt") -q

Write-Host "==> Backend: alembic upgrade head"
Push-Location $backend
& $py -m alembic upgrade head
& $py scripts\check_deploy_ready.py
Pop-Location

Write-Host "==> Frontend: npm install + build"
Push-Location $frontend
npm.cmd install --silent
npm.cmd run build
Pop-Location

Write-Host "Done. Start API: cd backend; .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
Write-Host "Start app: cd frontend; npm.cmd run dev"
