# InfoKiosk Node-RED Backend

This folder contains the Node-RED flow configuration for the InfoKiosk attendance system.

## Prerequisites

### 1. Install Node-RED
```bash
npm install -g node-red
```

### 2. Install Required Nodes
```bash
cd ~/.node-red
npm install node-red-node-postgresql
```

### 3. Create PostgreSQL Databases

#### employees_db
```sql
CREATE DATABASE employees_db;

\c employees_db

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  rfid_uid VARCHAR(50) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample data
INSERT INTO employees (name, role, rfid_uid) VALUES
  ('John Smith', 'Engineer', 'RFID001'),
  ('Jane Doe', 'Manager', 'RFID002'),
  ('Bob Wilson', 'Technician', 'RFID003');
```

#### attendance_db
```sql
CREATE DATABASE attendance_db;

\c attendance_db

CREATE TABLE active_sessions (
  employee_id UUID PRIMARY KEY,
  rfid_uid VARCHAR(50) NOT NULL,
  login_ts TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(20) DEFAULT 'rfid'
);

CREATE TABLE attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  rfid_uid VARCHAR(50) NOT NULL,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('login', 'logout')),
  ts TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(20) DEFAULT 'rfid'
);

CREATE TABLE employee_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  target_type VARCHAR(20) DEFAULT 'all' CHECK (target_type IN ('all', 'employee', 'role')),
  target_value VARCHAR(255),
  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 5),
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_to TIMESTAMP WITH TIME ZONE,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_attendance_events_employee ON attendance_events(employee_id);
CREATE INDEX idx_attendance_events_ts ON attendance_events(ts);
CREATE INDEX idx_messages_target ON employee_messages(target_type, target_value);
CREATE INDEX idx_messages_validity ON employee_messages(valid_from, valid_to) WHERE enabled = true;
```

## Import Flow

1. Start Node-RED: `node-red`
2. Open browser: `http://localhost:1880`
3. Menu → Import → Select file → Choose `infokiosk-flows.json`
4. Click "Import"

## Configure Database Connections

After importing, configure the PostgreSQL nodes:

### employees-db
1. Double-click any PostgreSQL node connected to employees
2. Click the pencil icon next to the Server dropdown
3. Configure:
   - Host: `localhost` (or your DB host)
   - Port: `5432`
   - Database: `employees_db`
   - User: `postgres`
   - Password: your password

### attendance-db
1. Double-click any PostgreSQL node connected to attendance
2. Click the pencil icon next to the Server dropdown
3. Configure:
   - Host: `localhost` (or your DB host)
   - Port: `5432`
   - Database: `attendance_db`
   - User: `postgres`
   - Password: your password

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List all employees |
| GET | `/api/employees/:id` | Get employee by ID |
| GET | `/api/employees/rfid/:uid` | Get employee by RFID UID |
| GET | `/api/board/today` | Get active sessions with employee info |
| POST | `/api/session/login` | Login employee |
| POST | `/api/session/logout` | Logout employee |
| GET | `/api/session/:id` | Get session by employee ID |
| GET | `/api/messages` | List all messages |
| POST | `/api/messages` | Create new message |
| PUT | `/api/messages/:id` | Update message |
| DELETE | `/api/messages/:id` | Delete message |
| GET | `/api/messages/employee/:id` | Get messages for specific employee |

## WebSocket

Connect to: `ws://localhost:1880/ws`

### Server → Client Messages

```json
// Full state (on connect or request)
{
  "type": "full_state",
  "payload": {
    "activeSessions": [...],
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

// Attendance update (on login/logout)
{
  "type": "attendance_update",
  "payload": {
    "activeSessions": [...],
    "event": { "type": "login", "employeeId": "..." }
  }
}

// RFID detected
{
  "type": "rfid_detected",
  "payload": {
    "rfid_uid": "RFID001",
    "employee": { ... } | null
  }
}

// Login/Logout success
{
  "type": "login_success" | "logout_success",
  "payload": {
    "employee": { ... },
    "session": { ... },
    "messages": [...] // Only for login_success
  }
}

// Error
{
  "type": "login_error" | "logout_error",
  "payload": {
    "error": "Error message"
  }
}

// Pong (keepalive response)
{
  "type": "pong"
}
```

### Client → Server Messages

```json
// Request full state
{
  "type": "request_full_state"
}

// Ping (keepalive)
{
  "type": "ping"
}

// Login request (from RFID scan)
{
  "type": "login_request",
  "payload": {
    "rfid_uid": "RFID001",
    "source": "rfid"
  }
}

// Logout request
{
  "type": "logout_request",
  "payload": {
    "employee_id": "uuid",
    "source": "rfid"
  }
}
```

## Frontend Configuration

In your React app, set these environment variables:

```env
VITE_API_BASE_URL=http://localhost:1880
VITE_WS_URL=ws://localhost:1880/ws
VITE_DEMO_MODE=false
```

## Schema Mapping

The `schema-map.json` file allows you to customize table and column names without modifying the flows. If your database schema differs, update this file accordingly.

## Troubleshooting

### CORS Issues
If you get CORS errors, add these headers in the HTTP response nodes:
- `Access-Control-Allow-Origin`: `*` (or your frontend URL)
- `Access-Control-Allow-Methods`: `GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type`

### Database Connection Failed
1. Verify PostgreSQL is running
2. Check credentials in the config nodes
3. Ensure databases exist
4. Check firewall/network settings

### WebSocket Not Connecting
1. Verify the WebSocket In node is deployed
2. Check the path matches (`/ws`)
3. Verify no firewall blocking WebSocket connections
