import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../store';
import { useT } from '../i18n';
import { clock, dueDate, shortDate } from '../lib/time';
import type { Alert } from '../types';
import { colors } from '../theme';
import { CheckIcon } from './icons';
import { T } from './ui';

export default function AlertCard({ alert }: { alert: Alert }) {
  const { t, locale } = useT();
  const subject = useStore((s) => s.subjects.find((x) => x.id === alert.subjectId));
  const lecture = useStore((s) => s.lectures.find((l) => l.id === alert.lectureId));
  const toggle = useStore((s) => s.toggleAlert);

  const tag = alert.kind === 'exam' ? t('agenda.exam') : alert.kind === 'homework' ? t('agenda.homework') : t('agenda.notice');
  const when = alert.due ? t('agenda.due', { date: dueDate(locale, alert.due) }) : lecture ? shortDate(locale, lecture.createdAt) : '';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/lecture/[id]', params: { id: alert.lectureId, ...(alert.at != null ? { at: alert.at } : {}) } })}
      style={({ pressed }) => [st.card, alert.done && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
    >
      <View style={st.hd}>
        <View style={[st.tag, alert.kind !== 'exam' && st.tagOutline]}>
          <T mono style={{ fontSize: 11, letterSpacing: 1.2, color: alert.kind === 'exam' ? colors.white : colors.ink }}>
            {tag}
          </T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {alert.at != null && (
            <T mono style={{ fontSize: 11, color: colors.mute }}>
              ▶ {clock(alert.at)}
            </T>
          )}
          <Pressable onPress={() => toggle(alert.id)} hitSlop={10} style={[st.check, alert.done && st.checkOn]}>
            {alert.done && <CheckIcon size={12} />}
          </Pressable>
        </View>
      </View>
      <T weight="medium" style={[st.q, alert.done && { textDecorationLine: 'line-through' }]}>
        “{alert.quote.replace(/^["“]|["”]$/g, '')}”
      </T>
      {alert.summary && alert.summary !== alert.quote ? <T style={st.sum}>{alert.summary}</T> : null}
      <T style={st.meta}>{[subject?.name, when].filter(Boolean).join(' · ')}</T>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 26, borderWidth: 1, borderColor: colors.line, padding: 20, marginBottom: 12 },
  hd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tag: { backgroundColor: colors.ink, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  tagOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#c9c9c6' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#d0d0cd', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  q: { fontSize: 19, letterSpacing: -0.6, lineHeight: 24 },
  sum: { fontSize: 13.5, color: colors.body, lineHeight: 19, marginTop: 8 },
  meta: { fontSize: 13, color: colors.mute, marginTop: 10 },
});
