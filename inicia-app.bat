@echo off
chcp 65001 >nul
title Atmósfera Financiera del Hogar — servidor local
cd /d "%~dp0"

echo ============================================================
echo   ATMOSFERA FINANCIERA DEL HOGAR
echo   Servidor local para la aplicacion (PWA)
echo ============================================================
echo.

set PUERTO=8000
set URL=http://localhost:%PUERTO%/

where python >nul 2>nul
if %errorlevel%==0 (
  start "" "%URL%"
  echo Abriendo %URL% ...
  echo Deja esta ventana abierta. Para cerrar: Ctrl+C
  echo.
  python -m http.server %PUERTO%
  goto fin
)

where py >nul 2>nul
if %errorlevel%==0 (
  start "" "%URL%"
  echo Abriendo %URL% ...
  echo Deja esta ventana abierta. Para cerrar: Ctrl+C
  echo.
  py -3 -m http.server %PUERTO%
  goto fin
)

echo No se encontro Python. Instalalo desde https://www.python.org/downloads/
echo o abri index.html directamente con doble clic (funciona sin servidor).
pause

:fin
