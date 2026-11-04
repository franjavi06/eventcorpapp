@echo off
cd /d "%~dp0"
echo Iniciando EventCorpApp con PM2...
call pm2 start ecosystem.config.cjs
call pm2 save
start "" http://localhost:3000
echo EventCorpApp iniciado en http://localhost:3000
timeout /t 3 >nul
