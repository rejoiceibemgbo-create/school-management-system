@echo off
title HAPPY HOME EDUCATIONAL CENTRE - School Result Management System
echo ====================================================================
echo Starting Happy Home Educational Centre - Result Management System...
echo ====================================================================
echo.

cd /d "%~dp0my-app"

echo Checking and starting local server on http://localhost:3000...
echo (Press Ctrl+C at any time to stop the server)
echo.

start "" "http://localhost:3000"
npm.cmd run dev
pause

