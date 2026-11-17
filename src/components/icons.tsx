import Svg, { Circle, Path, Rect } from 'react-native-svg';

type P = { size?: number; color?: string };

export const StackIcon = ({ size = 22, color = '#0b0b0b' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
    <Path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <Path d="m3 12.5 9 5 9-5" />
    <Path d="m3 17 9 5 9-5" opacity={0.5} />
  </Svg>
);

export const CalendarIcon = ({ size = 22, color = '#0b0b0b' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
    <Rect x={3.5} y={5} width={17} height={15.5} rx={4} />
    <Path d="M8 3v4M16 3v4M3.5 10h17" />
    <Circle cx={15.5} cy={15} r={1.4} fill={color} stroke="none" />
  </Svg>
);

export const BackIcon = ({ size = 22, color = '#0b0b0b' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M15 5 8 12l7 7" />
  </Svg>
);

export const GearIcon = ({ size = 20, color = '#0b0b0b' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <Circle cx={12} cy={12} r={3.2} />
    <Path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3 5.5 5.5" strokeLinecap="round" />
  </Svg>
);

export const PlusIcon = ({ size = 20, color = '#0b0b0b' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

export const CheckIcon = ({ size = 14, color = '#ffffff' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const PlayIcon = ({ size = 22, color = '#ffffff' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill={color} />
  </Svg>
);

export const PauseIcon = ({ size = 22, color = '#ffffff' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={6.5} y={5} width={4} height={14} rx={1.4} fill={color} />
    <Rect x={13.5} y={5} width={4} height={14} rx={1.4} fill={color} />
  </Svg>
);

export const SkipIcon = ({ size = 22, color = '#0b0b0b', back = false }: P & { back?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    style={back ? { transform: [{ scaleX: -1 }] } : undefined}>
    <Path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <Path d="M20 4v4h-4" />
  </Svg>
);

export const ChevronIcon = ({ size = 16, color = '#8b8b88' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m9 5 7 7-7 7" />
  </Svg>
);
