import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from '@/theme';

type DividerProps = {
  style?: StyleProp<ViewStyle>;
};

export const Divider = ({ style }: DividerProps) => {
  const colors = useColors();
  return <View style={[styles.root, { backgroundColor: colors.line }, style]} />;
};

const styles = StyleSheet.create({
  root: { height: 1 },
});
