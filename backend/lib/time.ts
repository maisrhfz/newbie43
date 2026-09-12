export function computeDepartureDeadline(eventTime: Date, totalTravelMinutes: number, bufferMinutes: number): Date {
  const totalMs = (totalTravelMinutes + bufferMinutes) * 60 * 1000;
  return new Date(eventTime.getTime() - totalMs);
}
