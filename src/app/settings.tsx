import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { confirm } from '../lib/confirm';
import Constants from 'expo-constants';
import { useStore } from '../store';
import { useT } from '../i18n';
import { colors, fonts } from '../theme';
import { getKey, setKey, type KeyName } from '../lib/keys';
import { removeFile, wipeFiles } from '../lib/files';
import { ServerError, parseServerUrl, testServer } from '../lib/ai/server';
import { Button, Kicker, Segmented, SheetScreen, T, useSheetClose } from '../components/ui';

const GUIDE = 'https://github.com/iago-df/classcribe/blob/main/server/README.md';

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
  const engine = useStore((s) => s.settings.engine ?? 'api');
  const setEngine = useStore((s) => s.setEngine);
  const wipe = useStore((s) => s.wipe);

  function wipeAll() {
    const go = () => {
      useStore.getState().lectures.forEach((l) => removeFile(l.audioUri));
      wipeFiles();
      wipe();
      close();
    };
    confirm(t('settings.wipe'), t('settings.wipeMsg'), go);
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
      <Segmented
        value={engine}
        onChange={setEngine}
        options={[
          { key: 'api', label: t('settings.engineApi') },
          { key: 'server', label: t('settings.engineServer') },
        ]}
      />
      {engine === 'api' ? (
        <>
          <T style={[st.hint, { marginTop: 12 }]}>{t('settings.aiHint')}</T>
          <KeyField name="anthropic_api_key" label={t('settings.anthropicKey')} placeholder="sk-ant-…" />
          <KeyField name="openai_api_key" label={t('settings.openaiKey')} placeholder="sk-…" />
        </>
      ) : (
        <ServerFields />
      )}

      <Kicker style={st.label}>{t('settings.data')}</Kicker>
      <Button label={t('settings.wipe')} variant="light" onPress={wipeAll} />

      <Button label={t('common.done')} onPress={close} style={{ marginTop: 24 }} />
      <Kicker style={{ textAlign: 'center', marginTop: 16 }}>{t('settings.version', { v: Constants.expoConfig?.version ?? '' })}</Kicker>
    </View>
  );
}

function ServerFields() {
  const { t } = useT();
  const stored = useStore((s) => s.settings.serverUrl ?? '');
  const setServerUrl = useStore((s) => s.setServerUrl);
  const [url, setUrl] = useState(stored);
  const [token, setToken] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const badUrl = !!url.trim() && !parseServerUrl(url);

  function commitUrl() {
    const clean = parseServerUrl(url);
    if (clean) {
      setUrl(clean);
      setServerUrl(clean);
    } else if (!url.trim()) {
      setServerUrl('');
    }
  }

  async function test() {
    const clean = parseServerUrl(url);
    const secret = token.trim() || (await getKey('server_token'));
    if (!clean || !secret) return setResult({ ok: false, text: t('settings.serverFill') });
    setServerUrl(clean);
    if (token.trim()) await setKey('server_token', token);
    setTesting(true);
    setResult(null);
    try {
      const s = await testServer({ url: clean, token: secret });
      const missing = [!s.claude && 'Claude Code', !s.whisper && 'faster-whisper'].filter(Boolean).join(', ');
      setResult(missing ? { ok: false, text: t('settings.serverMissing', { what: missing }) } : { ok: true, text: t('settings.serverOk', { name: s.name }) });
    } catch (e) {
      const code = e instanceof ServerError ? e.code : 'unreachable';
      const text =
        code === 'auth'
          ? t('settings.serverBadToken')
          : code === 'notClasscribe' || code === 'notFound'
            ? t('settings.serverNotOurs')
            : code === 'outdated'
              ? t('settings.serverOutdated')
              : t('settings.serverUnreachable');
      setResult({ ok: false, text });
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <T style={[st.hint, { marginTop: 12 }]}>{t('settings.serverHint')}</T>
      <View style={{ marginTop: 14 }}>
        <T weight="medium" style={{ fontSize: 14, marginBottom: 8 }}>
          {t('settings.serverUrl')}
        </T>
        <TextInput
          value={url}
          onChangeText={(v) => {
            setUrl(v);
            setResult(null);
          }}
          onBlur={commitUrl}
          onSubmitEditing={commitUrl}
          placeholder="http://100.101.102.103:8788"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={st.input}
        />
        {badUrl && <T style={[st.hint, { marginTop: 8 }]}>{t('settings.serverUrlBad')}</T>}
      </View>
      <KeyField
        name="server_token"
        label={t('settings.serverToken')}
        placeholder="••••••••"
        onDraft={(v) => {
          setToken(v);
          setResult(null);
        }}
      />
      <Button label={testing ? t('settings.serverTesting') : t('settings.serverTest')} variant="light" disabled={testing} onPress={test} style={{ marginTop: 14 }} />
      {result && (
        <T mono={result.ok} style={[st.hint, { marginTop: 10, color: result.ok ? colors.ink : colors.mute }]}>
          {result.ok ? `● ${result.text}` : result.text}
        </T>
      )}
      <Pressable onPress={() => Linking.openURL(GUIDE)} hitSlop={8} style={{ marginTop: 14, alignSelf: 'flex-start' }}>
        <T weight="medium" style={{ fontSize: 13, textDecorationLine: 'underline' }}>
          {t('settings.serverGuide')}
        </T>
      </Pressable>
    </>
  );
}

function KeyField({ name, label, placeholder, onDraft }: { name: KeyName; label: string; placeholder: string; onDraft?: (v: string) => void }) {
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
    onDraft?.('');
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
        onChangeText={(v) => {
          setValue(v);
          onDraft?.(v);
        }}
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
