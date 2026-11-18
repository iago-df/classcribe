import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useT } from '../i18n';
import { colors } from '../theme';
import { pad2 } from '../lib/time';
import DotMatrix from './DotMatrix';
import { Sheet } from './Sheet';
import { Button, Kicker, T } from './ui';

type Mode = 'hours' | 'minutes';

/** the usual round clock: outer ring 1–12, inner ring 13–00, then minutes in steps of 5 */
export default function ClockPicker({
  visible,
  title,
  value,
  onDone,
  onClose,
}: {
  visible: boolean;
  title: string;
  value: number; // minutes from midnight
  onDone: (minutes: number) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const [h, setH] = useState(Math.floor(value / 60));
  const [m, setM] = useState(value % 60);
  const [mode, setMode] = useState<Mode>('hours');

  useEffect(() => {
    if (visible) {
      setH(Math.floor(value / 60));
      setM(value % 60);
      setMode('hours');
    }
  }, [visible, value]);

  const size = Math.min(width - 72, 290);
  const R = size / 2;
  const outer = R - 26;
  const inner = R - 66;

  const state = useRef({ mode, moved: false });
  state.current.mode = mode;

  const pick = (x: number, y: number) => {
    const dx = x - R;
    const dy = y - R;
    const angle = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
    if (state.current.mode === 'hours') {
      const i = Math.round(angle / (Math.PI / 6)) % 12;
      const isInner = Math.hypot(dx, dy) < (outer + inner) / 2;
      setH(isInner ? (i === 0 ? 0 : i + 12) : i === 0 ? 12 : i);
    } else {
      setM((Math.round(angle / (Math.PI / 6)) % 12) * 5);
    }
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => pick(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderMove: (e) => pick(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderRelease: () => {
        if (state.current.mode === 'hours') setMode('minutes');
      },
    }),
  ).current;

  // position of a label on the dial
  const at = (i: number, r: number) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: R + Math.sin(a) * r, y: R - Math.cos(a) * r };
  };

  const labels =
    mode === 'hours'
      ? [
          ...Array.from({ length: 12 }, (_, i) => ({ v: i === 0 ? 12 : i, ...at(i, outer), small: false })),
          ...Array.from({ length: 12 }, (_, i) => ({ v: i === 0 ? 0 : i + 12, ...at(i, inner), small: true })),
        ]
      : Array.from({ length: 12 }, (_, i) => ({ v: i * 5, ...at(i, outer), small: false }));

  const selected =
    mode === 'hours'
      ? at(h % 12, h === 0 || h > 12 ? inner : outer)
      : at(Math.round(m / 5) % 12, outer);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Kicker>{title}</Kicker>
      <View style={st.display}>
        <Pressable onPress={() => setMode('hours')} hitSlop={8}>
          <DotMatrix text={pad2(h)} cell={9} radius={3.2} on={mode === 'hours' ? colors.ink : colors.faint} />
        </Pressable>
        <DotMatrix text=":" cell={9} radius={3.2} />
        <Pressable onPress={() => setMode('minutes')} hitSlop={8}>
          <DotMatrix text={pad2(m)} cell={9} radius={3.2} on={mode === 'minutes' ? colors.ink : colors.faint} />
        </Pressable>
      </View>

      <View style={[st.dial, { width: size, height: size, borderRadius: R }]} {...pan.panHandlers}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Line x1={R} y1={R} x2={selected.x} y2={selected.y} stroke={colors.ink} strokeWidth={2} />
          <Circle cx={R} cy={R} r={4} fill={colors.ink} />
          <Circle cx={selected.x} cy={selected.y} r={19} fill={colors.ink} />
        </Svg>
        {labels.map((l) => {
          const on = mode === 'hours' ? l.v === h : l.v === Math.round(m / 5) * 5 % 60;
          return (
            <View key={`${mode}-${l.v}-${l.small}`} pointerEvents="none" style={[st.label, { left: l.x - 18, top: l.y - 18 }]}>
              <T
                mono={l.small}
                weight={l.small ? 'regular' : 'medium'}
                style={{ fontSize: l.small ? 11.5 : 15, color: on ? colors.white : l.small ? colors.mute : colors.ink }}
              >
                {mode === 'minutes' || l.small ? pad2(l.v) : String(l.v)}
              </T>
            </View>
          );
        })}
      </View>

      <View style={st.row}>
        <Button label={t('common.cancel')} variant="light" onPress={onClose} style={{ flex: 1 }} />
        <Button label={t('common.done')} onPress={() => onDone(h * 60 + m)} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}

const st = StyleSheet.create({
  display: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, marginTop: 14, marginBottom: 22 },
  dial: { alignSelf: 'center', backgroundColor: colors.soft },
  label: { position: 'absolute', width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 12, marginTop: 24 },
});
