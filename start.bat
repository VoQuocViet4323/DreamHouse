@echo off
title Dream House - Local Server
echo ========================================================
echo   DREAM HOUSE - DANG KHOI CHAY MAY CHU NODE.JS (PORT 3000)
echo ========================================================

REM Tu dong dong bo bien moi truong tu file .env
node generate-config.js

echo.
echo   Dia chi website: http://localhost:3000
echo   De tat may chu, hay dong cua so nay hoac bam Ctrl + C
echo ========================================================
echo.
start http://localhost:3000
npx serve -p 3000
pause
