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

// Message types for admin-managed messages
export interface KioskMessage {
  id: string;
  title: string;
  body: string;
  target_type: 'all' | 'role' | 'employee';
  target_value: string | null;
  priority: number; // 1 = high, 2 = medium, 3 = low
  valid_from?: string;
  valid_to?: string;
  enabled?: boolean;
  created_at?: string;
}

// Worker Kiosk States
export type WorkerKioskState = 
  | 'IDLE'
  | 'CARD_DETECTED'
  | 'PROCESSING'
  | 'RESULT'
  | 'MESSAGES';

export interface WorkerKioskResult {
  type: 'success' | 'error';
  message: string;
  detail: string;
}

// WebSocket Message Types
export type WSMessageType = 
  | 'status'
  | 'full_state'
  | 'attendance_update'
  | 'ping'
  | 'pong'
  | 'request_full_state'
  | 'rfid_detected'
  | 'login_success'
  | 'login_error'
  | 'logout_success'
  | 'logout_error'
  | 'timeout'
  | 'processing';

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

export interface WSRfidDetectedMessage {
  type: 'rfid_detected';
  rfid_uid: string;
  employee?: Employee;
}

export interface WSLoginSuccessMessage {
  type: 'login_success';
  employee: Employee;
  messages?: KioskMessage[];
}

export interface WSLoginErrorMessage {
  type: 'login_error';
  reason: string;
  details?: string;
}

export interface WSLogoutSuccessMessage {
  type: 'logout_success';
  employee: Employee;
}

export interface WSLogoutErrorMessage {
  type: 'logout_error';
  reason: string;
  details?: string;
}

export interface WSTimeoutMessage {
  type: 'timeout';
  rfid_uid: string;
}

export interface WSProcessingMessage {
  type: 'processing';
}

export type WSServerMessage = 
  | WSStatusMessage 
  | WSFullStateMessage 
  | WSAttendanceUpdateMessage
  | WSPongMessage
  | WSRfidDetectedMessage
  | WSLoginSuccessMessage
  | WSLoginErrorMessage
  | WSLogoutSuccessMessage
  | WSLogoutErrorMessage
  | WSTimeoutMessage
  | WSProcessingMessage;

export type WSClientMessage = 
  | WSPingMessage 
  | WSRequestFullStateMessage;

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
