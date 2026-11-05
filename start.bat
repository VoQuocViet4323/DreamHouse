@echo off
title Dream House - Local Server
echo ========================================================
echo   DREAM HOUSE - DANG KHOI CHAY MAY CHU LOCAL TAI PORT 3000
echo ========================================================

REM Tu dong dong bo cau hinh tu file .env neu co Node.js
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    node generate-config.js
)

echo   Dia chi website: http://localhost:3000
echo   De tat may chu, hay dong cua so nay hoac bam Ctrl + C
echo ========================================================
echo.
start http://localhost:3000
python -m http.server 3000
pause
