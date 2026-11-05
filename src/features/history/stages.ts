import type { ImageSourcePropType } from 'react-native';

// 아이콘 PNG는 여백이 커서, 실제로 그려진 부분(ink)의 위치와 크기를 픽셀 단위로 적어 둔다(알파 128 기준).
export const STAGE_IMAGE_PX = 1254;

export type Stage = {
  label: string;
  source: ImageSourcePropType;
  ink: { left: number; top: number; width: number; height: number };
};

const HUMAN: Stage = {
  label: '현대인',
  source: require('../../../assets/icons/stage-1-human.png'),
  ink: { left: 339, top: 65, width: 657, height: 1109 },
};

// 이스터에그: 한 달을 한 번도 빠짐없이 지키면 현대인보다 윗단계로 성장한다(사용자 요청, 이름 "알파메일").
// 실패 횟수로 정해지는 단계가 아니라서 번호는 -1(STAGES 밖)이다. 그림은 scripts/make-alpha-icon.mjs가 현대인 실루엣에서 만든다.
export const ALPHA_STAGE = -1;
const ALPHA: Stage = {
  label: '알파메일',
  source: require('../../../assets/icons/stage-0-alpha.png'),
  ink: { left: 292, top: 46, width: 668, height: 1182 },
};

// 0 = 현대인 ... 3 = 원인(서 있는 유인원 그림) ... 4 = 유인원(마지막) (이번 달 실패 횟수와 같다)
export const STAGES: readonly Stage[] = [
  HUMAN,
  {
    label: '창 든 원시인',
    source: require('../../../assets/icons/stage-2-hunter.png'),
    ink: { left: 328, top: 71, width: 645, height: 1103 },
  },
  {
    label: '호미닌',
    source: require('../../../assets/icons/stage-3-hominid.png'),
    ink: { left: 332, top: 170, width: 636, height: 929 },
  },
  {
    label: '원인',
    source: require('../../../assets/icons/stage-4-ape.png'),
    ink: { left: 281, top: 197, width: 702, height: 862 },
  },
  {
    label: '유인원',
    source: require('../../../assets/icons/stage-5-crouching-ape.png'),
    ink: { left: 282, top: 328, width: 691, height: 650 },
  },
];

// 단계 그림의 보이는 높이(pt). 현대인이 가장 크고 갈수록 작아져서 퇴화 과정으로 읽힌다(사용자 요청, Estimate).
// 달력 위 단계 줄과 달력의 못 지킨 날 그림이 같은 크기를 쓴다. 알파메일(이스터에그)은 현대인보다 크다.
export const STAGE_ICON_HEIGHT: Record<number, number> = { [ALPHA_STAGE]: 46, 0: 40, 1: 34, 2: 28, 3: 22, 4: 16 };

export const stageAt = (index: number): Stage => (index === ALPHA_STAGE ? ALPHA : (STAGES[index] ?? HUMAN));

// 그려진 부분의 세로가 inkHeight(pt)가 되게 하는 이미지 한 변의 길이
export const imageSizeForInkHeight = (index: number, inkHeight: number) =>
  (inkHeight * STAGE_IMAGE_PX) / stageAt(index).ink.height;

// 그려진 부분의 가로가 inkWidth(pt)가 되게 하는 이미지 한 변의 길이
export const imageSizeForInkWidth = (index: number, inkWidth: number) =>
  (inkWidth * STAGE_IMAGE_PX) / stageAt(index).ink.width;

// 달력의 단계 그림을 누르면 보여 주는 설명(사용자 요청, 문구는 임의로 지은 것).
export const STAGE_DESCRIPTION: readonly string[] = [
  '계획을 끝까지 지키는 지금의 나. 이번 달 한 번도 퇴화하지 않았어요. 이 모습 그대로 한 달을 버텨 보세요.',
  '계획을 한 번 못 지켰어요. 아직 두 발로 서 있지만 손에 든 건 창 하나뿐. 지금부터 지키면 더 내려가지 않아요.',
  '두 번 못 지켰어요. 허리가 조금씩 굽고 말수가 줄었어요. 남은 기회는 세 번.',
  '세 번 못 지켰어요. 이제 말보다 몸짓이 편해졌어요. 두 번 더 못 지키면 이번 달은 끝나요.',
  '네 번 못 지켰어요. 네 발로 걷는 진짜 유인원이 됐어요. 한 번만 더 못 지키면 이번 달은 여기서 끝나요.',
];

export const ALPHA_DESCRIPTION =
  '한 달 내내 하루도 빠짐없이 모든 일을 제때 시작한 사람만 만나는 모습. 현대인을 넘어선 왕, 알파메일이에요.';

// 단계 설명(알파메일 포함)
export const stageDescription = (index: number) => (index === ALPHA_STAGE ? ALPHA_DESCRIPTION : (STAGE_DESCRIPTION[index] ?? ''));

// 그 단계가 되는 조건 안내
export const stageCondition = (index: number) =>
  index === ALPHA_STAGE ? '한 달 전부 성공' : index === 0 ? '못 지킨 날 0번' : `못 지킨 날 ${index}번`;

// 단계 이름 앞 번호 안내: 알파메일은 숨겨진 단계라 번호 대신 "이스터에그"
export const stageOrdinal = (index: number) => (index === ALPHA_STAGE ? '이스터에그' : `${index + 1}단계`);
