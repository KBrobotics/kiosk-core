// Mock data for demo mode
import type { Employee, ActiveSession, AttendanceEvent } from '@/types/kiosk';

export const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', name: 'John Smith', role: 'Technician', rfid_uid: 'A1B2C3D4', active: true },
  { id: '2', name: 'Sarah Johnson', role: 'Engineer', rfid_uid: 'E5F6G7H8', active: true },
  { id: '3', name: 'Mike Davis', role: 'Supervisor', rfid_uid: 'I9J0K1L2', active: true },
  { id: '4', name: 'Emily Brown', role: 'Operator', rfid_uid: 'M3N4O5P6', active: true },
  { id: '5', name: 'David Wilson', role: 'Technician', rfid_uid: 'Q7R8S9T0', active: false },
  { id: '6', name: 'Lisa Anderson', role: 'Engineer', rfid_uid: 'U1V2W3X4', active: true },
];

// In-memory state for demo mode
let mockActiveSessions: ActiveSession[] = [
  {
    employee_id: '1',
    rfid_uid: 'A1B2C3D4',
    name: 'John Smith',
    role: 'Technician',
    login_ts: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    source: 'rfid',
  },
  {
    employee_id: '3',
    rfid_uid: 'I9J0K1L2',
    name: 'Mike Davis',
    role: 'Supervisor',
    login_ts: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    source: 'rfid',
  },
];

let mockAttendanceEvents: AttendanceEvent[] = [
  {
    id: '1',
    employee_id: '1',
    rfid_uid: 'A1B2C3D4',
    event_type: 'login',
    ts: new Date(Date.now() - 3600000).toISOString(),
    source: 'rfid',
  },
  {
    id: '2',
    employee_id: '3',
    rfid_uid: 'I9J0K1L2',
    event_type: 'login',
    ts: new Date(Date.now() - 7200000).toISOString(),
    source: 'rfid',
  },
];

let eventIdCounter = 3;

export const mockDataService = {
  getEmployees: (): Employee[] => [...MOCK_EMPLOYEES],
  
  getActiveEmployees: (): Employee[] => MOCK_EMPLOYEES.filter(e => e.active),
  
  getActiveSessions: (): ActiveSession[] => [...mockActiveSessions],
  
  getAttendanceEvents: (): AttendanceEvent[] => [...mockAttendanceEvents],
  
  login: (employeeId: string, source: 'rfid' | 'manual' | 'admin' = 'manual'): { success: boolean; session?: ActiveSession; forcedLogout?: boolean } => {
    const employee = MOCK_EMPLOYEES.find(e => e.id === employeeId);
    if (!employee || !employee.active) {
      return { success: false };
    }
    
    // Check if already logged in - force logout
    const existingSession = mockActiveSessions.find(s => s.employee_id === employeeId);
    let forcedLogout = false;
    
    if (existingSession) {
      // Force logout the existing session
      mockActiveSessions = mockActiveSessions.filter(s => s.employee_id !== employeeId);
      mockAttendanceEvents.push({
        id: String(eventIdCounter++),
        employee_id: employeeId,
        rfid_uid: employee.rfid_uid,
        event_type: 'forced_logout',
        ts: new Date().toISOString(),
        source,
      });
      forcedLogout = true;
    }
    
    // Create new session
    const newSession: ActiveSession = {
      employee_id: employeeId,
      rfid_uid: employee.rfid_uid,
      name: employee.name,
      role: employee.role,
      login_ts: new Date().toISOString(),
      source,
    };
    
    mockActiveSessions.push(newSession);
    mockAttendanceEvents.push({
      id: String(eventIdCounter++),
      employee_id: employeeId,
      rfid_uid: employee.rfid_uid,
      event_type: 'login',
      ts: new Date().toISOString(),
      source,
    });
    
    return { success: true, session: newSession, forcedLogout };
  },
  
  logout: (employeeId: string, source: 'rfid' | 'manual' | 'admin' = 'manual'): { success: boolean } => {
    const session = mockActiveSessions.find(s => s.employee_id === employeeId);
    if (!session) {
      return { success: false };
    }
    
    mockActiveSessions = mockActiveSessions.filter(s => s.employee_id !== employeeId);
    mockAttendanceEvents.push({
      id: String(eventIdCounter++),
      employee_id: employeeId,
      rfid_uid: session.rfid_uid,
      event_type: 'logout',
      ts: new Date().toISOString(),
      source,
    });
    
    return { success: true };
  },
  
  getSessionByEmployeeId: (employeeId: string): ActiveSession | undefined => {
    return mockActiveSessions.find(s => s.employee_id === employeeId);
  },
  
  getSessionByRfid: (rfidUid: string): ActiveSession | undefined => {
    return mockActiveSessions.find(s => s.rfid_uid === rfidUid);
  },
};
