# InfoKiosk - Raspberry Pi Deployment Guide

Complete self-contained deployment - **no manual configuration required** after deployment.

## Quick Start

### 1. Clone Repository on Raspberry Pi

```bash
cd /home/pi
git clone https://github.com/YOUR_USERNAME/infokiosk.git
cd infokiosk
```

### 2. Deploy via Portainer

1. Open Portainer: `http://<PI_IP>:9000`
2. Go to **Stacks** → **Add stack**
3. Name: `infokiosk`
4. Build method: **Repository**
   - Repository URL: `/home/pi/infokiosk` (local path)
   - OR use your Git repository URL
5. Click **Deploy the stack**

### 3. Wait for Deployment (~2-3 minutes)

The stack will:
- Start MariaDB and wait for it to be healthy
- Start Node-RED with pre-installed MySQL node
- Auto-load flows and configuration
- Create database tables on first run

### 4. Access Your Application

| Service | URL |
|---------|-----|
| Worker Kiosk | `http://<PI_IP>:8002/worker` |
| Admin Panel | `http://<PI_IP>:8002/admin` |
| Node-RED Editor | `http://<PI_IP>:8002` |
| API Test | `http://<PI_IP>:8002/api/test/db` |

## What's Included

### Auto-Configured Components

- ✅ **MariaDB** - Database with healthcheck
- ✅ **Node-RED** - With MySQL node pre-installed
- ✅ **Flows** - Pre-loaded with correct DB credentials
- ✅ **Static Files** - Worker and Admin dashboards
- ✅ **Database Tables** - Auto-created on startup

### Database Configuration

| Setting | Value |
|---------|-------|
| Host | `infokiosk-db` |
| Port | `3306` |
| Database | `infokiosk` |
| User | `infokiosk` |
| Password | `infokiosk_pass` |

## Troubleshooting

### Check Container Status
```bash
docker ps
docker logs infokiosk
docker logs infokiosk-db
```

### Verify Database Connection
```bash
curl http://localhost:8002/api/test/db
```

### Restart Stack
```bash
docker-compose restart
```

### Complete Reset
```bash
docker-compose down -v  # Warning: deletes all data
docker-compose up -d
```

## File Structure

```
infokiosk/
├── docker-compose.yml          # Main deployment file
├── public/
│   ├── nodered/
│   │   ├── infokiosk-flows.json  # Node-RED flows
│   │   ├── package.json          # Node-RED dependencies
│   │   └── settings.js           # Node-RED settings
│   ├── worker/
│   │   ├── index.html            # Worker kiosk UI
│   │   ├── app.js
│   │   └── styles.css
│   └── admin/
│       ├── index.html            # Admin panel UI
│       ├── app.js
│       └── styles.css
└── DEPLOYMENT.md                 # This file
```

## Updating

To update after code changes:

```bash
cd /home/pi/infokiosk
git pull
docker-compose restart nodered
```

## Security Notes

⚠️ **For production use:**

1. Change default database passwords in `docker-compose.yml`
2. Add Node-RED admin authentication in `settings.js`
3. Configure firewall to restrict access
4. Use HTTPS with a reverse proxy (nginx/traefik)
