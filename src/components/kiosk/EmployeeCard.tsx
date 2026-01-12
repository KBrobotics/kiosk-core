import { cn } from '@/lib/utils';
import { User, Clock } from 'lucide-react';
import type { ActiveSession } from '@/types/kiosk';

interface EmployeeCardProps {
  session: ActiveSession;
  className?: string;
  compact?: boolean;
}

export const EmployeeCard = ({ session, className, compact = false }: EmployeeCardProps) => {
  const formatLoginTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getTimeSinceLogin = (ts: string) => {
    const loginTime = new Date(ts).getTime();
    const now = Date.now();
    const diffMs = now - loginTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border',
          className
        )}
      >
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{session.name}</p>
          <p className="text-xs text-muted-foreground">{session.role}</p>
        </div>
        <div className="text-xs text-muted-foreground">
          {getTimeSinceLogin(session.login_ts)}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center kiosk-glow">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{session.name}</h3>
          <p className="text-sm text-muted-foreground">{session.role}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Logged in at {formatLoginTime(session.login_ts)}</span>
        <span className="text-primary font-medium ml-auto">
          {getTimeSinceLogin(session.login_ts)}
        </span>
      </div>
    </div>
  );
};
