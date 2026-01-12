import { useEffect, useRef, useCallback } from 'react';
import { KIOSK_CONFIG } from '@/config/kiosk';

interface RfidInputProps {
  onRfidDetected: (uid: string) => void;
  disabled?: boolean;
}

/**
 * Hidden input component that captures HID RFID reader input
 * RFID readers typically emulate keyboard input, sending characters rapidly
 * followed by an Enter key press
 */
export const RfidInput = ({ onRfidDetected, disabled = false }: RfidInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
  }, []);

  const processBuffer = useCallback(() => {
    const uid = bufferRef.current.trim();
    if (uid.length >= 4) {
      console.log('[RFID] Card detected:', uid);
      onRfidDetected(uid);
    }
    clearBuffer();
  }, [onRfidDetected, clearBuffer]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Enter key signals end of RFID input
    if (e.key === 'Enter') {
      e.preventDefault();
      processBuffer();
      return;
    }

    // Only accept alphanumeric characters
    if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
      bufferRef.current += e.key.toUpperCase();
      
      // Set timeout to clear buffer if no more input
      timeoutRef.current = setTimeout(() => {
        // If buffer has content but no Enter was pressed, still try to process
        if (bufferRef.current.length >= 8) {
          processBuffer();
        } else {
          clearBuffer();
        }
      }, KIOSK_CONFIG.HID_INPUT_TIMEOUT);
    }

    // Prevent the character from appearing in input
    e.preventDefault();
  }, [processBuffer, clearBuffer]);

  // Keep focus on the input
  useEffect(() => {
    const focusInput = () => {
      if (!disabled && inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };

    // Initial focus
    focusInput();

    // Refocus periodically and on click
    const interval = setInterval(focusInput, 1000);
    document.addEventListener('click', focusInput);

    return () => {
      clearInterval(interval);
      document.removeEventListener('click', focusInput);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [disabled]);

  return (
    <input
      ref={inputRef}
      type="text"
      className="absolute opacity-0 pointer-events-none"
      style={{ position: 'fixed', top: -100, left: -100 }}
      onKeyDown={handleKeyDown}
      onBlur={(e) => {
        // Immediately refocus if not disabled
        if (!disabled) {
          setTimeout(() => e.target.focus(), 10);
        }
      }}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      disabled={disabled}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
};
