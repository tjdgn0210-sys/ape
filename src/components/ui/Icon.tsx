import Svg, { Path } from 'react-native-svg';

import { useColors, type ColorToken } from '@/theme';

import { iconPaths, type IconName } from './iconPaths';

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorToken;
};

// size는 viewBox의 긴 변 기준. 비율은 디자인 원본을 유지한다.
export const Icon = ({ name, size = 20, color = 'inkSoft' }: IconProps) => {
  const colors = useColors();
  const icon = iconPaths[name];
  const { viewBox, d } = icon;
  // stroke가 있으면 선 아이콘(채우지 않고 둥근 끝 선으로 그림)
  const stroke = 'stroke' in icon ? icon.stroke : null;
  const [, , w = 1, h = 1] = viewBox.split(' ').map(Number);
  const scale = size / Math.max(w, h);

  return (
    <Svg width={w * scale} height={h * scale} viewBox={viewBox}>
      {stroke === null ? (
        <Path d={d} fill={colors[color]} />
      ) : (
        <Path d={d} fill="none" stroke={colors[color]} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </Svg>
  );
};
