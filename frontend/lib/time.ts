export interface DepartureCalculation {
  eventDate: Date;
  departureDate: Date;
  totalMarginMinutes: number;
  formattedDepartureTime: string;
}

/**
 * Parses an HTML datetime-local string (e.g. "2026-09-12T14:30") 
 * and calculates the exact date/time you need to leave.
 */
export function calculateLatestDeparture(
  datetimeLocalString: string,
  travelTimeMinutes: number,
  bufferMinutes: number
): DepartureCalculation | null {
  if (!datetimeLocalString) return null;

  const eventDate = new Date(datetimeLocalString);
  if (isNaN(eventDate.getTime())) return null;

  const totalMarginMinutes = travelTimeMinutes + bufferMinutes;
  const departureDate = new Date(eventDate.getTime() - totalMarginMinutes * 60 * 1000);

  const formattedDepartureTime = departureDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    eventDate,
    departureDate,
    totalMarginMinutes,
    formattedDepartureTime,
  };
}

/**
 * Formats seconds into a clean human-readable countdown string (e.g., "14m 05s")
 */
export function formatSecondsToCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00m 00s';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

/**
 * Helper to get default datetime-local string (defaults to current time + 1 hour)
 */
export function getDefaultEventTimeString(): string {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0);
  now.setSeconds(0);
  
  // Format to local ISO string without timezone offset for datetime-local input
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}