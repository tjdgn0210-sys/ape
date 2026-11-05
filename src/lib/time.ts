// 시각은 "하루 중 몇 분째인가"(0~1440)로 다룬다. 14:00 = 840.
export const MINUTES_PER_DAY = 24 * 60;

const pad2 = (n: number) => String(n).padStart(2, '0');

export const formatClock = (minuteOfDay: number) =>
  `${pad2(Math.floor(minuteOfDay / 60))}:${pad2(minuteOfDay % 60)}`;

// 12시간제로 나눠 돌려 준다. 0:05 -> { period: '오전', text: '12:05' }, 15:30 -> { period: '오후', text: '3:30' }
export const formatClock12 = (minuteOfDay: number) => {
  const hour24 = Math.floor(minuteOfDay / 60) % 24;
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { period: hour24 >= 12 ? '오후' : '오전', text: `${hour}:${pad2(minuteOfDay % 60)}` };
};

// 90 -> "1시간 30분", 120 -> "2시간", 45 -> "45분"
export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}분`;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
};

export const minuteOfDayOf = (date: Date) => date.getHours() * 60 + date.getMinutes();

export const roundUpTo = (minutes: number, step: number) => Math.ceil(minutes / step) * step;

// 로컬 날짜 기준 "2026-10-23" 형태의 키
export const dateKeyOf = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

// "2026-11-01" -> "2026-10-31"
export const previousDayKey = (dateKey: string) => {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number);
  return dateKeyOf(new Date(year, month - 1, day - 1));
};

// 3725초 -> "1:02:05", 2538초 -> "42:18"
export const formatTimer = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${pad2(minutes)}:${pad2(seconds)}`;
};

export const secondOfDayOf = (date: Date) => date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

// 디자인 표기: "2026-10-23-(금)"
export const formatDateLabel = (date: Date) => `${dateKeyOf(date)}-(${WEEKDAY_KO[date.getDay()]})`;
