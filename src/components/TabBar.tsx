import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { colors } from '../theme';
import { CalendarIcon, StackIcon } from './icons';

/** the floating pill nav: subjects · record · agenda */
export default function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const active = state.routes[state.index]?.name;

  const go = (name: string) => {
    if (name === active) return;
    Haptics.selectionAsync().catch(() => {});
    const route = state.routes.find((r: { name: string }) => r.name === name);
    if (route) navigateToTab(route.key);
  };

  const rec = active === 'index';
  return (
    <View pointerEvents="box-none" style={[st.wrap, { bottom: Math.max(insets.bottom, 12) + 14 }]}>
      <View style={st.nav}>
        <Pressable accessibilityLabel="Subjects" onPress={() => go('subjects')} style={[st.it, active === 'subjects' && st.on]}>
          <StackIcon color={active === 'subjects' ? colors.ink : '#9a9a97'} />
        </Pressable>
        <Pressable accessibilityLabel="Record" onPress={() => go('index')} style={[st.rec, !rec && st.recOff]}>
          <View style={[st.recDot, !rec && { backgroundColor: colors.ink }]} />
        </Pressable>
        <Pressable accessibilityLabel="Agenda" onPress={() => go('agenda')} style={[st.it, active === 'agenda' && st.on]}>
          <CalendarIcon color={active === 'agenda' ? colors.ink : '#9a9a97'} />
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  nav: {
    width: 250,
    height: 66,
    backgroundColor: colors.white,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  it: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: colors.soft },
  rec: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  recOff: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.ink },
  recDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.white },
});
