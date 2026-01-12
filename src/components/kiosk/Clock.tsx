import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ClockProps {
  className?: string;
  showDate?: boolean;
}

export const Clock = ({ className, showDate = true }: ClockProps) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={cn('text-center', className)}>
      <div className="text-5xl font-mono font-bold tracking-wider text-primary kiosk-glow">
        {formatTime(time)}
      </div>
      {showDate && (
        <div className="text-lg text-muted-foreground mt-2">
          {formatDate(time)}
        </div>
      )}
    </div>
  );
};
