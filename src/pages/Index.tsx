// Landing page - Navigation to kiosk views
import { Link } from 'react-router-dom';
import { Clock } from '@/components/kiosk/Clock';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Fingerprint, Users, Settings } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-border bg-kiosk-surface">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            <span className="text-primary">Info</span>
            <span className="text-foreground">Kiosk</span>
          </h1>
          <p className="text-muted-foreground">
            Attendance Management System
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 flex flex-col items-center justify-center">
        <Clock className="mb-12" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {/* Worker Kiosk */}
          <Link to="/worker" className="block">
            <Card className="p-6 h-full hover:border-primary/50 transition-all hover:kiosk-glow cursor-pointer group">
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <Fingerprint className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Worker Kiosk</h2>
                <p className="text-sm text-muted-foreground">
                  Clock in and out using RFID or manual selection
                </p>
              </div>
            </Card>
          </Link>

          {/* Attendance Board */}
          <Link to="/board" className="block">
            <Card className="p-6 h-full hover:border-primary/50 transition-all hover:kiosk-glow cursor-pointer group">
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Attendance Board</h2>
                <p className="text-sm text-muted-foreground">
                  View who is currently present in real-time
                </p>
              </div>
            </Card>
          </Link>

          {/* Admin Panel */}
          <Link to="/admin" className="block">
            <Card className="p-6 h-full hover:border-primary/50 transition-all hover:kiosk-glow cursor-pointer group">
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <Settings className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Admin Panel</h2>
                <p className="text-sm text-muted-foreground">
                  Manage employees and attendance records
                </p>
              </div>
            </Card>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-border">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Demo Mode Active • Configure environment variables to connect to Node-RED
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <code className="px-2 py-1 rounded bg-secondary">VITE_API_BASE_URL</code>
            <code className="px-2 py-1 rounded bg-secondary">VITE_WS_URL</code>
            <code className="px-2 py-1 rounded bg-secondary">VITE_DEMO_MODE=false</code>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
