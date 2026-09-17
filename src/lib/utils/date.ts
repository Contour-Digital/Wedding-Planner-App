import {
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";

export function formatDate(date: string | null | undefined, pattern = "d MMM yyyy") {
  if (!date) return "—";
  try {
    return format(parseISO(date), pattern);
  } catch {
    return date;
  }
}

export function formatTime(time: string | null | undefined) {
  if (!time) return "—";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "pm" : "am";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function isDueThisMonth(date: string | null | undefined) {
  if (!date) return false;
  return isSameMonth(parseISO(date), new Date());
}

export function isOverdue(date: string | null | undefined, completedOrPaid: boolean) {
  if (!date || completedOrPaid) return false;
  return isBefore(parseISO(date), new Date()) && !isToday(parseISO(date));
}

export function isUpcomingWithin(date: string | null | undefined, days: number) {
  if (!date) return false;
  const target = parseISO(date);
  const now = new Date();
  const diff = differenceInCalendarDays(target, now);
  return diff >= 0 && diff <= days;
}

export function weddingCountdown(weddingDate: string | null | undefined) {
  if (!weddingDate) return null;
  const days = differenceInCalendarDays(parseISO(weddingDate), new Date());
  return days;
}

export function isFuture(date: string | null | undefined) {
  if (!date) return false;
  return isAfter(parseISO(date), new Date());
}
