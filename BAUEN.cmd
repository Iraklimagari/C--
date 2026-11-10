@echo off
setlocal
cd /d "%~dp0"
title NAHLIO - bauen

set "PY="
py -3 --version >nul 2>&1
if not errorlevel 1 set "PY=py -3"
if defined PY goto HAVEPY
python --version >nul 2>&1
if not errorlevel 1 set "PY=python"
if defined PY goto HAVEPY
python3 --version >nul 2>&1
if not errorlevel 1 set "PY=python3"
if defined PY goto HAVEPY

echo Python wurde nicht gefunden.
echo Zum Bauen wird Python benoetigt. Nur zum Ansehen der fertigen
echo Seite reicht SEITE-OEFFNEN.cmd - dafuer ist kein Python noetig.
pause
goto :EOF

:HAVEPY
%PY% build.py
echo.
pause
