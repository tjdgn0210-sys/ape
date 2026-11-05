import { Image, View } from 'react-native';

import { useColors, type ColorToken } from '@/theme';

const apeImage = require('../../../../assets/icons/logo-ape-black.png');

// 원본 1254px 그림에서 그려진 부분은 (282,328)-(973,978).
const APE_INK = { left: 282, top: 328, width: 691, height: 650, source: 1254 } as const;

type ApeMarkProps = { height: number; tint?: ColorToken; opacity?: number };

// 실패 표시용 유인원. 여백 없이 그려진 부분만큼의 상자에 맞춰 넣는다.
export const ApeMark = ({ height, tint = 'ink', opacity = 1 }: ApeMarkProps) => {
  const colors = useColors();
  const k = height / APE_INK.height;
  return (
    <View style={{ width: APE_INK.width * k, height, overflow: 'hidden', opacity }}>
      <Image
        source={apeImage}
        style={{
          position: 'absolute',
          width: APE_INK.source * k,
          height: APE_INK.source * k,
          left: -APE_INK.left * k,
          top: -APE_INK.top * k,
          tintColor: colors[tint],
        }}
      />
    </View>
  );
};
