import { useEffect, useState } from 'react';

// 일정 시간마다 현재 시각을 새로 읽는다. 화면이 보이는 동안만 돌린다.
export const useNow = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
};
