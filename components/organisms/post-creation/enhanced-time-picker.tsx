import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Calendar, Clock, Plus, Minus } from 'lucide-react';

interface EnhancedTimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  onClear?: () => void;
  className?: string;
}

export function EnhancedTimePicker({ 
  value, 
  onChange, 
  onClear, 
  className = "" 
}: EnhancedTimePickerProps) {
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [showPresets, setShowPresets] = useState(false);

  // Sync internal state with external value
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      const newDateInput = date.toISOString().slice(0, 10); // YYYY-MM-DD
      const newTimeInput = date.toTimeString().slice(0, 5); // HH:MM
      
      // Only update if different to prevent loops
      if (newDateInput !== dateInput) setDateInput(newDateInput);
      if (newTimeInput !== timeInput) setTimeInput(newTimeInput);
    } else {
      if (dateInput !== "") setDateInput("");
      if (timeInput !== "") setTimeInput("");
    }
  }, [value]); // Remove dateInput and timeInput from dependencies to prevent loops

  const handleDateTimeChange = useCallback(() => {
    if (dateInput && timeInput) {
      const combined = new Date(`${dateInput}T${timeInput}`);
      if (!isNaN(combined.getTime())) {
        const now = new Date();
        const minutesFromNow = Math.round((combined.getTime() - now.getTime()) / (1000 * 60));
        
        // Auto-adjust if less than 10 minutes in the future
        let finalDate = combined;
        if (minutesFromNow < 10 && minutesFromNow >= 0) {
          finalDate = new Date(now.getTime() + 10 * 60 * 1000); // Add 10 minutes
          console.log(`⏰ Auto-adjusted scheduled time to maintain 10-minute buffer`);
        }
        
        // Only call onChange if the date is actually different
        if (!value || finalDate.getTime() !== value.getTime()) {
          onChange(finalDate);
        }
      }
    } else if (!dateInput && !timeInput && value) {
      onChange(null);
    }
  }, [dateInput, timeInput, onChange, value]);

  // Update when inputs change - but debounce to prevent excessive calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleDateTimeChange();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [dateInput, timeInput]); // Remove handleDateTimeChange to prevent loops

  const getPresetTimes = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setSeconds(0, 0);
    
    return [
      {
        label: "In 1 hour",
        date: new Date(today.getTime() + 60 * 60 * 1000)
      },
      {
        label: "In 2 hours", 
        date: new Date(today.getTime() + 2 * 60 * 60 * 1000)
      },
      {
        label: "Tomorrow 9 AM",
        date: (() => {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          return tomorrow;
        })()
      },
      {
        label: "Tomorrow 2 PM",
        date: (() => {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(14, 0, 0, 0);
          return tomorrow;
        })()
      },
      {
        label: "Next week",
        date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    ];
  }, []); // Memoize to prevent recreation on every render

  const adjustTime = useCallback((minutes: number) => {
    const currentDate = value || new Date();
    const newDate = new Date(currentDate.getTime() + minutes * 60 * 1000);
    onChange(newDate);
  }, [value, onChange]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="pl-10"
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>
        
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Time
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="time"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Time adjustment controls */}
      {value && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Quick adjust:</span>
          <Button
            variant="outline"
            size="1"
            onClick={() => adjustTime(-15)}
            className="px-2 py-1 text-xs"
          >
            <Minus className="w-3 h-3 mr-1" />
            15m
          </Button>
          <Button
            variant="outline"
            size="1"
            onClick={() => adjustTime(15)}
            className="px-2 py-1 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            15m
          </Button>
          <Button
            variant="outline"
            size="1"
            onClick={() => adjustTime(60)}
            className="px-2 py-1 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            1h
          </Button>
        </div>
      )}

      {/* Quick presets */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick presets:</span>
          <Button
            variant="ghost"
            size="1"
            onClick={() => setShowPresets(!showPresets)}
            className="text-xs"
          >
            {showPresets ? 'Hide' : 'Show'}
          </Button>
        </div>
        
        {showPresets && (
          <div className="grid grid-cols-2 gap-2">
            {getPresetTimes.map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                size="1"
                onClick={() => onChange(preset.date)}
                className="text-xs justify-start"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Current selection display */}
      {value && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Scheduled for:
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-200">
            {value.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-200">
            at {value.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>
      )}

      {/* Clear button */}
      {value && onClear && (
        <Button
          variant="outline"
          size="1"
          onClick={onClear}
          className="w-full text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          Clear Schedule
        </Button>
      )}
    </div>
  );
} 