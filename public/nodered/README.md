# InfoKiosk - Raspberry Pi Deployment

Lightweight attendance kiosk for Raspberry Pi (ARM64/ARM32).

## Quick Start (Portainer)

1. **Clone repo on Pi:**
```bash
git clone https://github.com/YOUR_REPO/infokiosk.git
cd infokiosk
```

2. **In Portainer:** Stacks → Add Stack → Upload `docker-compose.yml`

3. **Install MySQL node** (one-time, after first deploy):
```bash
docker exec -it infokiosk npm install node-red-node-mysql
docker restart infokiosk
```

4. **Import flow:**
   - Open `http://<PI_IP>:1880`
   - Menu → Import → Upload `public/nodered/infokiosk-flows.json`
   - Configure MySQL node: host=`infokiosk-db`, user=`infokiosk`, pass=`infokiosk_pass`, db=`infokiosk`

5. **Access:**
   - Worker Kiosk: `http://<PI_IP>:1880/worker`
   - Admin Panel: `http://<PI_IP>:1880/admin`

---

## Native Install (No Docker)

```bash
# 1. Install Node-RED
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)

# 2. Install MariaDB
sudo apt install mariadb-server -y
sudo mysql_secure_installation

# 3. Setup database
sudo mysql -e "CREATE DATABASE infokiosk; CREATE USER 'infokiosk'@'localhost' IDENTIFIED BY 'your_password'; GRANT ALL PRIVILEGES ON infokiosk.* TO 'infokiosk'@'localhost'; FLUSH PRIVILEGES;"

# 4. Install MySQL node
cd ~/.node-red && npm install node-red-node-mysql

# 5. Copy static files
cp -r public/worker ~/.node-red/static/
cp -r public/admin ~/.node-red/static/

# 6. Enable & start
sudo systemctl enable nodered.service
sudo systemctl start nodered.service
```

Then import `infokiosk-flows.json` via Node-RED UI.

---

## Endpoints

| URL | Description |
|-----|-------------|
| `/worker` | Worker kiosk UI |
| `/admin` | Admin panel |
| `/api/rfid` | POST - RFID scan |
| `/api/employees` | GET - List employees |
| `/api/board/today` | GET - Active sessions |
| `/api/messages` | GET/POST - Messages |
| `/ws` | WebSocket |

---

## Raspberry Pi Compatibility

| Pi Model | Docker | Native |
|----------|--------|--------|
| Pi 5 | ✅ | ✅ |
| Pi 4 | ✅ | ✅ |
| Pi 3 | ⚠️ Use hypriot/rpi-mysql | ✅ |
| Pi Zero 2 | ⚠️ Slow | ✅ |

---

## Auto-Start Kiosk (Native)

Create `/etc/xdg/autostart/kiosk.desktop`:
```ini
[Desktop Entry]
Type=Application
Name=InfoKiosk
Exec=chromium-browser --kiosk --noerrdialogs http://localhost:1880/worker
```
