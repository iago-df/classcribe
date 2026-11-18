import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert as RNAlert, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useStore, uid } from '../../store';
import { useT } from '../../i18n';
import { colors } from '../../theme';
import { clock, currentBlock, hhmm, kickerDate, timeOf } from '../../lib/time';
import { keepRecording, removeFile } from '../../lib/files';
import { processLecture } from '../../lib/ai/process';
import DotMatrix from '../../components/DotMatrix';
import Waveform from '../../components/Waveform';
import ProcessingPill from '../../components/ProcessingPill';
import { Button, Chip, H1, Kicker, Pad, Row, Screen, Sheet, T } from '../../components/ui';

// mono, 16 kHz, 32 kbps: a 50 min lecture is ~12 MB, well under whisper's 25 MB upload limit
const OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
};

const BARS = 46;

export default function RecordScreen() {
  const { t, locale } = useT();
  const { width } = useWindowDimensions();
  const subjects = useStore((s) => s.subjects);
  const blocks = useStore((s) => s.blocks);
  const lectures = useStore((s) => s.lectures);
  const addLecture = useStore((s) => s.addLecture);

  const recorder = useAudioRecorder(OPTIONS);
  const rec = useAudioRecorderState(recorder, 90);

  const [now, setNow] = useState(new Date());
  const [picked, setPicked] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<{ uri: string; durationMs: number; startedAt: number } | null>(null);
  const [saveSubject, setSaveSubject] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const startedAt = useRef(0);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const block = useMemo(() => currentBlock(blocks, now), [blocks, now]);
  const detected = block ? subjects.find((s) => s.id === block.subjectId) ?? null : null;
  const subject = (picked && subjects.find((s) => s.id === picked)) || detected;

  // waveform from the mic level; web doesn't report metering so fake a gentle wave there
  useEffect(() => {
    if (!rec.isRecording) return;
    const db = rec.metering;
    const level =
      typeof db === 'number' ? Math.max(0, Math.min(1, (db + 55) / 50)) : 0.35 + 0.3 * Math.abs(Math.sin(rec.durationMillis / 170));
    setLevels((prev) => [...prev.slice(1), level]);
  }, [rec.durationMillis, rec.isRecording, rec.metering]);

  const processing = lectures.find((l) => l.status === 'transcribing' || l.status === 'writing');
  const recording = rec.isRecording;

  async function start() {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      RNAlert.alert(t('record.title'), t('record.micDenied'));
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    startedAt.current = Date.now();
    setLevels(Array(BARS).fill(0));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }

  async function stop() {
    const durationMs = rec.durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const uri = recorder.uri;
    if (!uri) return;
    setPending({ uri, durationMs, startedAt: startedAt.current });
    setSaveSubject(subject?.id ?? subjects[0]?.id ?? null);
  }

  async function save() {
    if (!pending || !saveSubject) return;
    const id = uid();
    const audioUri = await keepRecording(pending.uri, id);
    const count = lectures.filter((l) => l.subjectId === saveSubject).length;
    const subj = subjects.find((s) => s.id === saveSubject);
    addLecture({
      id,
      subjectId: saveSubject,
      number: count + 1,
      title: subj?.name ?? '',
      unitId: null,
      createdAt: pending.startedAt,
      durationMs: pending.durationMs,
      audioUri,
      status: 'transcribing',
      progress: 0.02,
      usedSyllabus: false,
      seen: false,
    });
    setPending(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    processLecture(id);
  }

  function discard() {
    if (pending) removeFile(pending.uri);
    setPending(null);
  }

  const cell = Math.min(8.5, (width - 52) / 39);
  const status = recording
    ? t('record.recording', { subject: subject?.name ?? '—' })
    : t('record.ready');

  return (
    <Screen scroll={false}>
      <Pad>
        <Kicker>{kickerDate(locale, now)}</Kicker>
        <H1>{t('record.title')}</H1>
      </Pad>

      <Pad style={{ marginTop: 22 }}>
        {subject ? (
          <Chip label={subject.name} onPress={() => !recording && setPicking(true)} />
        ) : (
          <Chip label={t('record.pickSubject')} dark={false} onPress={() => !recording && setPicking(true)} />
        )}
        <T style={st.detail}>
          {detected && subject?.id === detected.id && block
            ? t('record.detected', { from: hhmm(block.start), to: hhmm(block.end) })
            : !subject
              ? t('record.noClass')
              : ' '}
        </T>
      </Pad>

      <View style={st.timer}>
        <DotMatrix text={clock(rec.durationMillis / 1000)} cell={cell} radius={cell * 0.35} />
      </View>
      <Kicker style={st.status}>{(recording ? (Math.floor(rec.durationMillis / 600) % 2 ? '● ' : '○ ') : '') + status}</Kicker>

      <Pad style={{ marginTop: 26 }}>
        <Waveform levels={levels} active={recording} />
      </Pad>

      <Pressable
        accessibilityLabel={recording ? 'Stop' : 'Record'}
        onPress={() => (recording ? stop() : start())}
        style={({ pressed }) => [st.recBtn, pressed && { transform: [{ scale: 0.96 }] }]}
      >
        <View style={recording ? st.coreStop : st.coreRec} />
      </Pressable>

      {processing && !recording && (
        <Pad style={st.pillWrap}>
          <ProcessingPill lecture={processing} />
        </Pad>
      )}

      {/* subject picker */}
      <Sheet visible={picking} onClose={() => setPicking(false)}>
        <T weight="semibold" style={st.sheetTitle}>
          {t('record.pickSubject')}
        </T>
        <View style={{ marginTop: 14 }}>
          {subjects.length === 0 && <T style={st.detail}>{t('record.noSubjects')}</T>}
          {subjects.map((s) => (
            <Row
              key={s.id}
              label={s.name}
              selected={subject?.id === s.id}
              onPress={() => {
                setPicked(s.id);
                setPicking(false);
              }}
            />
          ))}
        </View>
        {subjects.length === 0 && (
          <Button
            label={t('subjects.createSchedule')}
            style={{ marginTop: 18 }}
            onPress={() => {
              setPicking(false);
              router.push('/agenda');
            }}
          />
        )}
      </Sheet>

      {/* save sheet */}
      <Sheet visible={!!pending} onClose={discard}>
        <T weight="semibold" style={st.sheetTitle}>
          {t('record.saveTitle')}
        </T>
        <T style={[st.detail, { marginTop: 4 }]}>
          {t('record.saveMeta', {
            min: Math.max(1, Math.round((pending?.durationMs ?? 0) / 60000)),
            when: `${t('common.today')}, ${timeOf(locale, pending?.startedAt ?? Date.now())}`,
          })}
        </T>
        <Kicker style={{ marginTop: 22, marginBottom: 8, marginLeft: 2 }}>{t('record.subject')}</Kicker>
        {subjects.length === 0 && <T style={st.detail}>{t('record.noSubjects')}</T>}
        {subjects.map((s) => (
          <Row key={s.id} label={s.name} selected={saveSubject === s.id} onPress={() => setSaveSubject(s.id)} />
        ))}
        <Button label={t('record.saveProcess')} onPress={save} disabled={!saveSubject} style={{ marginTop: 22 }} />
        <Pressable onPress={discard} style={{ alignSelf: 'center', padding: 14 }}>
          <T style={{ color: colors.mute, fontSize: 14 }}>{t('record.discard')}</T>
        </Pressable>
      </Sheet>
    </Screen>
  );
}

const st = StyleSheet.create({
  detail: { fontSize: 13, color: colors.mute, marginTop: 10 },
  timer: { alignItems: 'center', marginTop: Platform.OS === 'web' ? 54 : 64 },
  status: { textAlign: 'center', marginTop: 22, fontSize: 12 },
  recBtn: {
    alignSelf: 'center',
    marginTop: 36,
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreRec: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.ink },
  coreStop: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.ink },
  pillWrap: { position: 'absolute', left: 0, right: 0, bottom: 120 },
  sheetTitle: { fontSize: 22, letterSpacing: -0.7 },
});
