import { cn } from '@/lib/utils';
import { Clock } from './Clock';
import { StatusIndicator } from './StatusIndicator';

interface KioskHeaderProps {
  title: string;
  subtitle?: string;
  connected: boolean;
  className?: string;
  showClock?: boolean;
}

export const KioskHeader = ({
  title,
  subtitle,
  connected,
  className,
  showClock = true,
}: KioskHeaderProps) => {
  return (
    <header
      className={cn(
        'p-6 border-b border-border bg-kiosk-surface',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-primary">Info</span>
            <span className="text-foreground">Kiosk</span>
            <span className="text-muted-foreground ml-3 text-xl font-normal">
              {title}
            </span>
          </h1>
          {subtitle && (
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {showClock && <Clock showDate={false} className="text-right" />}
          <StatusIndicator connected={connected} />
        </div>
      </div>
    </header>
  );
};
