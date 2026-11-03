@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Starting Amandle... the game will open in your browser.
echo Keep this window open while you play. Log: start-log.txt
where npm > start-log.txt 2>&1
call npm run dev -- --open >> start-log.txt 2>&1
echo.
echo The server stopped. See start-log.txt
type start-log.txt
pause
