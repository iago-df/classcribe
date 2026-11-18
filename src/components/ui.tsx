import { type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, pad, radius } from '../theme';
import { BackIcon } from './icons';

export function T({ style, mono, weight = 'regular', ...rest }: TextProps & { mono?: boolean; weight?: 'regular' | 'medium' | 'semibold' }) {
  const family = mono ? (weight === 'regular' ? fonts.mono : fonts.monoMedium) : fonts[weight];
  return <Text {...rest} style={[{ fontFamily: family, color: colors.ink }, style]} />;
}

export const Kicker = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <T mono style={[s.kicker, style]}>
    {children}
  </T>
);

export const H1 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <T weight="semibold" style={[s.h1, style]}>
    {children}
  </T>
);

/** screen wrapper: paper background, safe area, optional scroll, leaves room for the floating nav */
export function Screen({
  children,
  scroll = true,
  bottomSpace = 120,
  scrollEnabled = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  bottomSpace?: number;
  scrollEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const inner = { paddingTop: insets.top + 18, paddingBottom: insets.bottom + bottomSpace };
  if (!scroll) return <View style={[s.screen, inner, style]}>{children}</View>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[inner, style]} showsVerticalScrollIndicator={false} scrollEnabled={scrollEnabled}>
      {children}
    </ScrollView>
  );
}

export const Pad = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ paddingHorizontal: pad }, style]}>{children}</View>
);

export function BackLink({ label }: { label: string }) {
  return (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12} style={s.back}>
      <BackIcon />
      <T weight="medium" style={{ fontSize: 15 }}>
        {label}
      </T>
    </Pressable>
  );
}

export function Chip({ label, dark = true, dot = true, onPress }: { label: string; dark?: boolean; dot?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, !dark && s.chipLight]}>
      {dot && <View style={[s.chipDot, !dark && { backgroundColor: colors.ink }]} />}
      <T weight="medium" style={{ fontSize: 15, color: dark ? colors.white : colors.ink }}>
        {label}
      </T>
    </Pressable>
  );
}

export const MiniChip = ({ label }: { label: string }) => (
  <View style={s.mchip}>
    <T mono style={{ fontSize: 11, color: '#555' }}>
      {label}
    </T>
  </View>
);

export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[s.segItem, on && s.segOn]}>
            <T weight="medium" style={{ fontSize: 13, color: on ? colors.white : '#7c7c79' }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'dark',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'dark' | 'light' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'dark' ? colors.ink : variant === 'light' ? colors.soft : 'transparent';
  const fg = variant === 'dark' ? colors.white : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.35 : pressed ? 0.8 : 1 }, style]}
    >
      <T weight="semibold" style={{ fontSize: 16, color: fg }}>
        {label}
      </T>
    </Pressable>
  );
}

export const SmallPill = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [s.smallPill, pressed && { opacity: 0.8 }]}>
    <T weight="medium" style={{ fontSize: 14, color: colors.white }}>
      {label}
    </T>
  </Pressable>
);

export function Row({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[s.row, selected && { backgroundColor: colors.soft }]}>
      <T weight="medium" style={{ fontSize: 16 }}>
        {label}
      </T>
      {selected ? (
        <View style={s.ck}>
          <View style={s.ckMark} />
        </View>
      ) : (
        <View style={s.em} />
      )}
    </Pressable>
  );
}

export { Sheet, SheetScreen, useSheetClose } from './Sheet';

export const Empty = ({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) => (
  <View style={s.empty}>
    <T weight="semibold" style={{ fontSize: 18, letterSpacing: -0.4 }}>
      {title}
    </T>
    {hint && <T style={{ fontSize: 14, color: colors.mute, textAlign: 'center', lineHeight: 20 }}>{hint}</T>}
    {children}
  </View>
);

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  kicker: { fontSize: 11, letterSpacing: 0.9, color: colors.mute, textTransform: 'uppercase' },
  h1: { fontSize: 34, letterSpacing: -1.3, marginTop: 6 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 16,
    alignSelf: 'flex-start',
  },
  chipLight: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  chipDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  mchip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.soft },
  seg: { flexDirection: 'row', backgroundColor: colors.soft, borderRadius: 16, padding: 4, gap: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
  segOn: { backgroundColor: colors.ink },
  btn: { height: 58, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  smallPill: { backgroundColor: colors.ink, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  ck: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  ckMark: {
    width: 9,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.white,
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  em: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#d0d0cd' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 30 },
});
