import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useT } from '../i18n';
import { shortDate } from '../lib/time';
import type { Lecture } from '../types';
import { colors } from '../theme';
import { T } from './ui';

export default function LectureRow({ lecture }: { lecture: Lecture }) {
  const { t, locale } = useT();
  const min = Math.max(1, Math.round(lecture.durationMs / 60000));
  const state =
    lecture.status === 'ready'
      ? t('subjects.notesReady')
      : lecture.status === 'error'
        ? t('subjects.failed')
        : lecture.status === 'interrupted'
          ? t('subjects.interrupted')
          : t('subjects.processing', { p: Math.round(lecture.progress * 100) });

  const broken = lecture.status === 'error' || lecture.status === 'interrupted';
  return (
    <Pressable
      onPress={() => router.push(`/lecture/${lecture.id}`)}
      style={({ pressed }) => [st.row, pressed && { opacity: 0.7 }]}
    >
      <View style={st.ico}>
        <T mono style={st.icoText}>
          REC
        </T>
      </View>
      <View style={{ flex: 1 }}>
        <T weight="medium" numberOfLines={1} style={st.title}>
          {shortDate(locale, lecture.createdAt)} · {lecture.title}
        </T>
        <T style={[st.sub, broken && { color: colors.ink }]}>
          {t('common.min', { n: min })} · {state}
        </T>
      </View>
      {lecture.status === 'ready' && !lecture.seen && <View style={st.dot} />}
    </Pressable>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  ico: { width: 46, height: 54, borderRadius: 10, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 7 },
  icoText: { fontSize: 9.5, color: '#bbbbbb' },
  title: { fontSize: 15, letterSpacing: -0.2 },
  sub: { fontSize: 12, color: colors.mute, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink },
});
