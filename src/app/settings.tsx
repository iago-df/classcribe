import { useEffect, useState } from 'react';
import { Alert as RNAlert, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { useT } from '../i18n';
import { colors, fonts } from '../theme';
import { getKey, setKey, type KeyName } from '../lib/keys';
import { removeFile, wipeFiles } from '../lib/files';
import { Button, Kicker, Segmented, T } from '../components/ui';

export default function Settings() {
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const setLanguage = useStore((s) => s.setLanguage);
  const wipe = useStore((s) => s.wipe);

  function wipeAll() {
    const go = () => {
      useStore.getState().lectures.forEach((l) => removeFile(l.audioUri));
      wipeFiles();
      wipe();
      router.back();
    };
    if (Platform.OS === 'web') return globalThis.confirm?.(t('settings.wipeMsg')) && go();
    RNAlert.alert(t('settings.wipe'), t('settings.wipeMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: go },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 22, paddingBottom: insets.bottom + 30 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={st.handle} />
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

      <Button label={t('common.done')} onPress={() => router.back()} style={{ marginTop: 28 }} />
      <Kicker style={{ textAlign: 'center', marginTop: 22 }}>{t('settings.version', { v: Constants.expoConfig?.version ?? '' })}</Kicker>
    </ScrollView>
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
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#d8d8d5', alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 28, letterSpacing: -1 },
  label: { marginTop: 28, marginBottom: 10 },
  hint: { fontSize: 13, lineHeight: 19, color: colors.mute },
  input: {
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 18,
    fontSize: 15,
    fontFamily: fonts.mono,
    color: colors.ink,
  },
});
