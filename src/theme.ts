export const colors = {
  paper: '#f6f6f4',
  white: '#ffffff',
  ink: '#0b0b0b',
  soft: '#efefec',
  line: '#e4e4e1',
  mute: '#8b8b88',
  faint: '#b9b9b6',
  body: '#3c3c3a',
  dim: 'rgba(0,0,0,0.38)',
};

// the four greys used for subjects in the week grid (c1..c4 in the promo)
export const shades = [
  { bg: '#0b0b0b', fg: '#ffffff' },
  { bg: '#4a4a48', fg: '#eeeeee' },
  { bg: '#a6a6a3', fg: '#111111' },
  { bg: '#dededb', fg: '#222222' },
] as const;

export const fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
};

export const radius = { sm: 10, md: 18, lg: 26, xl: 34, pill: 999 };

export const pad = 24;
