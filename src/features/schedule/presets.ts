import { MINUTES_PER_DAY, roundUpTo } from '@/lib/time';

import type { TimeDraft } from './types';

const STEP = 5;
const LATEST_END = MINUTES_PER_DAY - STEP; // 23:55
const DEFAULT_SPAN = 4 * 60;

// 지금(5분 올림)부터 spanMin분. 23:55를 넘기지 않는다.
export const timeDraftWithSpan = (nowMin: number, spanMin: number): TimeDraft => {
  const startMin = Math.min(roundUpTo(nowMin, STEP), LATEST_END);
  return { startMin, endMin: Math.min(startMin + spanMin, LATEST_END) };
};

// 처음 보이는 값: 지금(5분 올림)부터 4시간(23:55까지). 디자인의 "지금부터 14:00~18:00"과 같다.
export const defaultTimeDraft = (nowMin: number): TimeDraft => timeDraftWithSpan(nowMin, DEFAULT_SPAN);
