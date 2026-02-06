@echo off
cd /d "c:\Users\dhawa\Documents\vendor-risk-saas"

REM Abort any pending merge
git merge --abort 2>nul

REM Reset to HEAD
git reset --hard HEAD

REM Force push
git push origin main --force

pause
