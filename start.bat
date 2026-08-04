@echo off
title Dashboard IT - Server Launcher
cd /d "%~dp0"

REM Arah split: -H = samping kiri-kanan, -V = atas-bawah
set SPLIT_DIR=-V

echo ==========================================================
echo   DASHBOARD IT - SYSTEM MONITORING ^& ASSET
echo   Backend  : http://localhost:3002
echo   Frontend : http://localhost:3005
echo ==========================================================
echo.

REM Cek apakah port sudah terpakai
netstat -ano | findstr /r "LISTENING" | findstr ":3002 " >nul 2>&1
if %errorlevel%==0 (
    echo [WARN] Port 3002 sudah terpakai. Backend mungkin sudah jalan.
)
netstat -ano | findstr /r "LISTENING" | findstr ":3005 " >nul 2>&1
if %errorlevel%==0 (
    echo [WARN] Port 3005 sudah terpakai. Frontend mungkin sudah jalan.
)
echo.

REM Cek apakah Windows Terminal tersedia (untuk split mode)
where wt.exe >nul 2>&1
if %errorlevel%==0 (
    echo [1/3] Menjalankan Backend + Frontend ^(SPLIT MODE - Windows Terminal^)...
    start "" wt.exe -d "%CD%\backend" cmd /k "set PORT=3002 && node server.js" ^; split-pane %SPLIT_DIR% -d "%CD%\frontend" cmd /k "set PORT=3005 && npm start"
    goto wait
)

echo [1/3] Windows Terminal tidak terdeteksi - membuka 2 jendela terpisah.
echo [2/3] Menjalankan Backend (port 3002)...
start "Dashboard IT - Backend" cmd /k "set PORT=3002 && cd /d backend && node server.js"

timeout /t 3 /nobreak >nul

echo [3/3] Menjalankan Frontend (port 3005)...
start "Dashboard IT - Frontend" cmd /k "set PORT=3005 && cd /d frontend && npm start"

:wait
timeout /t 10 /nobreak >nul

echo Membuka browser...
start "" "http://localhost:3005"

echo.
echo Server berjalan:
echo   Frontend : http://localhost:3005  ^(login: username admin / password sesuai akun^)
echo   Backend  : http://localhost:3002
echo.
echo Jendela ini bisa langsung ditutup - server berjalan di jendela terpisah.
echo (Untuk menghentikan server, tutup jendela/pane "Dashboard IT - Backend" dan "Dashboard IT - Frontend")
echo.
pause >nul
