import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/** levels: 0..1, newest last */
export default function Waveform({ levels, active }: { levels: number[]; active: boolean }) {
  return (
    <View style={st.wave}>
      {levels.map((l, i) => {
        // taper the edges a bit like the promo
        const env = 0.55 + 0.45 * Math.sin((i / Math.max(1, levels.length - 1)) * Math.PI);
        return <View key={i} style={[st.bar, { height: 4 + (active ? l * env * 88 : 0), opacity: active ? 1 : 0.25 }]} />;
      })}
    </View>
  );
}

const st = StyleSheet.create({
  wave: { height: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bar: { width: 3.5, borderRadius: 3, backgroundColor: colors.ink },
});
