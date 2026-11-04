@echo off
cd /d "%~dp0"
echo Deteniendo EventCorpApp...
call pm2 stop eventcorp
timeout /t 2 >nul
