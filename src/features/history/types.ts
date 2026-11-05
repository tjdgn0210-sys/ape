export type DayTask = {
  title: string;
  minutes: number;
  done: boolean;
  // 5분을 놓쳤지만 늦게라도 시작함(실패는 그대로)
  late?: boolean;
};

// 자정에 확정된 하루 기록. 계획이 없었던 날은 기록이 없다.
export type DayRecord = {
  dateKey: string;
  result: 'success' | 'fail';
  // 그 달의 몇 번째 실패인지(성공이면 null)
  failNo: number | null;
  tasks: DayTask[];
  // 실패한 날이 나중에 "연속 성공"으로 회복됐다면 회복이 일어난 날(성공으로 확정된 날). 회복된 실패는 이번 달 실패 횟수에서 빠진다.
  forgivenOn?: string;
};

export type Records = Record<string, DayRecord>;

// 연속 성공으로 실패 1회가 지워진 직후 한 번 보여 주는 회복 안내
export type RecoveryNotice = {
  // 회복이 일어난(연속 성공을 채운) 날
  dateKey: string;
  // 지워진 실패의 날
  forgivenKey: string;
  fromStage: number;
  toStage: number;
};

// 실패가 확정된 직후 한 번 보여 주는 퇴화 안내
export type DevolutionNotice = {
  dateKey: string;
  failNo: number;
  fromStage: number;
  toStage: number;
  // 이번 달 5번째 실패라서 이번 달이 끝남
  ended: boolean;
};
