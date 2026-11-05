const pad2 = (n: number) => String(n).padStart(2, '0');

export const dateKeyFor = (year: number, month: number, day: number) => `${year}-${pad2(month)}-${pad2(day)}`;

// 월요일부터 시작하는 주 단위 달력. 해당 월이 아닌 칸은 null.
export const buildMonthGrid = (year: number, month: number): (number | null)[][] => {
  const leading = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
};

export const shiftMonth = (year: number, month: number, delta: number) => {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

const WEEKDAY_LONG = ['일', '월', '화', '수', '목', '금', '토'] as const;

// "2026-10-23" -> "10월 23일 금요일"
export const formatDayTitle = (dateKey: string) => {
  const [y = 0, m = 0, d = 0] = dateKey.split('-').map(Number);
  const weekday = WEEKDAY_LONG[new Date(y, m - 1, d).getDay()] ?? '';
  return `${m}월 ${d}일 ${weekday}요일`;
};
