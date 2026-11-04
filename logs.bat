@echo off
cd /d "%~dp0"
call pm2 logs eventcorp
