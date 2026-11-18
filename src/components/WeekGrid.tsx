import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../store';
import { useT } from '../i18n';
import { colors, shades } from '../theme';
import { minutesOfDay, weekday } from '../lib/time';
import { T } from './ui';

const HOUR = 64;
const LABEL = 26;

export default function WeekGrid({ now }: { now: Date }) {
  const { dict } = useT();
  const blocks = useStore((s) => s.blocks);
  const subjects = useStore((s) => s.subjects);
  // the grid sits inside 22px side padding
  const w = useWindowDimensions().width - 44;

  // show 8:00–14:00 by default and grow to fit whatever is in the schedule
  const from = Math.min(8, ...blocks.map((b) => Math.floor(b.start / 60)));
  const to = Math.max(from + 6, ...blocks.map((b) => Math.ceil(b.end / 60)));
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const colW = w ? (w - LABEL) / 5 : 0;
  const y = (min: number) => 24 + ((min - from * 60) / 60) * HOUR;
  const today = weekday(now);
  const nowMin = minutesOfDay(now);
  const showNow = today < 5 && nowMin >= from * 60 && nowMin <= to * 60;

  return (
    <View style={{ height: y(to * 60) + 6 }}>
      {dict.days.short.map((d, i) => (
        <T key={i} mono style={[st.day, { left: LABEL + i * colW, width: colW }, i === today && { color: colors.ink }]}>
          {d}
        </T>
      ))}
      {hours.map((h) => (
        <View key={h}>
          <T mono style={[st.hour, { top: y(h * 60) - 6 }]}>
            {h}
          </T>
          <View style={[st.rule, { top: y(h * 60), left: LABEL }]} />
        </View>
      ))}

      {/* tap targets for empty slots */}
      {w > 0 &&
        [0, 1, 2, 3, 4].map((d) => (
          <Pressable
            key={d}
            style={{ position: 'absolute', left: LABEL + d * colW, width: colW, top: 24, bottom: 0 }}
            onPress={(e) => {
              const start = Math.round(((e.nativeEvent.locationY / HOUR) * 60 + from * 60) / 30) * 30;
              router.push({ pathname: '/block', params: { day: d, start } });
            }}
          />
        ))}

      {w > 0 &&
        blocks.map((b) => {
          const subj = subjects.find((s) => s.id === b.subjectId);
          const practice = b.kind === 'practice';
          const sh = shades[(practice ? subj?.practiceShade ?? subj?.shade : subj?.shade) ?? 0];
          return (
            <Pressable
              key={b.id}
              onPress={() => router.push({ pathname: '/block', params: { id: b.id } })}
              style={[
                st.block,
                { left: LABEL + b.day * colW + 2, width: colW - 4, top: y(b.start) + 2, height: y(b.end) - y(b.start) - 4, backgroundColor: sh.bg },
              ]}
            >
              <T mono style={{ fontSize: 9.5, letterSpacing: 0.4, color: sh.fg }}>
                {subj?.abbr ?? '—'}
                {practice ? ` ${dict.block.practiceTag}` : ''}
              </T>
              {b.room && y(b.end) - y(b.start) > 44 ? (
                <T mono style={{ fontSize: 8.5, color: sh.fg, opacity: 0.6, marginTop: 2 }}>
                  {b.room}
                </T>
              ) : null}
            </Pressable>
          );
        })}

      {showNow && w > 0 && (
        <View pointerEvents="none" style={[st.now, { top: y(nowMin), left: LABEL - 4 }]}>
          <View style={[st.nowDot, { left: today * colW + 2 }]} />
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  day: { position: 'absolute', top: 0, textAlign: 'center', fontSize: 11, color: colors.mute },
  hour: { position: 'absolute', left: 0, fontSize: 9.5, color: '#9a9a97' },
  rule: { position: 'absolute', right: 0, height: 1, backgroundColor: colors.line },
  block: { position: 'absolute', borderRadius: 9, paddingVertical: 5, paddingHorizontal: 6, overflow: 'hidden' },
  now: { position: 'absolute', right: 0, height: 2, backgroundColor: colors.ink },
  nowDot: {
    position: 'absolute',
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
    borderWidth: 3,
    borderColor: colors.paper,
    boxSizing: 'content-box',
  },
});
