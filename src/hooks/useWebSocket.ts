// WebSocket hook for real-time updates from Node-RED
import { useState, useEffect, useCallback, useRef } from 'react';
import { KIOSK_CONFIG } from '@/config/kiosk';
import type { WSServerMessage, WSClientMessage, ActiveSession } from '@/types/kiosk';

interface WebSocketState {
  connected: boolean;
  activeSessions: ActiveSession[];
  lastUpdate: Date | null;
  error: string | null;
}

export const useKioskWebSocket = () => {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    activeSessions: [],
    lastUpdate: null,
    error: null,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (KIOSK_CONFIG.DEMO_MODE) {
      console.log('[WS] Demo mode - WebSocket disabled');
      setState(prev => ({ ...prev, connected: true, error: null }));
      return;
    }

    try {
      console.log('[WS] Connecting to:', KIOSK_CONFIG.WS_URL);
      const ws = new WebSocket(KIOSK_CONFIG.WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        reconnectAttemptsRef.current = 0;
        setState(prev => ({ ...prev, connected: true, error: null }));
        
        // Request full state on connect
        sendMessage({ type: 'request_full_state' });
        
        // Start ping interval
        pingIntervalRef.current = window.setInterval(() => {
          sendMessage({ type: 'ping' });
        }, KIOSK_CONFIG.WS_PING_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const message: WSServerMessage = JSON.parse(event.data);
          console.log('[WS] Received:', message.type);
          
          switch (message.type) {
            case 'status':
              setState(prev => ({ ...prev, connected: message.connected }));
              break;
            case 'full_state':
            case 'attendance_update':
              setState(prev => ({
                ...prev,
                activeSessions: message.active,
                lastUpdate: new Date(),
              }));
              break;
            case 'pong':
              // Heartbeat acknowledged
              break;
          }
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        setState(prev => ({ ...prev, error: 'WebSocket error' }));
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        setState(prev => ({ ...prev, connected: false }));
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Attempt reconnection
        if (reconnectAttemptsRef.current < KIOSK_CONFIG.WS_MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = KIOSK_CONFIG.WS_RECONNECT_INTERVAL * Math.min(reconnectAttemptsRef.current, 5);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        } else {
          setState(prev => ({ ...prev, error: 'Max reconnection attempts reached' }));
        }
      };
    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
      setState(prev => ({ ...prev, error: String(error) }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState(prev => ({ ...prev, connected: false }));
  }, []);

  const sendMessage = useCallback((message: WSClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const requestFullState = useCallback(() => {
    sendMessage({ type: 'request_full_state' });
  }, [sendMessage]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    requestFullState,
  };
};
