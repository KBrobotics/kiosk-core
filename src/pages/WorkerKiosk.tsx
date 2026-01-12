// Worker Kiosk Page - GDPR-Compliant RFID Login/Logout Station
// No employee list displayed - only RFID scan with timed button press

import { useState, useEffect, useCallback } from 'react';
import { KioskHeader } from '@/components/kiosk/KioskHeader';
import { Clock } from '@/components/kiosk/Clock';
import { CountdownTimer } from '@/components/kiosk/CountdownTimer';
import { MessageDisplay } from '@/components/kiosk/MessageDisplay';
import { RfidInput } from '@/components/kiosk/RfidInput';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { kioskApi } from '@/services/api';
import { useKioskWebSocket } from '@/hooks/useWebSocket';
import { KIOSK_CONFIG } from '@/config/kiosk';
import { 
  Fingerprint, 
  LogIn, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  MessageSquare
} from 'lucide-react';
import type { 
  Employee, 
  KioskMessage, 
  WorkerKioskState, 
  WorkerKioskResult 
} from '@/types/kiosk';
import { cn } from '@/lib/utils';

const WorkerKiosk = () => {
  // State machine
  const [currentState, setCurrentState] = useState<WorkerKioskState>('IDLE');
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [pendingEmployee, setPendingEmployee] = useState<Employee | null>(null);
  const [result, setResult] = useState<WorkerKioskResult | null>(null);
  const [messages, setMessages] = useState<KioskMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const { connected } = useKioskWebSocket();

  // Reset to idle state
  const resetToIdle = useCallback(() => {
    setCurrentState('IDLE');
    setPendingUid(null);
    setPendingEmployee(null);
    setResult(null);
    setMessages([]);
    setLoading(false);
  }, []);

  // Handle RFID detection - fetch employee info and messages
  const handleRfidDetected = useCallback(async (uid: string) => {
    if (currentState !== 'IDLE') {
      console.log('[Worker] Ignoring RFID scan - not in IDLE state');
      return;
    }

    console.log('[Worker] RFID detected:', uid);
    setPendingUid(uid);
    
    // Fetch employee info and messages
    if (KIOSK_CONFIG.DEMO_MODE) {
      const response = await kioskApi.getActiveEmployees();
      if (response.success && response.data) {
        const employee = response.data.find(e => e.rfid_uid === uid);
        setPendingEmployee(employee || null);
        
        // Fetch messages for this employee (demo mode - simulated admin messages)
        const employeeMessages: KioskMessage[] = [];
        
        // Simulated messages that would come from admin panel
        if (employee) {
          // Personal messages for specific employee
          employeeMessages.push({
            id: 'msg-personal-1',
            title: 'New Safety Shoes Available',
            body: 'Your new safety shoes are ready for pickup at the office. Please collect them before your next shift.',
            target_type: 'employee',
            target_value: employee.id,
            priority: 2,
            valid_from: new Date().toISOString(),
            valid_to: new Date(Date.now() + 86400000 * 7).toISOString(),
            enabled: true
          });
          
          // Role-based message
          if (employee.role === 'Technician') {
            employeeMessages.push({
              id: 'msg-role-1',
              title: 'Medical Checkup Required',
              body: 'All technicians must complete their annual medical checkup by end of month. Schedule with HR.',
              target_type: 'role',
              target_value: 'Technician',
              priority: 3,
              valid_from: new Date().toISOString(),
              valid_to: new Date(Date.now() + 86400000 * 14).toISOString(),
              enabled: true
            });
          }
        }
        
        // General announcement for everyone
        employeeMessages.push({
          id: 'msg-all-1',
          title: 'Fire Drill Today',
          body: 'Fire drill scheduled for 14:00. Please familiarize yourself with evacuation routes.',
          target_type: 'all',
          target_value: null,
          priority: 1,
          valid_from: new Date().toISOString(),
          valid_to: new Date(Date.now() + 86400000).toISOString(),
          enabled: true
        });
        
        setMessages(employeeMessages);
      }
    }
    
    setCurrentState('CARD_DETECTED');
  }, [currentState]);

  // Handle login button press
  const handleLogin = useCallback(async () => {
    if (!pendingUid || loading) return;

    setLoading(true);
    setCurrentState('PROCESSING');

    try {
      // In demo mode, simulate login
      const employeeId = pendingEmployee?.id || pendingUid;
      const response = await kioskApi.login(employeeId, 'rfid');

      if (response.success && response.data) {
        setResult({
          type: 'success',
          message: 'Logged In Successfully',
          detail: pendingEmployee?.name 
            ? `Welcome, ${pendingEmployee.name}!` 
            : 'Welcome!'
        });
        setCurrentState('RESULT');

        // Show result briefly then reset
        setTimeout(resetToIdle, KIOSK_CONFIG.RESULT_DISPLAY_TIMEOUT);
      } else {
        setResult({
          type: 'error',
          message: 'Login Failed',
          detail: response.error || 'An error occurred'
        });
        setCurrentState('RESULT');
        
        setTimeout(resetToIdle, KIOSK_CONFIG.RESULT_DISPLAY_TIMEOUT);
      }
    } catch (error) {
      console.error('[Worker] Login error:', error);
      setResult({
        type: 'error',
        message: 'Login Failed',
        detail: 'System error. Please try again.'
      });
      setCurrentState('RESULT');
      
      setTimeout(resetToIdle, KIOSK_CONFIG.RESULT_DISPLAY_TIMEOUT);
    } finally {
      setLoading(false);
    }
  }, [pendingUid, pendingEmployee, loading, messages.length, resetToIdle]);

  // Handle logout button press
  const handleLogout = useCallback(async () => {
    if (!pendingUid || loading) return;

    setLoading(true);
    setCurrentState('PROCESSING');

    try {
      const employeeId = pendingEmployee?.id || pendingUid;
      const response = await kioskApi.logout(employeeId, 'rfid');

      if (response.success) {
        setResult({
          type: 'success',
          message: 'Logged Out Successfully',
          detail: pendingEmployee?.name 
            ? `Goodbye, ${pendingEmployee.name}!` 
            : 'Goodbye!'
        });
      } else {
        setResult({
          type: 'error',
          message: 'Logout Failed',
          detail: response.error || 'An error occurred'
        });
      }
      
      setCurrentState('RESULT');
      setTimeout(resetToIdle, KIOSK_CONFIG.RESULT_DISPLAY_TIMEOUT);
    } catch (error) {
      console.error('[Worker] Logout error:', error);
      setResult({
        type: 'error',
        message: 'Logout Failed',
        detail: 'System error. Please try again.'
      });
      setCurrentState('RESULT');
      
      setTimeout(resetToIdle, KIOSK_CONFIG.RESULT_DISPLAY_TIMEOUT);
    } finally {
      setLoading(false);
    }
  }, [pendingUid, pendingEmployee, loading, resetToIdle]);

  // Handle countdown timeout
  const handleTimeout = useCallback(() => {
    setResult({
      type: 'error',
      message: 'Timeout',
      detail: 'No action taken. Please try again.'
    });
    setCurrentState('RESULT');
    
    setTimeout(resetToIdle, KIOSK_CONFIG.RESULT_DISPLAY_TIMEOUT);
  }, [resetToIdle]);

  // Handle messages countdown complete
  const handleMessagesComplete = useCallback(() => {
    resetToIdle();
  }, [resetToIdle]);

  // Demo mode: simulate RFID scan with keyboard
  useEffect(() => {
    if (!KIOSK_CONFIG.DEMO_MODE) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Press 1-5 to simulate different RFID cards in demo mode
      if (currentState === 'IDLE' && e.key >= '1' && e.key <= '5') {
        const demoUids = ['DEMO001', 'DEMO002', 'DEMO003', 'DEMO004', 'DEMO005'];
        handleRfidDetected(demoUids[parseInt(e.key) - 1]);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [currentState, handleRfidDetected]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hidden RFID input for HID readers */}
      <RfidInput 
        onRfidDetected={handleRfidDetected} 
        disabled={currentState !== 'IDLE'}
      />

      <KioskHeader
        title="Worker Kiosk"
        subtitle={currentState === 'IDLE' ? 'Scan your RFID badge' : undefined}
        connected={connected}
      />
      
      <main className="flex-1 flex items-center justify-center p-8">
        {/* IDLE State */}
        {currentState === 'IDLE' && (
          <div className="text-center max-w-lg">
            <div className="inline-flex items-center justify-center h-32 w-32 rounded-full bg-primary/10 mb-6 kiosk-glow kiosk-pulse">
              <Fingerprint className="h-16 w-16 text-primary" />
            </div>
            
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Scan Your RFID Badge
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Hold your badge near the reader
            </p>
            
            <Clock className="mb-8" />
            
            {KIOSK_CONFIG.DEMO_MODE && (
              <p className="text-sm text-muted-foreground">
                Demo Mode: Press 1-5 to simulate RFID scan
              </p>
            )}
          </div>
        )}

        {/* CARD_DETECTED State - Shows messages + login/logout buttons */}
        {currentState === 'CARD_DETECTED' && (
          <Card className="p-6 max-w-2xl w-full bg-card border-primary/30 kiosk-glow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/20">
                  <Fingerprint className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {pendingEmployee?.name || 'Card Detected'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {pendingEmployee?.role || `ID: ${pendingUid?.substring(0, 8)}...`}
                  </p>
                </div>
              </div>
              
              <CountdownTimer
                durationMs={KIOSK_CONFIG.PENDING_UID_TIMEOUT}
                onComplete={handleTimeout}
                variant="circle"
                showSeconds={false}
              />
            </div>

            {/* Messages Section */}
            {messages.length > 0 && (
              <div className="mb-6">
                <MessageDisplay messages={messages} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                size="lg"
                className="h-20 text-lg bg-success hover:bg-success/90 text-white"
                onClick={handleLogin}
                disabled={loading}
              >
                <LogIn className="h-8 w-8 mr-2" />
                Log In
              </Button>
              
              <Button
                size="lg"
                variant="destructive"
                className="h-20 text-lg"
                onClick={handleLogout}
                disabled={loading}
              >
                <LogOut className="h-8 w-8 mr-2" />
                Log Out
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-4">
              {messages.length > 0 
                ? 'Read your messages, then press GREEN to log in or RED to log out'
                : 'Press GREEN to log in or RED to log out'
              }
            </p>
          </Card>
        )}

        {/* PROCESSING State */}
        {currentState === 'PROCESSING' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-primary/10 mb-6">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Processing...
            </h2>
          </div>
        )}

        {/* RESULT State */}
        {currentState === 'RESULT' && result && (
          <div className="text-center max-w-md">
            <div className={cn(
              'inline-flex items-center justify-center h-24 w-24 rounded-full mb-6',
              result.type === 'success' ? 'bg-success/20' : 'bg-destructive/20'
            )}>
              {result.type === 'success' ? (
                <CheckCircle2 className="h-12 w-12 text-success" />
              ) : (
                <XCircle className="h-12 w-12 text-destructive" />
              )}
            </div>
            
            <h2 className={cn(
              'text-3xl font-bold mb-2',
              result.type === 'success' ? 'text-success' : 'text-destructive'
            )}>
              {result.message}
            </h2>
            <p className="text-lg text-muted-foreground">
              {result.detail}
            </p>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          {KIOSK_CONFIG.DEMO_MODE 
            ? 'Demo Mode Active • Connect to Node-RED for live data'
            : 'InfoKiosk Worker Terminal'
          }
        </p>
      </footer>
    </div>
  );
};

export default WorkerKiosk;
