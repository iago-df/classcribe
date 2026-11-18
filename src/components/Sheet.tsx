import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type KeyboardEvent,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

/** height of the on-screen keyboard, 0 when hidden */
export function useKeyboardHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(show, (e: KeyboardEvent) => setH(e.endCoordinates.height));
    const b = Keyboard.addListener(hide, () => setH(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return h;
}

const CloseCtx = createContext<() => void>(() => {});
/** closes the sheet you are in, with its slide-down animation */
export const useSheetClose = () => useContext(CloseCtx);

/**
 * the white panel: slides up, follows the finger when dragged down and closes past a threshold,
 * sits on top of the keyboard and clears the android navigation buttons
 */
function Panel({
  open,
  onRequestClose,
  onClosed,
  children,
}: {
  open: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const { height } = useWindowDimensions();
  const y = useRef(new Animated.Value(height)).current;
  const panelH = useRef(height * 0.6);
  const request = useRef(onRequestClose);
  request.current = onRequestClose;

  useEffect(() => {
    if (open) {
      Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 260, mass: 0.9 }).start();
    } else {
      Animated.timing(y, { toValue: panelH.current + 60, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onClosed();
      });
    }
  }, [open]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderGrant: () => Keyboard.dismiss(),
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > panelH.current * 0.22 || g.vy > 0.8) request.current();
        else Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 300 }).start();
      },
      onPanResponderTerminate: () => Animated.spring(y, { toValue: 0, useNativeDriver: true }).start(),
    }),
  ).current;

  const dim = y.interpolate({ inputRange: [0, Math.max(1, panelH.current)], outputRange: [1, 0], extrapolate: 'clamp' });
  const close = () => {
    Keyboard.dismiss();
    request.current();
  };

  return (
    <CloseCtx.Provider value={close}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[st.dim, { opacity: dim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          {...pan.panHandlers}
          onLayout={(e) => (panelH.current = e.nativeEvent.layout.height)}
          style={[
            st.panel,
            { maxHeight: height - insets.top - 12 - kb, marginBottom: kb, paddingBottom: kb ? 16 : insets.bottom + 18, transform: [{ translateY: y }] },
          ]}
        >
          <View style={st.handleZone}>
            <View style={st.handle} />
          </View>
          {children}
        </Animated.View>
      </View>
    </CloseCtx.Provider>
  );
}

/** bottom sheet over the current screen */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);
  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Panel open={visible} onRequestClose={onClose} onClosed={() => setMounted(false)}>
        {children}
      </Panel>
    </Modal>
  );
}

/** a whole route shown as a bottom sheet (presentation: transparentModal) */
export function SheetScreen({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Panel open={open} onRequestClose={() => setOpen(false)} onClosed={() => router.back()}>
      {children}
    </Panel>
  );
}

const st = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFill, backgroundColor: colors.dim },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 26,
  },
  handleZone: { alignItems: 'center', paddingTop: 12, paddingBottom: 18 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#d8d8d5' },
});
