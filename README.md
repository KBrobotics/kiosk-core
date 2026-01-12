# InfoKiosk - Employee Attendance System

A kiosk-based attendance tracking system designed for shop-floor environments with RFID card support, physical button interaction, and real-time updates.

## Overview

InfoKiosk provides:
- **Worker Kiosk** (`/worker`) - Employee login/logout station
- **Attendance Board** (`/board`) - Real-time presence display
- **Admin Panel** (`/admin`) - Message management for supervisors

## Admin Panel UI

The Admin Panel (`/admin` or `/public/admin/index.html`) provides message management capabilities for supervisors and office staff.

### Features

- **Authentication**: Simple username/password login with HTTP Basic Auth
- **Message CRUD**: Create, read, update, and delete employee messages
- **Message Targeting**: Send messages to all employees, specific roles, or individual employees
- **Priority Levels**: Set message priority (1-5) for display ordering
- **Validity Windows**: Schedule when messages become active/expire
- **Enable/Disable**: Quickly toggle messages without deleting
- **Real-time Sync**: WebSocket updates when messages change

### Security Model

Admin authentication uses HTTP Basic Auth with credentials from environment variables:

```bash
# Set in Node-RED environment
ADMIN_USER=admin
ADMIN_PASSWORD=your_secure_password
```

**Security Notes:**
- All `/api/admin/*` endpoints require authentication
- Credentials are never stored in frontend code
- Session is stored in browser localStorage (base64 token)
- Logout clears session completely

### Message Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `title` | string | Message title (max 100 chars) |
| `body` | string | Message content (max 1000 chars) |
| `target_type` | enum | `all`, `role`, or `employee` |
| `target_value` | string | Role name or employee ID (null for "all") |
| `priority` | integer | 1 (low) to 5 (critical) |
| `valid_from` | datetime | When message becomes active |
| `valid_to` | datetime | When message expires |
| `enabled` | boolean | Whether message is active |

### Message Targeting Rules

| Target Type | Target Value | Who Sees It |
|-------------|--------------|-------------|
| `all` | (ignored) | All employees |
| `role` | Role name (e.g., "operator") | Employees with that role |
| `employee` | Employee ID | Only that specific employee |

### REST API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/messages` | GET | List all messages |
| `/api/admin/messages` | POST | Create new message |
| `/api/admin/messages/:id` | PUT | Update message |
| `/api/admin/messages/:id` | DELETE | Delete message |

All endpoints require `Authorization: Basic <token>` header.

### Configuration

Configuration is at the top of `public/admin/app.js`:

```javascript
const CONFIG = {
  API_BASE_URL: '/api/admin',      // REST API endpoint
  WS_URL: 'ws://localhost/ws',     // WebSocket for real-time updates
  SESSION_KEY: 'infokiosk_admin_session',
  TOAST_DURATION: 4000,            // Notification duration (ms)
  TITLE_MAX_LENGTH: 100,           // Max title characters
  BODY_MAX_LENGTH: 1000,           // Max body characters
  DEBUG: true                      // Console logging
};
```

### How to Login

1. Navigate to `/admin` in your browser
2. Enter the admin username and password
3. Click "Sign In"

If credentials are incorrect, an error message will be displayed.

---

## Worker Kiosk UI

The Worker Kiosk (`/worker` or `/public/worker/index.html`) is designed for shop-floor use with RFID readers and physical buttons.

### UI States

| State | Description | User Feedback |
|-------|-------------|---------------|
| **IDLE** | Waiting for card scan | "Please scan your card" with pulsing RFID icon |
| **CARD_DETECTED** | Card scanned, awaiting action | Shows employee name, GREEN/RED button instructions, countdown timer |
| **PROCESSING** | Action in progress | Spinner with "Processing..." |
| **RESULT** | Action complete | Success (green checkmark) or Error (red X) with message |
| **MESSAGES** | Post-login messages | Displays employee messages, auto-dismisses |

### Interaction Flow

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   IDLE ──(RFID scan)──> CARD_DETECTED                   │
│     ▲                        │                          │
│     │                  ┌─────┴─────┐                    │
│     │                  │           │                    │
│     │           (GREEN btn)   (RED btn)                 │
│     │                  │           │                    │
│     │                  ▼           ▼                    │
│     │              PROCESSING  PROCESSING               │
│     │                  │           │                    │
│     │                  ▼           ▼                    │
│     │               RESULT     RESULT                   │
│     │                  │           │                    │
│     │          ┌───────┴───┐      │                    │
│     │          │           │      │                    │
│     │      (messages)  (no msgs)  │                    │
│     │          │           │      │                    │
│     │          ▼           │      │                    │
│     │      MESSAGES        │      │                    │
│     │          │           │      │                    │
│     └──────────┴───────────┴──────┘                    │
│                                                         │
│         (timeout at any point returns to IDLE)          │
└─────────────────────────────────────────────────────────┘
```

### RFID Input Methods

#### Primary: Serial RFID (Backend)
- RFID reader connected via USB/Serial to Raspberry Pi
- Node-RED reads serial input and emits `rfid_detected` event

#### Secondary: HID RFID (Frontend Fallback)
- RFID reader that emulates keyboard input
- Frontend captures input via hidden text field
- Sends `hid_rfid_scan` message to backend

### Configuration

All configuration is at the top of `public/worker/app.js`:

```javascript
const CONFIG = {
  WS_URL: 'ws://localhost/ws',           // WebSocket endpoint
  WS_RECONNECT_INTERVAL: 2000,           // Reconnect delay (ms)
  WS_MAX_RECONNECT_ATTEMPTS: 50,         // Max reconnection tries
  PENDING_UID_TIMEOUT: 10000,            // Card timeout (ms)
  RESULT_DISPLAY_TIMEOUT: 4000,          // Result screen duration
  MESSAGES_DISPLAY_TIMEOUT: 15000,       // Messages screen duration
  HID_RFID_ENABLED: true,                // Enable keyboard RFID fallback
  DEBUG: true                            // Enable console logging
};
```

### WebSocket Events

**Incoming (from backend):**

| Event | Description |
|-------|-------------|
| `rfid_detected` | Card scanned, includes `rfid_uid` and optional `employee` |
| `login_success` | Login completed, includes `employee` and `messages` |
| `login_error` | Login failed, includes `reason` |
| `logout_success` | Logout completed |
| `logout_error` | Logout failed, includes `reason` |
| `timeout` | Pending UID expired |
| `processing` | Action in progress |
| `status` | Connection status update |
| `full_state` | Complete state sync |

**Outgoing (to backend):**

| Event | Description |
|-------|-------------|
| `request_full_state` | Request current state on connect |
| `hid_rfid_scan` | HID RFID input from frontend |
| `ping` | Heartbeat |

### Testing Without Hardware

1. Open browser console on `/worker` page
2. Simulate events:

```javascript
// Simulate RFID scan
InfoKiosk.handleServerMessage({
  type: 'rfid_detected',
  rfid_uid: 'ABC12345',
  employee: { id: '1', name: 'John Doe' }
});

// Simulate login success
InfoKiosk.handleServerMessage({
  type: 'login_success',
  employee: { id: '1', name: 'John Doe' },
  messages: [
    { title: 'Welcome', body: 'Team meeting at 2pm', priority: 'high' }
  ]
});

// Simulate error
InfoKiosk.handleServerMessage({
  type: 'login_error',
  reason: 'unknown_rfid'
});
```

---

## Architecture

### Files

```
public/
├── worker/
│   ├── index.html    # Worker kiosk HTML
│   ├── styles.css    # High-contrast kiosk styles
│   └── app.js        # State machine, WebSocket, event handling
├── admin/
│   ├── index.html    # Admin panel HTML
│   ├── styles.css    # Office-friendly styles
│   └── app.js        # Auth, CRUD, message management

src/
├── pages/
│   ├── WorkerKiosk.tsx    # React version (alternative)
│   ├── AttendanceBoard.tsx
│   └── AdminPanel.tsx
├── components/kiosk/
│   ├── Clock.tsx
│   ├── EmployeeCard.tsx
│   ├── KioskHeader.tsx
│   └── StatusIndicator.tsx
├── services/
│   ├── api.ts            # REST API client
│   └── mockData.ts       # Demo mode data
├── hooks/
│   └── useWebSocket.ts   # WebSocket hook
├── config/
│   └── kiosk.ts          # Configuration
└── types/
    └── kiosk.ts          # TypeScript types
```

### Demo Mode

Set environment variables for demo mode (no backend required):

```bash
VITE_DEMO_MODE=true
```

### Connecting to Node-RED

```bash
VITE_API_BASE_URL=http://your-pi:1880/api
VITE_WS_URL=ws://your-pi:1880/ws
VITE_DEMO_MODE=false
```

---

## Node-RED Integration

### Expected Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/board/today` | GET | Active sessions for board |
| `/api/employees` | GET | All employees |
| `/api/session/login` | POST | Start session |
| `/api/session/logout` | POST | End session |
| `/api/session/:employeeId` | GET | Check active session |
| `/api/admin/messages` | GET/POST | Admin message management |
| `/api/admin/messages/:id` | PUT/DELETE | Individual message operations |
| `/ws` | WebSocket | Real-time updates |

### GPIO Button Configuration

For Raspberry Pi with Node-RED:

| Button | GPIO Pin | Action |
|--------|----------|--------|
| GREEN | Configurable | Login |
| RED | Configurable | Logout |

---

## Technologies

- **Frontend**: Vanilla JS (Worker Kiosk, Admin), React + TypeScript (Board)
- **Styling**: Custom CSS (Vanilla), Tailwind CSS (React)
- **Backend**: Node-RED on Raspberry Pi
- **Communication**: WebSocket + REST fallback
- **Hardware**: Serial RFID, GPIO buttons

---

## Deployment

### Raspberry Pi Setup

1. Install Node-RED
2. Import provided flows
3. Copy `public/worker/` and `public/admin/` to Node-RED static folder
4. Set admin credentials in Node-RED environment
5. Configure RFID reader and GPIO pins
6. Access at:
   - Worker: `http://pi-address:1880/worker`
   - Admin: `http://pi-address:1880/admin`

### Development

```bash
npm install
npm run dev
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| "Offline" status | Check WebSocket URL, ensure Node-RED is running |
| No RFID detection | Verify serial port config, check Node-RED flow |
| Buttons not working | Check GPIO wiring, verify debounce settings |
| Timeout too fast | Increase `PENDING_UID_TIMEOUT` in config |
| Admin login fails | Verify ADMIN_USER and ADMIN_PASSWORD env vars |
| Session expired | Re-login; session stored in localStorage |
