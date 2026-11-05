import type { Records } from './types';

type SkippedContext = {
  records: Records;
  // 앱을 처음 쓴 날(historyStore.startedKey). 아직 모르면 null.
  startedKey: string | null;
  todayKey: string;
  // 아직 기록으로 확정되지 않은 계획표의 날짜(자정 직후 잠깐 남아 있을 수 있다)
  planDateKey: string | null;
};

// 계획을 아예 안 짠 날인지(사용자 결정: 달력에 회색 점으로만 표시. 실패·퇴화에는 영향 없음).
// 처음 쓴 날 다음 날부터 어제까지 중 기록이 없고 확정 대기 중인 계획도 없는 날. 가장 이른 기록이 처음 쓴 날보다 이르면 그 날을 기준으로 한다.
// 날짜 키는 "YYYY-MM-DD"라서 문자열 비교가 날짜 순서와 같다.
export const isSkippedDay = (dateKey: string, { records, startedKey, todayKey, planDateKey }: SkippedContext): boolean => {
  if (startedKey === null) return false;
  const earliestRecord = Object.keys(records).sort()[0];
  const anchor = earliestRecord !== undefined && earliestRecord < startedKey ? earliestRecord : startedKey;
  return dateKey > anchor && dateKey < todayKey && records[dateKey] === undefined && dateKey !== planDateKey;
};
