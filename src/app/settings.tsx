import { useEffect, useState } from 'react';
import { Alert as RNAlert, Platform, StyleSheet, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { useStore } from '../store';
import { useT } from '../i18n';
import { colors, fonts } from '../theme';
import { getKey, setKey, type KeyName } from '../lib/keys';
import { removeFile, wipeFiles } from '../lib/files';
import { Button, Kicker, Segmented, SheetScreen, T, useSheetClose } from '../components/ui';

export default function Settings() {
  return (
    <SheetScreen>
      <SettingsBody />
    </SheetScreen>
  );
}

function SettingsBody() {
  const { t, lang } = useT();
  const close = useSheetClose();
  const setLanguage = useStore((s) => s.setLanguage);
  const wipe = useStore((s) => s.wipe);

  function wipeAll() {
    const go = () => {
      useStore.getState().lectures.forEach((l) => removeFile(l.audioUri));
      wipeFiles();
      wipe();
      close();
    };
    if (Platform.OS === 'web') return globalThis.confirm?.(t('settings.wipeMsg')) && go();
    RNAlert.alert(t('settings.wipe'), t('settings.wipeMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: go },
    ]);
  }

  return (
    <View>
      <T weight="semibold" style={st.title}>
        {t('settings.title')}
      </T>

      <Kicker style={st.label}>{t('settings.language')}</Kicker>
      <Segmented
        value={lang}
        onChange={setLanguage}
        options={[
          { key: 'en', label: 'English' },
          { key: 'es', label: 'Español' },
        ]}
      />

      <Kicker style={st.label}>{t('settings.ai')}</Kicker>
      <T style={st.hint}>{t('settings.aiHint')}</T>
      <KeyField name="anthropic_api_key" label={t('settings.anthropicKey')} placeholder="sk-ant-…" />
      <KeyField name="openai_api_key" label={t('settings.openaiKey')} placeholder="sk-…" />

      <Kicker style={st.label}>{t('settings.data')}</Kicker>
      <Button label={t('settings.wipe')} variant="light" onPress={wipeAll} />

      <Button label={t('common.done')} onPress={close} style={{ marginTop: 24 }} />
      <Kicker style={{ textAlign: 'center', marginTop: 16 }}>{t('settings.version', { v: Constants.expoConfig?.version ?? '' })}</Kicker>
    </View>
  );
}

function KeyField({ name, label, placeholder }: { name: KeyName; label: string; placeholder: string }) {
  const { t } = useT();
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getKey(name).then((v) => setSaved(!!v));
  }, [name]);

  async function commit() {
    if (!value.trim()) return;
    await setKey(name, value);
    setValue('');
    setSaved(true);
  }

  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <T weight="medium" style={{ fontSize: 14 }}>
          {label}
        </T>
        <T mono style={{ fontSize: 11, color: saved ? colors.ink : colors.mute }}>
          {saved ? `● ${t('settings.keySaved')}` : t('settings.keyMissing')}
        </T>
      </View>
      <TextInput
        value={value}
        onChangeText={setValue}
        onBlur={commit}
        onSubmitEditing={commit}
        placeholder={saved ? '••••••••••••••••' : placeholder}
        placeholderTextColor={colors.faint}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={st.input}
      />
    </View>
  );
}

const st = StyleSheet.create({
  title: { fontSize: 28, letterSpacing: -1 },
  label: { marginTop: 22, marginBottom: 10 },
  hint: { fontSize: 13, lineHeight: 19, color: colors.mute },
  input: {
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.soft,
    borderWidth: 0,
    borderColor: colors.line,
    paddingHorizontal: 18,
    fontSize: 15,
    fontFamily: fonts.mono,
    color: colors.ink,
  },
});
