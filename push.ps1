#!/usr/bin/env powershell

# Navigate to project directory
Set-Location "c:\Users\dhawa\Documents\vendor-risk-saas"

# Check git status
Write-Host "Current git status:"
& git status

Write-Host "`nAttempting to push..."
& git push origin main --force
