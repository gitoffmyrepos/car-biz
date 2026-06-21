'use client';

/**
 * GigWheels - Date Picker Component
 * Weekly car rentals for gig drivers
 *
 * Custom date picker with calendar view.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';

// Date picker props
export interface DatePickerProps {
  value?: Date | string | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  label?: string;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  hint?: string;
  className?: string;
  dateFormat?: 'short' | 'medium' | 'long';
  showClearButton?: boolean;
}

// Days of the week
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Months
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Format date for display
const formatDate = (date: Date, format: 'short' | 'medium' | 'long'): string => {
  const options: Intl.DateTimeFormatOptions =
    format === 'short'
      ? { month: 'numeric', day: 'numeric', year: 'numeric' }
      : format === 'medium'
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : { month: 'long', day: 'numeric', year: 'numeric' };

  return date.toLocaleDateString('en-US', options);
};

// Parse date from string or Date
const parseDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Get days in a month
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

// Get the first day of the month (0 = Sunday)
const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

// Check if two dates are the same day
const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// Check if a date is today
const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

// Check if date is disabled
const isDateDisabled = (
  date: Date,
  minDate?: Date,
  maxDate?: Date
): boolean => {
  if (minDate && date < minDate) return true;
  if (maxDate && date > maxDate) return true;
  return false;
};

/**
 * Calendar component
 */
const Calendar = ({
  selectedDate,
  onSelect,
  minDate,
  maxDate,
  onClose,
}: {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  onClose: () => void;
}) => {
  const [viewDate, setViewDate] = useState(() => {
    return selectedDate || new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Navigate months
  const goToPreviousMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = [];
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    // Add empty slots for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [year, month]);

  // Handle day click
  const handleDayClick = (date: Date) => {
    if (!isDateDisabled(date, minDate, maxDate)) {
      onSelect(date);
      onClose();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-72">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-medium text-gray-900">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} />;
          }

          const disabled = isDateDisabled(date, minDate, maxDate);
          const selected = selectedDate && isSameDay(date, selectedDate);
          const today = isToday(date);

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => handleDayClick(date)}
              disabled={disabled}
              className={clsx(
                'w-8 h-8 rounded-full text-sm transition-colors',
                disabled && 'text-gray-300 cursor-not-allowed',
                !disabled && !selected && 'hover:bg-gray-100',
                selected && 'bg-gold text-charcoal font-medium',
                !selected && today && 'text-gold font-medium',
                !selected && !today && !disabled && 'text-gray-700'
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Today button */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <button
          type="button"
          onClick={() => {
            const today = new Date();
            if (!isDateDisabled(today, minDate, maxDate)) {
              onSelect(today);
              onClose();
            }
          }}
          className="w-full py-2 text-sm text-gold hover:bg-gold/10 rounded-lg transition-colors"
        >
          Today
        </button>
      </div>
    </div>
  );
};

/**
 * Main DatePicker component
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  minDate,
  maxDate,
  label,
  error,
  touched = false,
  required,
  hint,
  className,
  dateFormat = 'medium',
  showClearButton = true,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseDate(value);
  const hasError = touched && !!error;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Handle date selection
  const handleSelect = useCallback(
    (date: Date) => {
      onChange?.(date);
    },
    [onChange]
  );

  // Handle clear
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(null);
    },
    [onChange]
  );

  // Toggle calendar
  const toggleCalendar = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  return (
    <div className={clsx('w-full', className)} ref={containerRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input */}
      <div className="relative">
        <button
          type="button"
          onClick={toggleCalendar}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={clsx(
            'w-full flex items-center justify-between px-4 py-2 border rounded-lg transition-colors text-left',
            hasError
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-gold focus:border-gold',
            disabled
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : 'bg-white hover:border-gray-400',
            'focus:outline-none focus:ring-2'
          )}
        >
          <span
            className={clsx(
              'truncate',
              selectedDate ? 'text-gray-900' : 'text-gray-400'
            )}
          >
            {selectedDate ? formatDate(selectedDate, dateFormat) : placeholder}
          </span>
          <div className="flex items-center gap-1">
            {showClearButton && selectedDate && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
                aria-label="Clear date"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <svg
              className={clsx(
                'w-5 h-5 text-gray-400 transition-transform',
                isOpen && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </button>

        {/* Calendar dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1">
            <Calendar
              selectedDate={selectedDate}
              onSelect={handleSelect}
              minDate={minDate}
              maxDate={maxDate}
              onClose={() => setIsOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Error message */}
      {hasError && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </p>
      )}

      {/* Hint */}
      {hint && !hasError && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}

export default DatePicker;
