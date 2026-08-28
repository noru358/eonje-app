@echo off
setlocal
cd /d "%~dp0"
echo.
echo [언제 v0.2] DEMO DATA로 시작합니다.
echo 브라우저: http://localhost:4173
echo 종료: Ctrl+C
echo.
node server.mjs
