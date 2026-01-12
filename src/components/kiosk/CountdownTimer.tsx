import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  durationMs: number;
  onComplete?: () => void;
  className?: string;
  showSeconds?: boolean;
  variant?: 'bar' | 'circle';
}

export const CountdownTimer = ({
  durationMs,
  onComplete,
  className,
  showSeconds = true,
  variant = 'bar',
}: CountdownTimerProps) => {
  const [remaining, setRemaining] = useState(durationMs);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const endTime = startTime + durationMs;

    const updateTimer = () => {
      const now = Date.now();
      const newRemaining = Math.max(0, endTime - now);
      setRemaining(newRemaining);

      if (newRemaining <= 0) {
        onComplete?.();
      }
    };

    const interval = setInterval(updateTimer, 100);
    updateTimer();

    return () => clearInterval(interval);
  }, [durationMs, startTime, onComplete]);

  const progress = (remaining / durationMs) * 100;
  const seconds = Math.ceil(remaining / 1000);

  if (variant === 'circle') {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference * (1 - progress / 100);

    return (
      <div className={cn('relative inline-flex items-center justify-center', className)}>
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="45"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-muted"
          />
          <circle
            cx="48"
            cy="48"
            r="45"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-primary transition-all duration-100"
          />
        </svg>
        {showSeconds && (
          <span className="absolute text-2xl font-bold text-foreground">
            {seconds}s
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      {showSeconds && (
        <p className="text-center text-sm text-muted-foreground mt-2">
          {seconds} seconds remaining
        </p>
      )}
    </div>
  );
};
