#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-$HOME/dashboard-it}"
PUBLIC_URL="${2:-http://10.10.10.252}"
BACKEND_PORT="${3:-3002}"
SERVER_NAME="$(printf '%s' "$PUBLIC_URL" | sed -E 's#https?://([^/:]+).*#\1#')"
NODE_BIN="$(command -v node)"

if [ -z "$NODE_BIN" ]; then
  echo "Node.js belum terinstall. Jalankan dulu:"
  echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -"
  echo "  sudo apt install -y nodejs"
  exit 1
fi
if [ ! -d /etc/nginx/sites-available ]; then
  echo "nginx belum terinstall. Jalankan: sudo apt install -y nginx"
  exit 1
fi
if [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]; then
  echo "Node.js harus >= 18. Saat ini: $(node -v)"
  exit 1
fi

echo "==> [1/6] Install dependency backend & frontend"
cd "$APP_DIR"
npm run install:all

echo "==> [2/6] Build frontend (REACT_APP_API_URL=$PUBLIC_URL)"
cd "$APP_DIR/frontend"
REACT_APP_API_URL="$PUBLIC_URL" npm run build

echo "==> [3/6] Pasang systemd service (User=$(whoami), port=$BACKEND_PORT)"
sudo cp "$APP_DIR/deploy/dashboard-it.service" /etc/systemd/system/dashboard-it.service
sudo sed -i \
  -e "s|^User=.*|User=$(whoami)|" \
  -e "s|^WorkingDirectory=.*|WorkingDirectory=$APP_DIR/backend|" \
  -e "s|^ExecStart=.*|ExecStart=$NODE_BIN server.js|" \
  -e "s|^Environment=PORT=.*|Environment=PORT=$BACKEND_PORT|" \
  /etc/systemd/system/dashboard-it.service
sudo systemctl daemon-reload
sudo systemctl enable dashboard-it.service
sudo systemctl restart dashboard-it.service

echo "==> [4/6] Pasang nginx config (server_name=$SERVER_NAME, port=$BACKEND_PORT)"
sudo cp "$APP_DIR/deploy/nginx-dashboard-it.conf" /etc/nginx/sites-available/dashboard-it
sudo sed -i \
  -e "s|__SERVER_NAME__|$SERVER_NAME|" \
  -e "s|__APP_DIR__|$APP_DIR|" \
  -e "s|__BACKEND_PORT__|$BACKEND_PORT|g" \
  /etc/nginx/sites-available/dashboard-it
sudo ln -sf /etc/nginx/sites-available/dashboard-it /etc/nginx/sites-enabled/dashboard-it
sudo nginx -t
sudo systemctl reload nginx

echo "==> [5/6] Cek status backend"
sleep 3
systemctl --no-pager status dashboard-it.service --no-pager | head -n 8 || true

echo "==> [6/6] Buka firewall port 80 (jika ufw aktif)"
if command -v ufw >/dev/null 2>&1; then sudo ufw allow 80/tcp || true; fi

echo ""
echo "Selesai. Buka browser: $PUBLIC_URL"
echo "Log backend : journalctl -u dashboard-it -f"
echo "Status      : systemctl status dashboard-it"
