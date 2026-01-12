// InfoKiosk Type Definitions

export interface Employee {
  id: string;
  name: string;
  role: string;
  rfid_uid: string;
  active: boolean;
}

export interface ActiveSession {
  employee_id: string;
  rfid_uid: string;
  name: string;
  role: string;
  login_ts: string;
  source: 'rfid' | 'manual' | 'admin';
}

export interface AttendanceEvent {
  id: string;
  employee_id: string;
  rfid_uid: string;
  event_type: 'login' | 'logout' | 'forced_logout';
  ts: string;
  source: 'rfid' | 'manual' | 'admin';
}

export interface BoardState {
  ts: string;
  active: ActiveSession[];
}

// WebSocket Message Types
export type WSMessageType = 
  | 'status'
  | 'full_state'
  | 'attendance_update'
  | 'ping'
  | 'pong'
  | 'request_full_state';

export interface WSStatusMessage {
  type: 'status';
  connected: boolean;
}

export interface WSFullStateMessage {
  type: 'full_state';
  active: ActiveSession[];
}

export interface WSAttendanceUpdateMessage {
  type: 'attendance_update';
  active: ActiveSession[];
}

export interface WSPingMessage {
  type: 'ping';
}

export interface WSPongMessage {
  type: 'pong';
}

export interface WSRequestFullStateMessage {
  type: 'request_full_state';
}

export type WSServerMessage = 
  | WSStatusMessage 
  | WSFullStateMessage 
  | WSAttendanceUpdateMessage
  | WSPongMessage;

export type WSClientMessage = 
  | WSPingMessage 
  | WSRequestFullStateMessage;

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
