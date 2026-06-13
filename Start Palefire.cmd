@echo off
setlocal

cd /d "%~dp0"
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
set "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9223"

echo Starting Palefire...
call npm run tauri dev

if errorlevel 1 (
  echo.
  echo Palefire could not start. Review the error above.
  pause
)
