cd c:\Users\dhawa\Documents\vendor-risk-saas

REM Remove frontend from git cache (as submodule)
git rm --cached frontend -f

REM Remove from index
git reset HEAD frontend

REM Add frontend files properly
git add frontend/

REM Commit the changes
git commit -m "Add frontend files properly"

REM Force push
git push origin main --force

echo Done!
