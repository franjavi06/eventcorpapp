@echo off
cd /d "%~dp0"
echo Reiniciando EventCorpApp...
call pm2 restart eventcorp --update-env
timeout /t 2 >nul
