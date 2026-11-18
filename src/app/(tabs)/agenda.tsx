import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { colors } from '../../theme';
import { currentBlock, hhmm, isoWeek, nextBlock } from '../../lib/time';
import WeekGrid from '../../components/WeekGrid';
import AlertCard from '../../components/AlertCard';
import { Empty, H1, Kicker, Pad, Screen, Segmented, T } from '../../components/ui';

export default function AgendaScreen() {
  const { t } = useT();
  const alerts = useStore((s) => s.alerts);
  const blocks = useStore((s) => s.blocks);
  const subjects = useStore((s) => s.subjects);
  const [now, setNow] = useState(new Date());
  const pending = alerts.filter((a) => !a.done);
  const [tab, setTab] = useState<'alerts' | 'schedule'>(blocks.length === 0 || pending.length === 0 ? 'schedule' : 'alerts');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const sorted = useMemo(() => {
    const byDue = (a: (typeof alerts)[number], b: (typeof alerts)[number]) =>
      (a.due ?? '9999').localeCompare(b.due ?? '9999') || b.createdAt - a.createdAt;
    return { open: pending.slice().sort(byDue), done: alerts.filter((a) => a.done).sort((a, b) => b.createdAt - a.createdAt) };
  }, [alerts]);

  const cur = currentBlock(blocks, now);
  const nxt = cur ? null : nextBlock(blocks, now);
  const shown = cur ?? nxt;
  const shownSubject = shown && subjects.find((s) => s.id === shown.subjectId);

  return (
    <Screen>
      <Pad>
        <Kicker>{t('agenda.week', { n: isoWeek(now) })}</Kicker>
        <H1>{t('agenda.title')}</H1>
      </Pad>
      <Pad style={{ marginTop: 18 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'alerts', label: t('agenda.alerts', { n: pending.length }) },
            { key: 'schedule', label: t('agenda.schedule') },
          ]}
        />
      </Pad>

      {tab === 'schedule' ? (
        <>
          <View style={{ paddingHorizontal: 22, marginTop: 18 }}>
            <WeekGrid now={now} />
          </View>
          {blocks.length === 0 ? (
            <T style={st.hint}>{t('agenda.tapToAdd')}</T>
          ) : (
            <Pad style={{ marginTop: 18 }}>
              <View style={st.nowCard}>
                <View style={{ flex: 1 }}>
                  <Kicker>
                    {cur
                      ? cur.room
                        ? t('agenda.nowRoom', { room: cur.room })
                        : t('agenda.now')
                      : nxt
                        ? t('agenda.next', { time: hhmm(nxt.start) })
                        : t('agenda.free')}
                  </Kicker>
                  {shownSubject && (
                    <T weight="semibold" style={{ fontSize: 16, marginTop: 3 }}>
                      {shownSubject.name}
                      {shown?.kind === 'practice' ? ` · ${t('block.practice')}` : ''}
                    </T>
                  )}
                </View>
                {cur && (
                  <Pressable accessibilityLabel="Record" onPress={() => router.navigate('/')} style={st.recMini}>
                    <View style={st.recMiniDot} />
                  </Pressable>
                )}
              </View>
            </Pad>
          )}
        </>
      ) : (
        <Pad style={{ marginTop: 18 }}>
          {alerts.length === 0 && <Empty title={t('agenda.alerts', { n: 0 })} hint={t('agenda.noAlerts')} />}
          {sorted.open.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
          {sorted.done.length > 0 && <Kicker style={{ marginTop: 18, marginBottom: 10 }}>{t('agenda.completed')}</Kicker>}
          {sorted.done.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </Pad>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  hint: { textAlign: 'center', color: colors.mute, fontSize: 13, marginTop: 16 },
  nowCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recMini: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  recMiniDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.white },
});
