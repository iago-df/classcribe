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
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
    <Path d="M10.3 2.6h3.4l.5 2.6a7.4 7.4 0 0 1 1.9 1.1l2.5-.9 1.7 2.9-2 1.7a7.6 7.6 0 0 1 0 2.2l2 1.7-1.7 2.9-2.5-.9a7.4 7.4 0 0 1-1.9 1.1l-.5 2.6h-3.4l-.5-2.6a7.4 7.4 0 0 1-1.9-1.1l-2.5.9-1.7-2.9 2-1.7a7.6 7.6 0 0 1 0-2.2l-2-1.7 1.7-2.9 2.5.9a7.4 7.4 0 0 1 1.9-1.1Z" />
    <Circle cx={12} cy={12} r={2.9} />
  </Svg>
);

export const LockIcon = ({ size = 18, color = '#0b0b0b', open = false }: P & { open?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round">
    <Rect x={4.5} y={10.5} width={15} height={10} rx={3} />
    <Path d={open ? 'M8 10.5V7.8a4 4 0 0 1 7.6-1.7' : 'M8 10.5V7.5a4 4 0 0 1 8 0v3'} />
  </Svg>
);

export const FolderIcon = ({ size = 22, color = '#0b0b0b', filled = false }: P & { filled?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.8} strokeLinejoin="round">
    <Path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6l2 2.2h7.4A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5Z" />
  </Svg>
);

export const ShareIcon = ({ size = 22, color = '#ffffff' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" />
    <Path d="M5 12.5v5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-5" />
  </Svg>
);

export const TrashIcon = ({ size = 22, color = '#ffffff' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 6.5h16M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7" />
    <Path d="m6 6.5 .9 12.2A2 2 0 0 0 8.9 20.5h6.2a2 2 0 0 0 2-1.8L18 6.5M10 10.5v6M14 10.5v6" />
  </Svg>
);

export const PencilIcon = ({ size = 22, color = '#ffffff' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z" />
    <Path d="m13.5 6.5 4 4" />
  </Svg>
);

export const StarIcon = ({ size = 22, color = '#ffffff', filled = false }: P & { filled?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.8} strokeLinejoin="round">
    <Path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z" />
  </Svg>
);

export const UpIcon = ({ size = 20, color = '#0b0b0b' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 14 4 9l5-5" />
    <Path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Svg>
);

export const CloseIcon = ({ size = 20, color = '#0b0b0b' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <Path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const FileIcon = ({ size = 22, color = '#0b0b0b' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
    <Path d="M6.5 3h7.5l4.5 4.5v11A2.5 2.5 0 0 1 16 21H8a2.5 2.5 0 0 1-2.5-2.5v-13A2.5 2.5 0 0 1 8 3" />
    <Path d="M13.5 3v5h5" />
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
