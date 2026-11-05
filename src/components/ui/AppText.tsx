import { Text, type TextProps } from 'react-native';

import { scaledTypography, useColors, useFontScale, type ColorToken, type TypographyVariant } from '@/theme';

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
};

export const AppText = ({ variant = 'body', color = 'ink', style, ...rest }: AppTextProps) => {
  const colors = useColors();
  const scale = useFontScale();

  return (
    <Text
      maxFontSizeMultiplier={1.2}
      {...rest}
      style={[scaledTypography(variant, scale), { color: colors[color] }, style]}
    />
  );
};
