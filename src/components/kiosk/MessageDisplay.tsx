import { cn } from '@/lib/utils';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';
import type { KioskMessage } from '@/types/kiosk';

interface MessageDisplayProps {
  messages: KioskMessage[];
  className?: string;
}

export const MessageDisplay = ({ messages, className }: MessageDisplayProps) => {
  // Sort messages by priority (higher priority first)
  const sortedMessages = [...messages].sort((a, b) => b.priority - a.priority);

  const getPriorityIcon = (priority: number) => {
    if (priority >= 3) {
      return <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />;
    } else if (priority >= 2) {
      return <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />;
    }
    return <Info className="h-5 w-5 text-primary flex-shrink-0" />;
  };

  const getPriorityClass = (priority: number) => {
    if (priority >= 3) {
      return 'border-destructive/50 bg-destructive/10';
    } else if (priority >= 2) {
      return 'border-warning/50 bg-warning/10';
    }
    return 'border-primary/30 bg-primary/5';
  };

  if (sortedMessages.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4 max-h-[50vh] overflow-y-auto', className)}>
      <h3 className="text-xl font-semibold text-foreground text-center mb-4">
        Messages for You
      </h3>
      
      {sortedMessages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'p-4 rounded-lg border',
            getPriorityClass(message.priority)
          )}
        >
          <div className="flex items-start gap-3">
            {getPriorityIcon(message.priority)}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-lg">
                {message.title}
              </h4>
              <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                {message.body}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
