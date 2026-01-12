// InfoKiosk Configuration
// Configure these values to connect to your Node-RED backend

export const KIOSK_CONFIG = {
  // API base URL - change this to your Node-RED instance
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:1880',
  
  // WebSocket URL - change this to your Node-RED WebSocket endpoint
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:1880/ws',
  
  // Reconnection settings
  WS_RECONNECT_INTERVAL: 3000, // ms
  WS_MAX_RECONNECT_ATTEMPTS: 10,
  
  // Ping interval to keep connection alive
  WS_PING_INTERVAL: 30000, // ms
  
  // Demo mode - uses mock data instead of real API
  DEMO_MODE: import.meta.env.VITE_DEMO_MODE !== 'false',
} as const;

// Schema mapping - mirrors the Node-RED schema-map.json structure
export const SCHEMA_MAP = {
  employees_db: {
    employees: {
      table: 'employees',
      columns: {
        id: 'id',
        name: 'name',
        role: 'role',
        rfid_uid: 'rfid_uid',
        active: 'active',
      },
    },
  },
  attendance_db: {
    active_sessions: {
      table: 'active_sessions',
      columns: {
        employee_id: 'employee_id',
        rfid_uid: 'rfid_uid',
        login_ts: 'login_ts',
        source: 'source',
      },
    },
    attendance_events: {
      table: 'attendance_events',
      columns: {
        id: 'id',
        employee_id: 'employee_id',
        rfid_uid: 'rfid_uid',
        event_type: 'event_type',
        ts: 'ts',
        source: 'source',
      },
    },
  },
} as const;
