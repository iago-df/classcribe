import { Alert, Platform } from 'react-native';
import { translate } from '../i18n';
import { useStore } from '../store';

/** "are you sure?" before anything destructive */
export function confirm(title: string, message: string, onYes: () => void, yesLabel?: string) {
  const lang = useStore.getState().settings.language;
  const yes = yesLabel ?? translate(lang, 'common.delete');
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: translate(lang, 'common.cancel'), style: 'cancel' },
    { text: yes, style: 'destructive', onPress: onYes },
  ]);
}
