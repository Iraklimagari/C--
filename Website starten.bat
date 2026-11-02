@echo off
cd /d "%~dp0"
where py >nul 2>nul && (py start-website.py) || (python start-website.py)
if errorlevel 1 (
  echo.
  echo Python wurde nicht gefunden. Bitte von https://www.python.org/downloads/ installieren
  echo und beim Installieren "Add python.exe to PATH" anhaken.
  pause
)
