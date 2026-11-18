import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useT } from '../i18n';
import type { Lecture } from '../types';
import { colors } from '../theme';
import DotMatrix from './DotMatrix';
import { T } from './ui';

export function stepKey(l: Lecture) {
  if (l.waiting) return 'steps.waiting' as const;
  if (l.status === 'transcribing') return 'steps.transcribing' as const;
  return l.progress < 0.5 ? ('steps.matching' as const) : ('steps.structuring' as const);
}

/** "Writing your notes · 78%" — the progress pill from the promo, in its light-UI form */
export default function ProcessingPill({ lecture }: { lecture: Lecture }) {
  const { t } = useT();
  const pct = `${Math.round(lecture.progress * 100)}%`;
  return (
    <Pressable onPress={() => router.push(`/lecture/${lecture.id}`)} style={st.pill}>
      <View style={[st.fill, { width: `${Math.max(4, lecture.progress * 100)}%` }]} />
      <View style={{ flex: 1 }}>
        <T weight="medium" style={{ color: colors.white, fontSize: 16, letterSpacing: -0.3 }}>
          {t('record.writing')}
        </T>
        <T mono style={{ color: '#8f8f8c', fontSize: 10.5, letterSpacing: 0.8, marginTop: 4, textTransform: 'uppercase' }}>
          {t(stepKey(lecture))}
        </T>
      </View>
      <DotMatrix text={pct.padStart(4, ' ')} cell={5} radius={1.8} on={colors.white} off="rgba(255,255,255,0.09)" />
    </Pressable>
  );
}

const st = StyleSheet.create({
  pill: {
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 26,
    paddingRight: 22,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRightWidth: 1.5,
    borderRightColor: 'rgba(255,255,255,0.6)',
  },
});
