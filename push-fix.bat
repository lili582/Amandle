@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

rem Pushes the v0.1.0 fix on its own branch and opens a PR. You merge it yourself.
set BRANCH=fix/curated-artists-and-pictures
set VERSION=v0.9.0
set TITLE=Pool of 350, swap five artists (v0.9.0)

git rev-parse --is-inside-work-tree >nul 2>&1 || (echo ERROR: not a git repository & goto :fail)

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set CURRENT=%%b

if "%CURRENT%"=="%BRANCH%" goto :checks
git show-ref --verify --quiet refs/heads/%BRANCH%
if not errorlevel 1 (
  git checkout %BRANCH% || goto :fail
  goto :checks
)
if not "%CURRENT%"=="main" (
  echo ERROR: you are on "%CURRENT%". Switch to main first: git checkout main
  goto :fail
)
git pull --ff-only origin main || (echo ERROR: could not update main & goto :fail)
git checkout -b %BRANCH% || goto :fail

:checks
echo == Running tests and typecheck ==
call npm test || (echo ERROR: tests failed & goto :fail)
call npm run typecheck || (echo ERROR: typecheck failed & goto :fail)

echo == Committing ==
git add -A -- . ":!push-fix.bat" ":!push-fix.sh"
git diff --cached --quiet
if errorlevel 1 (
  git status --short
  git commit -m "%TITLE%" -m "- שחר אבן צור, חמי רודנר, ליהי טולדנו, שאזאמאט, הבילויים, המכשפות" -m "- POOL_SIZE 350; 16 more artists; 149 hand-checked" -m "- Every artist in the pool can be the daily answer (ANSWER_POOL_SIZE = POOL_SIZE); version 0.9.0" -m "- Swap: שריף, נועם קלינשטיין, דן תורן, השמחות, האחים צברי in; נמואל, חנן יובל, מוטי שטיינמץ, חיים ישראל, מאי ספדיה out (EXCLUDED_QIDS)" || goto :fail
) else (
  echo Nothing new to commit.
)

echo == Pushing ==
git push -u origin %BRANCH% || (echo ERROR: push failed & goto :fail)

echo == Pull request ==
where gh >nul 2>&1
if errorlevel 1 goto :nogh
gh auth status >nul 2>&1
if errorlevel 1 goto :nogh
gh pr view %BRANCH% >nul 2>&1
if errorlevel 1 gh pr create --base main --head %BRANCH% --title "%TITLE%" --body "See CHANGELOG.md and DECISIONS.md."
gh pr view %BRANCH% --web
goto :done

:nogh
echo Open the PR here:
echo   https://github.com/lili582/amnal/compare/main...%BRANCH%?expand=1
start "" "https://github.com/lili582/amnal/compare/main...%BRANCH%?expand=1"

:done
echo.
echo Done. After you merge the PR on GitHub, run:
echo   git checkout main ^&^& git pull
echo   git tag %VERSION% ^&^& git push origin %VERSION%
echo   git branch -d %BRANCH% ^&^& git push origin --delete %BRANCH%
echo   deploy-vercel.bat
echo.
pause
exit /b 0

:fail
echo.
pause
exit /b 1
