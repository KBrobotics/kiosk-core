// Admin Panel Page - Employee and attendance management
import { useState, useEffect } from 'react';
import { KioskHeader } from '@/components/kiosk/KioskHeader';
import { EmployeeCard } from '@/components/kiosk/EmployeeCard';
import { EmployeeMessageDialog } from '@/components/admin/EmployeeMessageDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { kioskApi } from '@/services/api';
import { useKioskWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'sonner';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Settings,
  LogOut,
  AlertCircle,
  Mail
} from 'lucide-react';
import type { Employee, ActiveSession, KioskMessage } from '@/types/kiosk';
import { cn } from '@/lib/utils';

const AdminPanel = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const { connected, activeSessions: wsSessions, lastUpdate } = useKioskWebSocket();

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Update sessions from WebSocket
  useEffect(() => {
    if (wsSessions.length > 0 || lastUpdate) {
      setSessions(wsSessions);
    }
  }, [wsSessions, lastUpdate]);

  const loadData = async () => {
    setLoading(true);
    const [employeesRes, boardRes] = await Promise.all([
      kioskApi.getEmployees(),
      kioskApi.getBoardState(),
    ]);
    
    if (employeesRes.success && employeesRes.data) {
      setEmployees(employeesRes.data);
    }
    if (boardRes.success && boardRes.data) {
      setSessions(boardRes.data.active);
    }
    setLoading(false);
  };

  const handleForceLogout = async (employeeId: string) => {
    setActionLoading(employeeId);
    await kioskApi.logout(employeeId, 'admin');
    await loadData();
    setActionLoading(null);
  };

  const isEmployeeLoggedIn = (employeeId: string) => {
    return sessions.some(s => s.employee_id === employeeId);
  };

  const getEmployeeSession = (employeeId: string) => {
    return sessions.find(s => s.employee_id === employeeId);
  };

  const handleSendMessage = (employee: Employee) => {
    setSelectedEmployee(employee);
    setMessageDialogOpen(true);
  };

  const handleMessageSubmit = async (message: Omit<KioskMessage, 'id' | 'created_at'>) => {
    // In a real implementation, this would call the API
    console.log('Sending message:', message);
    toast.success(`Message sent to ${selectedEmployee?.name}`);
    // Mock API call - in production this would be:
    // await kioskApi.sendMessage(message);
  };

  const activeCount = employees.filter(e => e.active).length;
  const presentCount = sessions.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <KioskHeader
        title="Admin Panel"
        subtitle="Manage employees and attendance"
        connected={connected}
        showClock={false}
      />
      
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </Card>
            
            <Card className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Employees</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </Card>
            
            <Card className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Currently Present</p>
                <p className="text-2xl font-bold">{presentCount}</p>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="employees" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
              <TabsTrigger value="employees">Employees</TabsTrigger>
              <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="employees" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employees.map((employee) => {
                  const session = getEmployeeSession(employee.id);
                  const isLoggedIn = !!session;
                  
                  return (
                    <Card
                      key={employee.id}
                      className={cn(
                        'p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors',
                        !employee.active && 'opacity-50'
                      )}
                      onClick={() => handleSendMessage(employee)}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'h-10 w-10 rounded-full flex items-center justify-center',
                            isLoggedIn ? 'bg-success/20' : 'bg-secondary'
                          )}
                        >
                          {isLoggedIn ? (
                            <UserCheck className="h-5 w-5 text-success" />
                          ) : (
                            <UserX className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {employee.role} • RFID: {employee.rfid_uid}
                          </p>
                          {session && (
                            <p className="text-xs text-success mt-1">
                              Logged in since {new Date(session.login_ts).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary/30 hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendMessage(employee);
                          }}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                        
                        {isLoggedIn && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleForceLogout(employee.id);
                            }}
                            disabled={actionLoading === employee.id}
                          >
                            <LogOut className="h-4 w-4 mr-1" />
                            {actionLoading === employee.id ? '...' : 'Logout'}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="sessions" className="space-y-4">
              {sessions.length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-muted mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Active Sessions</h3>
                  <p className="text-muted-foreground">
                    No employees are currently logged in
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions.map((session) => (
                    <div key={session.employee_id} className="relative">
                      <EmployeeCard session={session} />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleForceLogout(session.employee_id)}
                        disabled={actionLoading === session.employee_id}
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">System Configuration</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">Demo Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Using mock data instead of Node-RED backend
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-warning/20 text-warning text-sm font-medium">
                      Active
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-4 rounded-lg border border-border">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Configure <code className="px-1 py-0.5 rounded bg-secondary">VITE_API_BASE_URL</code> and <code className="px-1 py-0.5 rounded bg-secondary">VITE_WS_URL</code> environment variables to connect to your Node-RED instance.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          InfoKiosk Admin Panel • Demo Mode Active
        </p>
      </footer>

      {/* Message Dialog */}
      <EmployeeMessageDialog
        employee={selectedEmployee}
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        onSend={handleMessageSubmit}
      />
    </div>
  );
};

export default AdminPanel;
