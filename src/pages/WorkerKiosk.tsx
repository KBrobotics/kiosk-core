// Worker Kiosk Page - Login/Logout station
import { useState, useEffect } from 'react';
import { KioskHeader } from '@/components/kiosk/KioskHeader';
import { Clock } from '@/components/kiosk/Clock';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { kioskApi } from '@/services/api';
import { useKioskWebSocket } from '@/hooks/useWebSocket';
import { User, LogIn, LogOut, Fingerprint, AlertCircle } from 'lucide-react';
import type { Employee, ActiveSession } from '@/types/kiosk';
import { cn } from '@/lib/utils';

const WorkerKiosk = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [currentSession, setCurrentSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { connected } = useKioskWebSocket();

  // Load employees on mount
  useEffect(() => {
    const loadEmployees = async () => {
      const response = await kioskApi.getActiveEmployees();
      if (response.success && response.data) {
        setEmployees(response.data);
      }
    };
    loadEmployees();
  }, []);

  // Check session when employee selected
  useEffect(() => {
    if (!selectedEmployee) {
      setCurrentSession(null);
      return;
    }

    const checkSession = async () => {
      const response = await kioskApi.getSession(selectedEmployee.id);
      if (response.success) {
        setCurrentSession(response.data || null);
      }
    };
    checkSession();
  }, [selectedEmployee]);

  const handleLogin = async () => {
    if (!selectedEmployee) return;
    
    setLoading(true);
    setError(null);
    
    const response = await kioskApi.login(selectedEmployee.id, 'manual');
    
    if (response.success && response.data) {
      setCurrentSession(response.data);
    } else {
      setError(response.error || 'Login failed');
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    if (!selectedEmployee) return;
    
    setLoading(true);
    setError(null);
    
    const response = await kioskApi.logout(selectedEmployee.id, 'manual');
    
    if (response.success) {
      setCurrentSession(null);
    } else {
      setError(response.error || 'Logout failed');
    }
    
    setLoading(false);
  };

  const handleReset = () => {
    setSelectedEmployee(null);
    setCurrentSession(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <KioskHeader
        title="Worker Kiosk"
        subtitle="Scan your badge or select your name"
        connected={connected}
      />
      
      <main className="flex-1 p-8">
        {!selectedEmployee ? (
          // Employee Selection View
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-primary/10 mb-4 kiosk-glow">
                <Fingerprint className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                Scan Your RFID Badge
              </h2>
              <p className="text-muted-foreground">
                Or select your name from the list below
              </p>
            </div>

            <Clock className="mb-8" />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {employees.map((employee) => (
                <Button
                  key={employee.id}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5"
                  onClick={() => setSelectedEmployee(employee)}
                >
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="font-medium">{employee.name}</span>
                  <span className="text-xs text-muted-foreground">{employee.role}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          // Login/Logout View
          <div className="max-w-md mx-auto">
            <Card className="p-8 bg-card border-primary/30 kiosk-glow">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/20 mb-4">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">{selectedEmployee.name}</h2>
                <p className="text-muted-foreground">{selectedEmployee.role}</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {currentSession ? (
                // Logged In State
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                    <p className="text-success font-medium text-center">
                      Currently Logged In
                    </p>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      Since {new Date(currentSession.login_ts).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  <Button
                    size="lg"
                    className={cn(
                      "w-full h-16 text-lg",
                      "bg-destructive hover:bg-destructive/90"
                    )}
                    onClick={handleLogout}
                    disabled={loading}
                  >
                    <LogOut className="h-6 w-6 mr-2" />
                    {loading ? 'Processing...' : 'Log Out'}
                  </Button>
                </div>
              ) : (
                // Logged Out State
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted border border-border">
                    <p className="text-muted-foreground text-center">
                      Not currently logged in
                    </p>
                  </div>
                  
                  <Button
                    size="lg"
                    className="w-full h-16 text-lg bg-success hover:bg-success/90"
                    onClick={handleLogin}
                    disabled={loading}
                  >
                    <LogIn className="h-6 w-6 mr-2" />
                    {loading ? 'Processing...' : 'Log In'}
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={handleReset}
              >
                ← Back to Employee List
              </Button>
            </Card>
          </div>
        )}
      </main>

      {/* Footer with demo mode indicator */}
      <footer className="p-4 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          Demo Mode Active • Connect to Node-RED for live data
        </p>
      </footer>
    </div>
  );
};

export default WorkerKiosk;
