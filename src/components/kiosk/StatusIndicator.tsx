import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  connected: boolean;
  className?: string;
}

export const StatusIndicator = ({ connected, className }: StatusIndicatorProps) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'h-3 w-3 rounded-full',
          connected
            ? 'bg-success animate-pulse'
            : 'bg-destructive'
        )}
      />
      <span className="text-sm text-muted-foreground">
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
};
