@echo off
chcp 65001 >nul
cd /d "%~dp0"
set SPOTIFY_CONCURRENCY=6

rem A new log file per run, so a leftover process holding an old log can't block this one.
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set TS=%%i
if not exist logs mkdir logs
set LOG=logs\build-%TS%.txt

echo Amandle: rebuilding the artist pool and deploying to Vercel.
echo This takes a while (Spotify pages). Progress is written to %LOG%
echo If it stops, just run this file again: finished work is cached in .cache\

rem Leftover headless Chromium = an earlier build is still running.
tasklist /fi "imagename eq chrome-headless-shell.exe" 2>nul | find /i "chrome-headless-shell.exe" >nul
if not errorlevel 1 (
  echo.
  echo An earlier build still seems to be running ^(chrome-headless-shell.exe^).
  echo Close it first: Task Manager, end "Node.js JavaScript Runtime" and
  echo "chrome-headless-shell" - or restart the computer - then run this again.
  pause
  exit /b 1
)

(echo [%date% %time%] start) > "%LOG%" 2>nul
if not exist "%LOG%" (
  echo Cannot write %LOG%. Nothing was built or deployed.
  pause
  exit /b 1
)

echo --- playwright chromium --- >> "%LOG%"
call npx playwright install chromium >> "%LOG%" 2>&1

rem build:pool exits by itself if it makes no progress for 10 minutes.
rem Retry twice; each retry resumes from the cache.
set TRY=1
:build
echo Building the pool (try %TRY%)...
echo --- build:pool (try %TRY%) --- >> "%LOG%"
call npm run build:pool >> "%LOG%" 2>&1
if not errorlevel 1 goto deploy
if %TRY% GEQ 3 goto fail
set /a TRY+=1
echo [%date% %time%] build:pool failed, retrying in 60s >> "%LOG%"
timeout /t 60 /nobreak >nul
goto build

:deploy
rem Only deploy when the build really wrote the pool in this run.
findstr /c:"Wrote " "%LOG%" >nul
if errorlevel 1 goto fail
echo Deploying to Vercel...
echo --- vercel deploy --- >> "%LOG%"
call npx --yes vercel@latest --prod --yes >> "%LOG%" 2>&1
if errorlevel 1 goto fail
findstr /c:"vercel.app" "%LOG%" >nul
if errorlevel 1 goto fail

echo [%date% %time%] DONE >> "%LOG%"
echo Done. See %LOG%
pause
exit /b 0

:fail
echo [%date% %time%] FAILED - the live site was not changed >> "%LOG%"
echo FAILED. See %LOG%
pause
exit /b 1
