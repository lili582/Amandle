@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Deploying Amandle to Vercel...
call npx --yes vercel@latest --prod
echo.
pause
