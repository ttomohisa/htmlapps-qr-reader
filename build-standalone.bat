@echo off
setlocal
cd /d "%~dp0"

echo Building the standalone QR Reader...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-standalone.ps1" %*
if errorlevel 1 (
  echo.
  echo Build failed. Review the message above.
  pause
  exit /b 1
)

echo.
echo Build completed. Opening dist\index.html...
start "" "%~dp0dist\index.html"
endlocal
