/**
 * Date utilities for market operations
 */

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentTimeString(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function isMarketOpen(openTime: string, closeTime: string, timezone: string = 'America/New_York'): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const currentTime = formatter.format(now);
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  const currentMinutes = currentHour * 60 + currentMinute;
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

export function getMinutesUntil(openTime: string, timezone: string = 'America/New_York'): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const currentTime = formatter.format(now);
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const [openHour, openMinute] = openTime.split(':').map(Number);
  
  const currentMinutes = currentHour * 60 + currentMinute;
  const openMinutes = openHour * 60 + openMinute;
  
  return Math.max(0, openMinutes - currentMinutes);
}

export function formatTimeRemaining(minutes: number): string {
  if (minutes === 0) return 'now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function getDayName(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}
