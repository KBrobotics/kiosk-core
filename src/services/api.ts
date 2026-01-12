// API Service - connects to Node-RED backend or uses mock data
import { KIOSK_CONFIG } from '@/config/kiosk';
import { mockDataService } from './mockData';
import type { Employee, ActiveSession, BoardState, ApiResponse } from '@/types/kiosk';

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const kioskApi = {
  // Get current board state (employees present today)
  getBoardState: async (): Promise<ApiResponse<BoardState>> => {
    if (KIOSK_CONFIG.DEMO_MODE) {
      const active = mockDataService.getActiveSessions();
      return {
        success: true,
        data: {
          ts: new Date().toISOString(),
          active,
        },
      };
    }
    
    try {
      const response = await fetchWithTimeout(`${KIOSK_CONFIG.API_BASE_URL}/api/board/today`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Failed to fetch board state:', error);
      return { success: false, error: String(error) };
    }
  },
  
  // Get all employees
  getEmployees: async (): Promise<ApiResponse<Employee[]>> => {
    if (KIOSK_CONFIG.DEMO_MODE) {
      return {
        success: true,
        data: mockDataService.getEmployees(),
      };
    }
    
    try {
      const response = await fetchWithTimeout(`${KIOSK_CONFIG.API_BASE_URL}/api/employees`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      return { success: false, error: String(error) };
    }
  },
  
  // Get active employees only
  getActiveEmployees: async (): Promise<ApiResponse<Employee[]>> => {
    if (KIOSK_CONFIG.DEMO_MODE) {
      return {
        success: true,
        data: mockDataService.getActiveEmployees(),
      };
    }
    
    try {
      const response = await fetchWithTimeout(`${KIOSK_CONFIG.API_BASE_URL}/api/employees?active=true`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Failed to fetch active employees:', error);
      return { success: false, error: String(error) };
    }
  },
  
  // Login an employee
  login: async (employeeId: string, source: 'rfid' | 'manual' | 'admin' = 'manual'): Promise<ApiResponse<ActiveSession>> => {
    if (KIOSK_CONFIG.DEMO_MODE) {
      const result = mockDataService.login(employeeId, source);
      if (result.success && result.session) {
        return { success: true, data: result.session };
      }
      return { success: false, error: 'Login failed' };
    }
    
    try {
      const response = await fetchWithTimeout(`${KIOSK_CONFIG.API_BASE_URL}/api/session/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, source }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: String(error) };
    }
  },
  
  // Logout an employee
  logout: async (employeeId: string, source: 'rfid' | 'manual' | 'admin' = 'manual'): Promise<ApiResponse<void>> => {
    if (KIOSK_CONFIG.DEMO_MODE) {
      const result = mockDataService.logout(employeeId, source);
      return { success: result.success, error: result.success ? undefined : 'Logout failed' };
    }
    
    try {
      const response = await fetchWithTimeout(`${KIOSK_CONFIG.API_BASE_URL}/api/session/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, source }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error: String(error) };
    }
  },
  
  // Get session for a specific employee
  getSession: async (employeeId: string): Promise<ApiResponse<ActiveSession | null>> => {
    if (KIOSK_CONFIG.DEMO_MODE) {
      const session = mockDataService.getSessionByEmployeeId(employeeId);
      return { success: true, data: session || null };
    }
    
    try {
      const response = await fetchWithTimeout(`${KIOSK_CONFIG.API_BASE_URL}/api/session/${employeeId}`);
      if (response.status === 404) {
        return { success: true, data: null };
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Failed to fetch session:', error);
      return { success: false, error: String(error) };
    }
  },
};
