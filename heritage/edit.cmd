@echo off
setlocal
cd /d "%~dp0"
if not defined HERITAGE_PORT set "HERITAGE_PORT=5173"

powershell -NoProfile -WindowStyle Hidden -Command "try { $null = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:%HERITAGE_PORT%/api/records' -TimeoutSec 1; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList '.\scripts\editor_server.mjs' -WorkingDirectory '%CD%' -WindowStyle Hidden"
)

set /a WAIT_ATTEMPTS=0
:wait_for_server
powershell -NoProfile -WindowStyle Hidden -Command "try { $null = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:%HERITAGE_PORT%/api/records' -TimeoutSec 1; exit 0 } catch { exit 1 }"
if not errorlevel 1 goto server_ready
set /a WAIT_ATTEMPTS+=1
if %WAIT_ATTEMPTS% GEQ 10 goto server_failed
timeout /t 1 /nobreak >nul
goto wait_for_server

:server_failed
echo 无法启动国保足迹编辑服务，请检查 Node.js 或端口 %HERITAGE_PORT% 是否可用。
pause
endlocal
exit /b 1

:server_ready

start "" "http://127.0.0.1:%HERITAGE_PORT%/"
endlocal
