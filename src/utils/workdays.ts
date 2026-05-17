// Korean public holidays (토/일 제외한 공휴일만)
const HOLIDAYS: Record<string, string[]> = {
  '2025': [
    '2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30',
    '2025-03-01', '2025-05-05', '2025-05-06', '2025-06-06',
    '2025-08-15', '2025-10-03', '2025-10-06', '2025-10-07',
    '2025-10-08', '2025-10-09', '2025-12-25',
  ],
  '2026': [
    '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18',
    '2026-03-01', '2026-05-05', '2026-06-06',
    '2026-08-17', '2026-09-24', '2026-09-25', '2026-09-26',
    '2026-10-09', '2026-12-25',
  ],
};

const isHoliday = (dateStr: string): boolean => {
  const year = dateStr.substring(0, 4);
  return (HOLIDAYS[year] ?? []).includes(dateStr);
};

const isWorkday = (year: number, month: number, day: number): boolean => {
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return !isHoliday(iso);
};

export const getWorkingDaysInMonth = (year: number, month: number): number => {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    if (isWorkday(year, month, d)) count++;
  }
  return count;
};

export const getElapsedWorkingDays = (year: number, month: number): number => {
  const today = new Date();
  const isCurrent = today.getFullYear() === year && today.getMonth() + 1 === month;
  const toDay = isCurrent ? today.getDate() : new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= toDay; d++) {
    if (isWorkday(year, month, d)) count++;
  }
  return count;
};

export const getRemainingWorkingDays = (year: number, month: number): number => {
  const today = new Date();
  const isCurrent = today.getFullYear() === year && today.getMonth() + 1 === month;
  const fromDay = isCurrent ? today.getDate() : 1;
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = fromDay; d <= days; d++) {
    if (isWorkday(year, month, d)) count++;
  }
  return count;
};
