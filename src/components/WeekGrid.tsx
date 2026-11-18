import { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useStore } from '../store';
import { useT } from '../i18n';
import { colors, shades } from '../theme';
import { hhmm, minutesOfDay, weekday } from '../lib/time';
import type { ScheduleBlock } from '../types';
import { T } from './ui';

const HOUR = 64;
const LABEL = 26;

/** hold a class and drag it to another day or time */
export default function WeekGrid({ now, onMoving }: { now: Date; onMoving?: (moving: boolean) => void }) {
  const { dict } = useT();
  const blocks = useStore((s) => s.blocks);
  const subjects = useStore((s) => s.subjects);
  const locked = useStore((s) => !!s.settings.scheduleLocked);
  const upsertBlock = useStore((s) => s.upsertBlock);
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

  // ---------- moving a class ----------
  const [moving, setMoving] = useState<{ block: ScheduleBlock; day: number; start: number } | null>(null);
  const mv = useRef({ on: false, granted: false, x: 0, y: 0, block: null as ScheduleBlock | null, day: 0, start: 0 });
  const geo = useRef({ colW, from, to });
  geo.current = { colW, from, to };

  const startMove = (b: ScheduleBlock, e: GestureResponderEvent) => {
    mv.current = { on: true, granted: false, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, block: b, day: b.day, start: b.start };
    setMoving({ block: b, day: b.day, start: b.start });
    onMoving?.(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };
  const endMove = () => {
    mv.current.on = false;
    setMoving(null);
    onMoving?.(false);
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: () => mv.current.on,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => (mv.current.granted = true),
      onPanResponderMove: (_, g) => {
        const m = mv.current;
        const b = m.block;
        if (!b) return;
        const { colW: cw, from: f, to: tt } = geo.current;
        const dur = b.end - b.start;
        const day = Math.max(0, Math.min(4, Math.round(b.day + (g.moveX - m.x) / cw)));
        const raw = b.start + ((g.moveY - m.y) / HOUR) * 60;
        const start = Math.max(f * 60, Math.min(tt * 60 - dur, Math.round(raw / 5) * 5));
        if (day !== m.day || start !== m.start) {
          m.day = day;
          m.start = start;
          setMoving({ block: b, day, start });
          Haptics.selectionAsync().catch(() => {});
        }
      },
      onPanResponderRelease: () => {
        const m = mv.current;
        const b = m.block;
        if (b && (m.day !== b.day || m.start !== b.start)) {
          upsertBlock({ ...b, day: m.day, start: m.start, end: m.start + (b.end - b.start) });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        endMove();
      },
      onPanResponderTerminate: () => endMove(),
    }),
  ).current;
  // a hold that never moves just ends
  const pressOut = () =>
    setTimeout(() => {
      if (mv.current.on && !mv.current.granted) endMove();
    }, 60);

  return (
    <View style={{ height: y(to * 60) + 6 }} {...pan.panHandlers}>
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
        !locked &&
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
              disabled={locked}
              onPress={() => router.push({ pathname: '/block', params: { id: b.id } })}
              onLongPress={(e) => startMove(b, e)}
              onPressOut={pressOut}
              delayLongPress={280}
              style={[
                st.block,
                moving?.block.id === b.id && { opacity: 0.3 },
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

      {/* where the class will land */}
      {moving &&
        (() => {
          const b = moving.block;
          const subj = subjects.find((s) => s.id === b.subjectId);
          const sh = shades[(b.kind === 'practice' ? subj?.practiceShade ?? subj?.shade : subj?.shade) ?? 0];
          const end = moving.start + (b.end - b.start);
          return (
            <View
              pointerEvents="none"
              style={[
                st.block,
                st.ghost,
                { left: LABEL + moving.day * colW + 2, width: colW - 4, top: y(moving.start) + 2, height: y(end) - y(moving.start) - 4, backgroundColor: sh.bg },
              ]}
            >
              <T mono style={{ fontSize: 9.5, letterSpacing: 0.4, color: sh.fg }}>
                {subj?.abbr ?? '—'}
                {b.kind === 'practice' ? ` ${dict.block.practiceTag}` : ''}
              </T>
              <T mono style={{ fontSize: 8.5, color: sh.fg, marginTop: 2 }}>
                {hhmm(moving.start)}
              </T>
            </View>
          );
        })()}

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
  ghost: {
    borderWidth: 2,
    borderColor: colors.ink,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    transform: [{ scale: 1.05 }],
  },
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
