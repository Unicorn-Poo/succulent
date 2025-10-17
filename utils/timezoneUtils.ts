/**
 * Timezone utilities for handling date parsing and scheduling
 */

/**
 * Parse a date string with proper timezone handling
 * @param dateString - Date string in various formats
 * @param userTimezone - Optional user timezone (defaults to browser timezone)
 * @returns Parsed Date object or null if invalid
 */
export function parseScheduleDate(dateString: string, userTimezone?: string): Date | null {
  if (!dateString || dateString.trim() === '') {
    return null;
  }

  try {
    let date: Date;

    // Handle different date formats
    if (dateString.includes('T') && dateString.endsWith('Z')) {
      // Already in UTC format (e.g., "2025-10-12T13:00:00Z")
      date = new Date(dateString);
    } else if (dateString.includes('T')) {
      // ISO format without timezone (e.g., "2025-10-12T13:00:00")
      // Assume this is in the user's local timezone
      date = new Date(dateString);
    } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Date only format (e.g., "2025-10-12")
      // Default to 9:00 AM in user's timezone
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day, 9, 0, 0);
    } else {
      // Try to parse as-is
      date = new Date(dateString);
    }

    // Validate the parsed date
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    return null;
  }
}

/**
 * Validate if a date is suitable for scheduling (at least 5 minutes in the future)
 * @param date - Date to validate
 * @returns Validation result with details
 */
export function validateScheduleDate(date: Date): {
  isValid: boolean;
  minutesFromNow: number;
  message?: string;
} {
  const now = new Date();
  const minutesFromNow = Math.round((date.getTime() - now.getTime()) / (1000 * 60));
  const minMinutes = 5;

  if (minutesFromNow < minMinutes) {
    return {
      isValid: false,
      minutesFromNow,
      message: minutesFromNow < 0 
        ? `Date is ${Math.abs(minutesFromNow)} minutes in the past`
        : `Date is only ${minutesFromNow} minutes away (minimum: ${minMinutes} minutes)`
    };
  }

  return {
    isValid: true,
    minutesFromNow
  };
}

/**
 * Format a date for display with timezone information
 * @param date - Date to format
 * @param showTimezone - Whether to include timezone info
 * @returns Formatted date string
 */
export function formatScheduleDate(date: Date, showTimezone: boolean = true): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(showTimezone && { timeZoneName: 'short' })
  };

  return date.toLocaleString(undefined, options);
}

/**
 * Get user's timezone
 * @returns Timezone identifier (e.g., "Europe/London")
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert a date to user's local timezone for display
 * @param date - Date in UTC
 * @returns Date string in user's timezone
 */
export function toUserTimezone(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

/**
 * Create example dates for CSV template
 * @returns Array of example date strings in proper format
 */
export function getExampleScheduleDates(): string[] {
  const now = new Date();
  const examples = [
    new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
    new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day from now
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
  ];

  return examples.map(date => date.toISOString());
}

/**
 * Smart date parser that handles various input formats and provides helpful error messages
 * @param input - Date input string
 * @returns Parsing result with date or error
 */
export function smartParseScheduleDate(input: string): {
  success: boolean;
  date?: Date;
  error?: string;
  suggestion?: string;
} {
  if (!input || input.trim() === '') {
    return { success: false, error: 'Date is required' };
  }

  const date = parseScheduleDate(input);
  if (!date) {
    return {
      success: false,
      error: 'Invalid date format',
      suggestion: 'Use formats like: 2025-12-15T14:30:00Z, 2025-12-15 14:30, or 2025-12-15'
    };
  }

  const validation = validateScheduleDate(date);
  if (!validation.isValid) {
    const now = new Date();
    const suggestedDate = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    
    return {
      success: false,
      error: validation.message,
      suggestion: `Try: ${suggestedDate.toISOString()}`
    };
  }

  return { success: true, date };
}
