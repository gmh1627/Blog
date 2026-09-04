@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -WindowStyle Hidden -Command "try { $null = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4173/api/records' -TimeoutSec 1; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList '.\scripts\editor_server.mjs' -WorkingDirectory '%CD%' -WindowStyle Hidden"
  timeout /t 1 /nobreak >nul
)

start "" "http://127.0.0.1:4173/"
endlocal
