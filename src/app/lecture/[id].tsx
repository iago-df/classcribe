import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { colors } from '../../theme';
import { clock, shortDate } from '../../lib/time';
import { processLecture } from '../../lib/ai/process';
import { recordingUri, removeFile } from '../../lib/files';
import { confirm } from '../../lib/confirm';
import DotMatrix from '../../components/DotMatrix';
import ProcessingPill from '../../components/ProcessingPill';
import { PauseIcon, PlayIcon, SkipIcon } from '../../components/icons';
import { BackLink, Button, Kicker, MiniChip, Pad, Screen, Segmented, T } from '../../components/ui';
import type { NoteBlock } from '../../types';

type Tab = 'notes' | 'transcript' | 'audio';

export default function LectureScreen() {
  const { id, at } = useLocalSearchParams<{ id: string; at?: string }>();
  const { t, locale } = useT();
  const lecture = useStore((s) => s.lectures.find((l) => l.id === id));
  const subject = useStore((s) => s.subjects.find((x) => x.id === lecture?.subjectId));
  const unit = useStore((s) => s.units.find((u) => u.id === lecture?.unitId));
  const updateLecture = useStore((s) => s.updateLecture);
  const removeLecture = useStore((s) => s.removeLecture);
  const [tab, setTab] = useState<Tab>(at ? 'audio' : 'notes');

  // resolved once: the player must not change source (or be touched) while the screen goes away
  const [audioUri] = useState(() => (lecture ? recordingUri(lecture.id, lecture.audioUri) : null));
  const player = useAudioPlayer(audioUri, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (lecture && audioUri && audioUri !== lecture.audioUri) updateLecture(lecture.id, { audioUri });
  }, []);

  useEffect(() => {
    if (lecture?.status === 'ready' && !lecture.seen) updateLecture(lecture.id, { seen: true });
  }, [lecture?.status, lecture?.seen]);

  useEffect(() => {
    if (at && status.isLoaded) seek(Number(at));
  }, [at, status.isLoaded]);

  if (!lecture) return <Screen>{null}</Screen>;

  // the recorder leaves the session in recording mode; playback needs it back to normal
  async function play() {
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    player.play();
  }

  async function seek(sec: number) {
    await player.seekTo(Math.max(0, sec));
    await play();
    setTab('audio');
  }

  function remove() {
    confirm(t('lecture.deleteLecture'), t('lecture.deleteLectureMsg'), () => {
      const { id: lid, audioUri: stored } = lecture!;
      try {
        player.pause();
      } catch {}
      // leave the screen first, so nothing renders or plays a lecture that no longer exists
      router.back();
      setTimeout(() => {
        removeLecture(lid);
        removeFile(stored);
        if (audioUri && audioUri !== stored) removeFile(audioUri);
      }, 450);
    });
  }

  const min = Math.max(1, Math.round(lecture.durationMs / 60000));
  const busy = lecture.status === 'transcribing' || lecture.status === 'writing';
  const broken = lecture.status === 'error' || lecture.status === 'interrupted';
  const kicker = unit
    ? t('lecture.kickerUnit', { unit: unit.name, n: lecture.number })
    : t('lecture.kicker', { n: lecture.number });

  return (
    <Screen bottomSpace={40}>
      <Pad>
        <BackLink label={subject?.name ?? t('common.back')} />
      </Pad>
      <Pad style={{ marginTop: 22 }}>
        <Kicker>{kicker}</Kicker>
        <T weight="semibold" style={st.title}>
          {lecture.title}
        </T>
        <View style={st.chips}>
          <MiniChip label={shortDate(locale, lecture.createdAt)} />
          <MiniChip label={t('common.min', { n: min })} />
          {lecture.usedSyllabus && <MiniChip label={t('lecture.withSyllabus')} />}
        </View>
        <View style={{ marginTop: 16 }}>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { key: 'notes', label: t('lecture.notes') },
              { key: 'transcript', label: t('lecture.transcript') },
              { key: 'audio', label: t('lecture.audio') },
            ]}
          />
        </View>
      </Pad>

      <Pad style={{ marginTop: 22 }}>
        {tab === 'notes' && (
          <>
            {busy && (
              <View style={{ gap: 14 }}>
                <T weight="semibold" style={st.nh}>
                  {t('lecture.processingTitle')}
                </T>
                <ProcessingPill lecture={lecture} />
              </View>
            )}
            {broken && (
              <View style={{ gap: 12 }}>
                <T weight="semibold" style={st.nh}>
                  {t('lecture.errorTitle')}
                </T>
                {lecture.error ? <T style={st.np}>{lecture.error}</T> : null}
                <Button label={t('common.retry')} onPress={() => processLecture(lecture.id)} />
              </View>
            )}
            {lecture.notes?.map((b, i) => <Block key={i} block={b} onSeek={seek} label={t('lecture.onExam')} />)}
          </>
        )}

        {tab === 'transcript' && (
          <View style={{ gap: 14 }}>
            {!lecture.transcript?.length && <T style={st.np}>{t('lecture.noTranscript')}</T>}
            {lecture.transcript?.map((s, i) => (
              <Pressable key={i} onPress={() => seek(s.start)} style={{ flexDirection: 'row', gap: 12 }}>
                <T mono style={st.ts}>
                  {clock(s.start)}
                </T>
                <T style={[st.np, { flex: 1 }]}>{s.text}</T>
              </Pressable>
            ))}
          </View>
        )}

        {tab === 'audio' && (
          <View style={{ alignItems: 'center' }}>
            <View style={{ marginTop: 18 }}>
              <DotMatrix text={clock(status.currentTime ?? 0)} cell={7.5} radius={2.7} />
            </View>
            <Kicker style={{ marginTop: 14 }}>{clock(status.duration || lecture.durationMs / 1000)}</Kicker>
            <Scrubber
              value={status.duration ? (status.currentTime ?? 0) / status.duration : 0}
              onSeek={(p) => status.duration && player.seekTo(p * status.duration)}
            />
            <View style={st.controls}>
              <Pressable onPress={() => player.seekTo(Math.max(0, (status.currentTime ?? 0) - 15))} style={st.skip} hitSlop={10}>
                <SkipIcon back />
                <T mono style={st.skipText}>
                  15
                </T>
              </Pressable>
              <Pressable onPress={() => (status.playing ? player.pause() : play())} style={st.play}>
                {status.playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
              </Pressable>
              <Pressable onPress={() => player.seekTo((status.currentTime ?? 0) + 15)} style={st.skip} hitSlop={10}>
                <SkipIcon />
                <T mono style={st.skipText}>
                  15
                </T>
              </Pressable>
            </View>
          </View>
        )}

        <Pressable onPress={remove} style={{ alignSelf: 'center', padding: 14, marginTop: 30 }}>
          <T style={{ color: colors.mute, fontSize: 14 }}>{t('lecture.deleteLecture')}</T>
        </Pressable>
      </Pad>
    </Screen>
  );
}

function Block({ block, onSeek, label }: { block: NoteBlock; onSeek: (s: number) => void; label: string }) {
  switch (block.type) {
    case 'heading':
      return (
        <T weight="semibold" style={[st.nh, { marginTop: 8 }]}>
          {block.text}
        </T>
      );
    case 'paragraph':
      return <T style={[st.np, { marginBottom: 16 }]}>{block.text}</T>;
    case 'bullets':
      return (
        <View style={{ marginBottom: 16, gap: 6 }}>
          {block.items.map((it, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <T style={st.np}>–</T>
              <T style={[st.np, { flex: 1 }]}>{it}</T>
            </View>
          ))}
        </View>
      );
    case 'formula':
      return (
        <View style={st.formula}>
          <T mono style={{ fontSize: 13, lineHeight: 19 }}>
            {block.text}
          </T>
        </View>
      );
    case 'exam':
      return (
        <Pressable onPress={() => block.at != null && onSeek(block.at)} style={st.callout}>
          <View style={st.calloutK}>
            <T mono weight="medium" style={{ fontSize: 10.5, letterSpacing: 1, color: colors.white }}>
              {label}
            </T>
            {block.at != null && (
              <T mono style={{ fontSize: 10.5, color: '#a9a9a6' }}>
                {clock(block.at)}
              </T>
            )}
          </View>
          <T style={{ fontSize: 14.5, lineHeight: 20, color: colors.white }}>{block.text}</T>
        </Pressable>
      );
  }
}

function Scrubber({ value, onSeek }: { value: number; onSeek: (p: number) => void }) {
  const [w, setW] = useState(1);
  return (
    <Pressable
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onPress={(e) => onSeek(Math.max(0, Math.min(1, e.nativeEvent.locationX / w)))}
      style={st.track}
      hitSlop={14}
    >
      <View style={[st.trackFill, { width: `${value * 100}%` }]} />
      <View style={[st.knob, { left: `${value * 100}%` }]} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  title: { fontSize: 27, letterSpacing: -1.1, lineHeight: 30, marginTop: 8 },
  chips: { flexDirection: 'row', gap: 6, marginTop: 12 },
  nh: { fontSize: 17, letterSpacing: -0.35, marginBottom: 6 },
  np: { fontSize: 14, lineHeight: 21, color: colors.body },
  ts: { fontSize: 11, color: colors.mute, marginTop: 3 },
  formula: { backgroundColor: colors.soft, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16 },
  callout: { backgroundColor: colors.ink, borderRadius: 20, padding: 16, marginBottom: 16 },
  calloutK: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  track: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: colors.line, marginTop: 34 },
  trackFill: { height: 4, borderRadius: 2, backgroundColor: colors.ink },
  knob: { position: 'absolute', top: -6, width: 16, height: 16, marginLeft: -8, borderRadius: 8, backgroundColor: colors.ink },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 40, marginTop: 36 },
  play: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  skip: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44 },
  skipText: { position: 'absolute', fontSize: 8.5 },
});
