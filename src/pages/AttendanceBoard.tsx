// Attendance Board Page - Real-time presence display
import { useState, useEffect } from 'react';
import { KioskHeader } from '@/components/kiosk/KioskHeader';
import { EmployeeCard } from '@/components/kiosk/EmployeeCard';
import { Clock } from '@/components/kiosk/Clock';
import { kioskApi } from '@/services/api';
import { useKioskWebSocket } from '@/hooks/useWebSocket';
import { Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ActiveSession } from '@/types/kiosk';
import { cn } from '@/lib/utils';

const AttendanceBoard = () => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { connected, activeSessions: wsSessions, lastUpdate } = useKioskWebSocket();

  // Load initial data
  useEffect(() => {
    loadBoardState();
  }, []);

  // Update from WebSocket
  useEffect(() => {
    if (wsSessions.length > 0 || lastUpdate) {
      setSessions(wsSessions);
      setLastRefresh(lastUpdate || new Date());
    }
  }, [wsSessions, lastUpdate]);

  const loadBoardState = async () => {
    setLoading(true);
    const response = await kioskApi.getBoardState();
    if (response.success && response.data) {
      setSessions(response.data.active);
      setLastRefresh(new Date(response.data.ts));
    }
    setLoading(false);
  };

  const handleRefresh = () => {
    loadBoardState();
  };

  // Auto-refresh every 30 seconds as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      loadBoardState();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <KioskHeader
        title="Attendance Board"
        subtitle="Currently present employees"
        connected={connected}
      />
      
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Stats Bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-primary">{sessions.length}</span>
                <span className="text-muted-foreground">present</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Clock */}
          <div className="mb-8">
            <Clock />
          </div>

          {/* Employee Grid */}
          {sessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-muted mb-4">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Employees Present</h3>
              <p className="text-muted-foreground">
                Employees will appear here when they log in
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session) => (
                <EmployeeCard
                  key={session.employee_id}
                  session={session}
                  className="animate-in fade-in duration-300"
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          Real-time updates via WebSocket • Demo Mode Active
        </p>
      </footer>
    </div>
  );
};

export default AttendanceBoard;
