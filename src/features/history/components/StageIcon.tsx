import { Image, StyleSheet, View } from 'react-native';

import { useColors, type ColorToken } from '@/theme';

import { STAGE_IMAGE_PX, stageAt } from '../stages';

type StageIconProps = {
  stage: number;
  // 원본 PNG 한 변의 길이(pt). 같은 값을 쓰면 단계끼리 그림 크기 비율이 유지된다.
  imageSize: number;
  opacity?: number;
  // 실루엣 그림에 입힐 색. 다크 모드에서는 밝은 색이 되어야 보인다.
  tint?: ColorToken;
};

// 그려진 부분만큼의 상자를 만들어서, 호출한 쪽이 여백 없이 위치를 맞출 수 있게 한다.
export const StageIcon = ({ stage, imageSize, opacity = 1, tint = 'ink' }: StageIconProps) => {
  const colors = useColors();
  const { ink, source, label } = stageAt(stage);
  const k = imageSize / STAGE_IMAGE_PX;

  return (
    <View style={{ width: ink.width * k, height: ink.height * k, opacity }} accessibilityLabel={label}>
      <Image
        source={source}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        style={[
          styles.image,
          { width: imageSize, height: imageSize, left: -ink.left * k, top: -ink.top * k, tintColor: colors[tint] },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({ image: { position: 'absolute' } });
