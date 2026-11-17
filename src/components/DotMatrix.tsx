import { memo } from 'react';
import Svg, { Circle } from 'react-native-svg';

// 5x7 dot font, same one used in the promo
const F: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ':': ['0', '0', '1', '0', '1', '0', '0'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

interface Props {
  text: string;
  cell?: number;
  radius?: number;
  on?: string;
  off?: string;
}

function DotMatrix({ text, cell = 8.5, radius = 3, on = '#0b0b0b', off = 'rgba(0,0,0,0.07)' }: Props) {
  const cols: (boolean[] | null)[] = [];
  for (const ch of text) {
    const g = F[ch] ?? F[' '];
    for (let c = 0; c < g[0].length; c++) cols.push(g.map((row) => row[c] === '1'));
    cols.push(null);
  }
  cols.pop();
  const w = cols.length * cell;
  const h = 7 * cell;
  return (
    <Svg width={w} height={h}>
      {cols.flatMap((col, x) =>
        Array.from({ length: 7 }, (_, y) => (
          <Circle
            key={`${x}-${y}`}
            cx={x * cell + cell / 2}
            cy={y * cell + cell / 2}
            r={radius}
            fill={col?.[y] ? on : off}
          />
        )),
      )}
    </Svg>
  );
}

export default memo(DotMatrix);
