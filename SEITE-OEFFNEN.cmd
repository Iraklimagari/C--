@echo off
REM NAHLIO - fertige Seite ohne Python oeffnen.
cd /d "%~dp0"
if not exist "dist\index.html" goto FEHLT
start "" "dist\index.html"
goto :EOF
:FEHLT
echo Der Ordner "dist" fehlt.
echo Bitte das ZIP-Archiv vollstaendig entpacken.
pause
