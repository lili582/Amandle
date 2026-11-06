@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

rem v0.10.0: rank by monthly listeners, pool update every two weeks, cleanup.
rem Makes a new branch, removes the unused files, runs the tests, commits,
rem pushes and opens a PR. You merge it yourself. Deletes itself when done.
set BRANCH=feat/pool-auto-update
set VERSION=v0.10.0
set TITLE=Rank by monthly listeners, update the pool every two weeks (v0.10.0)

git rev-parse --is-inside-work-tree >nul 2>&1 || (echo ERROR: not a git repository & goto :fail)

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set CURRENT=%%b

if "%CURRENT%"=="%BRANCH%" goto :cleanup
git show-ref --verify --quiet refs/heads/%BRANCH%
if not errorlevel 1 (
  git checkout %BRANCH% || goto :fail
  goto :cleanup
)
if not "%CURRENT%"=="main" (
  echo ERROR: you are on "%CURRENT%". Switch to main first: git checkout main
  goto :fail
)
git pull --ff-only origin main || echo WARNING: could not update main from GitHub; the branch starts from your local main.
git checkout -b %BRANCH% || goto :fail

:cleanup
echo == Removing unused files ==
git rm -q --ignore-unmatch -- .github/workflows/deploy.yml deploy-vercel.bat push-fix.bat push-fix.sh
git rm -q -r --cached --ignore-unmatch -- logs build-deploy-log.txt start-log.txt
for %%f in (".github\workflows\deploy.yml" "deploy-vercel.bat" "push-fix.bat" "push-fix.sh" "build-deploy-log.txt") do if exist %%f del /q %%f
if exist start-log.txt del /q start-log.txt 2>nul
if exist start-log.txt echo NOTE: start-log.txt is in use ^(the game is running^). It is gitignored now; delete it later.
if exist logs rmdir /s /q logs

echo == Installing, running tests and typecheck ==
call npm install --no-audit --no-fund >nul || (echo ERROR: npm install failed & goto :fail)
call npm test || (echo ERROR: tests failed & goto :fail)
call npm run typecheck || (echo ERROR: typecheck failed & goto :fail)

echo == Committing ==
git add -A -- . ":!push-branch.bat" ":!PR_BODY.tmp.md"
git diff --cached --quiet
if errorlevel 1 (
  git status --short
  git commit -m "%TITLE%" -m "- Popularity rank = Spotify monthly listeners; the Israel filter and listener floor stay" -m "- update-pool.yml: rebuild and deploy to Vercel every two weeks, with a safety check (check:pool)" -m "- README, CHANGELOG, DECISIONS updated; version 0.10.0" -m "- Removed the GitHub Pages workflow, deploy-vercel.bat, push-fix scripts and old logs" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01QYw4ofXoyrWAePGZ6BSWnw" || goto :fail
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
if errorlevel 1 gh pr create --base main --head %BRANCH% --title "%TITLE%" --body-file PR_BODY.tmp.md
gh pr view %BRANCH% --web
if exist PR_BODY.tmp.md del /q PR_BODY.tmp.md
goto :done

:nogh
echo Open the PR here. The description to paste is in PR_BODY.tmp.md ^(opening it in Notepad^):
echo   https://github.com/lili582/amnal/compare/main...%BRANCH%?expand=1
start "" "https://github.com/lili582/amnal/compare/main...%BRANCH%?expand=1"
start "" notepad PR_BODY.tmp.md

:done
echo.
echo Done. Before or after merging, add 3 secrets in GitHub:
echo   Settings ^> Secrets and variables ^> Actions ^> New repository secret
echo     VERCEL_TOKEN       create one at https://vercel.com/account/tokens
echo     VERCEL_ORG_ID      team_nLCj2PttmUqp3ceXcvVbEbBG
echo     VERCEL_PROJECT_ID  prj_P1J2zXHW47Ma5M20oO989XvUV2iU
echo.
echo After you merge the PR on GitHub, run:
echo   git checkout main ^&^& git pull
echo   git tag %VERSION% ^&^& git push origin %VERSION%
echo   git branch -d %BRANCH% ^&^& git push origin --delete %BRANCH%
echo.
pause
(goto) 2>nul & del "%~f0"

:fail
echo.
pause
exit /b 1
