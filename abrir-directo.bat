@echo off
chcp 65001 >nul
title Atmósfera Financiera — abrir la app sin servidor
cd /d "%~dp0"
echo Abriendo index.html directamente en el navegador predeterminado...
start "" "index.html"
