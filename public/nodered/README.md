# InfoKiosk Node-RED Backend (Raspberry Pi)

Lightweight Node-RED backend for Raspberry Pi deployment.

## Requirements

- Node-RED
- MySQL/MariaDB
- node-red-node-mysql

## Quick Install on Raspberry Pi

```bash
# Clone repository
git clone https://github.com/YOUR_REPO/infokiosk.git
cd infokiosk

# Install Node-RED (if not installed)
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)

# Install MySQL node
cd ~/.node-red
npm install node-red-node-mysql

# Start Node-RED
node-red
```

## MySQL Setup

```sql
CREATE DATABASE infokiosk;
CREATE USER 'infokiosk'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON infokiosk.* TO 'infokiosk'@'localhost';
FLUSH PRIVILEGES;
```

Tables are created automatically on first startup.

## Import Flow

1. Open Node-RED: `http://raspberrypi:1880`
2. Menu → Import → Select `infokiosk-flows.json`
3. Deploy
4. Configure MySQL node with your credentials

## Static Files

Copy static files to Node-RED directory:
```bash
cp -r public/worker ~/.node-red/static/
cp -r public/admin ~/.node-red/static/
```

## Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | /worker | Worker kiosk UI |
| GET | /admin | Admin panel |
| POST | /api/rfid | RFID card scan |
| GET | /api/employees | List employees |
| GET | /api/board/today | Active sessions |
| GET | /api/messages | List messages |
| POST | /api/messages | Create message |
| PUT | /api/messages/:id | Update message |
| DELETE | /api/messages/:id | Delete message |
| WS | /ws | WebSocket |

## Portainer Deployment

If using Portainer, create a stack with:

```yaml
version: '3'
services:
  nodered:
    image: nodered/node-red:latest
    ports:
      - "1880:1880"
    volumes:
      - ./data:/data
      - ./static:/data/static
    environment:
      - TZ=Europe/Warsaw
    restart: unless-stopped
```

Then install mysql node inside container:
```bash
docker exec -it nodered_container npm install node-red-node-mysql
```

## No Docker Alternative

For native install (lighter):
```bash
# Enable Node-RED service
sudo systemctl enable nodered.service
sudo systemctl start nodered.service
```
