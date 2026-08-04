@echo off
:wait
timeout /t 1 /nobreak >nul
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
echo DONE
