import { useState } from 'react';
import { Alert as RNAlert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useStore, uid } from '../../store';
import { useT } from '../../i18n';
import { colors, fonts } from '../../theme';
import { keepSyllabusFile, removeFile } from '../../lib/files';
import LectureRow from '../../components/LectureRow';
import { BackLink, Button, Empty, H1, Kicker, Pad, Row, Screen, Segmented, Sheet, SmallPill, T } from '../../components/ui';
import type { SyllabusFile } from '../../types';

function confirm(title: string, msg: string, onYes: () => void, yes: string) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${msg}`)) onYes();
    return;
  }
  RNAlert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: yes, style: 'destructive', onPress: onYes }]);
}

export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const subject = useStore((s) => s.subjects.find((x) => x.id === id));
  const lectures = useStore((s) => s.lectures).filter((l) => l.subjectId === id);
  const files = useStore((s) => s.files).filter((f) => f.subjectId === id);
  const { addFile, updateFile, removeFile: dropFile, updateSubject, removeSubject } = useStore.getState();

  const [tab, setTab] = useState<'lectures' | 'syllabus'>('lectures');
  const [fileMenu, setFileMenu] = useState<SyllabusFile | null>(null);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);

  if (!subject) return <Screen>{null}</Screen>;

  async function upload() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'text/plain', 'text/markdown'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    for (const a of res.assets) {
      const fid = uid();
      const uri = await keepSyllabusFile(a.uri, fid, a.name);
      addFile({
        id: fid,
        subjectId: subject!.id,
        name: a.name.replace(/\.[^.]+$/, ''),
        uri,
        mimeType: a.mimeType ?? (a.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
        size: a.size ?? 0,
        current: false,
        createdAt: Date.now(),
      });
    }
    setTab('syllabus');
  }

  // group lectures by the unit the AI matched them to, newest unit first
  const groups = new Map<string, typeof lectures>();
  for (const l of lectures) {
    const key = l.unit ?? '';
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }

  return (
    <Screen bottomSpace={40}>
      <Pad style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackLink label={t('subjects.title')} />
        <Pressable onPress={() => setMenu(true)} hitSlop={12} style={st.more}>
          <T weight="semibold" style={{ fontSize: 16, marginTop: -6 }}>
            ···
          </T>
        </Pressable>
      </Pad>
      <Pad style={{ marginTop: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Kicker>{lectures.length === 1 ? t('subjects.lecture1') : t('subjects.lectures', { n: lectures.length })}</Kicker>
          <H1 style={{ fontSize: 30 }}>{subject.name}</H1>
        </View>
        <SmallPill label={t('subjects.upload')} onPress={upload} />
      </Pad>
      <Pad style={{ marginTop: 18 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'lectures', label: t('subjects.tabLectures') },
            { key: 'syllabus', label: `${t('subjects.tabSyllabus')}${files.length ? ` · ${files.length}` : ''}` },
          ]}
        />
      </Pad>

      {tab === 'lectures' ? (
        <Pad style={{ marginTop: 10 }}>
          {lectures.length === 0 && <Empty title={t('subjects.noLectures')} />}
          {[...groups.entries()].map(([unit, ls]) => (
            <View key={unit || 'none'} style={{ marginTop: 16 }}>
              {groups.size > 1 || unit ? <Kicker style={{ marginBottom: 2 }}>{unit || t('subjects.other')}</Kicker> : null}
              {ls.map((l) => (
                <LectureRow key={l.id} lecture={l} />
              ))}
            </View>
          ))}
        </Pad>
      ) : (
        <Pad style={{ marginTop: 14 }}>
          {files.length === 0 && (
            <Empty title={t('subjects.tabSyllabus')} hint={t('subjects.noSyllabus')}>
              <Button label={t('subjects.upload')} onPress={upload} style={{ alignSelf: 'stretch', marginTop: 12 }} />
            </Empty>
          )}
          {files.map((f) => {
            const pdf = f.mimeType === 'application/pdf';
            const img = f.mimeType.startsWith('image/');
            return (
              <Pressable key={f.id} onPress={() => setFileMenu(f)} style={({ pressed }) => [st.file, pressed && { opacity: 0.7 }]}>
                <View style={[st.ico, f.current && st.icoDark]}>
                  <View style={[st.lines, f.current && { backgroundColor: '#444' }]} />
                  <View style={[st.lines, { top: 16 }, f.current && { backgroundColor: '#444' }]} />
                  <View style={[st.lines, { top: 22 }, f.current && { backgroundColor: '#444' }]} />
                  <T mono style={{ fontSize: 9.5, color: f.current ? '#bbb' : '#666' }}>
                    {pdf ? 'PDF' : img ? 'IMG' : 'TXT'}
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T weight="medium" numberOfLines={1} style={{ fontSize: 15, letterSpacing: -0.2 }}>
                    {f.name}
                  </T>
                  <T style={{ fontSize: 12, color: colors.mute, marginTop: 2 }}>
                    {img ? t('subjects.images') : `${Math.max(1, Math.round(f.size / 1024))} KB`}
                  </T>
                </View>
                {f.current && (
                  <View style={st.badge}>
                    <T mono style={{ fontSize: 10, letterSpacing: 0.6, color: colors.white }}>
                      {t('subjects.current')}
                    </T>
                  </View>
                )}
              </Pressable>
            );
          })}
        </Pad>
      )}

      <Sheet visible={!!fileMenu} onClose={() => setFileMenu(null)}>
        <T weight="semibold" numberOfLines={1} style={{ fontSize: 20, letterSpacing: -0.6, marginBottom: 12 }}>
          {fileMenu?.name}
        </T>
        <Row
          label={fileMenu?.current ? t('subjects.unmarkCurrent') : t('subjects.markCurrent')}
          selected={fileMenu?.current}
          onPress={() => {
            if (fileMenu) updateFile(fileMenu.id, { current: !fileMenu.current });
            setFileMenu(null);
          }}
        />
        <Button
          label={t('common.delete')}
          variant="light"
          style={{ marginTop: 14 }}
          onPress={() => {
            if (fileMenu) {
              removeFile(fileMenu.uri);
              dropFile(fileMenu.id);
            }
            setFileMenu(null);
          }}
        />
      </Sheet>

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <T weight="semibold" style={{ fontSize: 22, letterSpacing: -0.7, marginBottom: 14 }}>
          {subject.name}
        </T>
        {renaming !== null ? (
          <>
            <TextInput value={renaming} onChangeText={setRenaming} autoFocus style={st.input} />
            <Button
              label={t('common.save')}
              style={{ marginTop: 14 }}
              disabled={!renaming.trim()}
              onPress={() => {
                updateSubject(subject.id, { name: renaming.trim() });
                setRenaming(null);
                setMenu(false);
              }}
            />
          </>
        ) : (
          <>
            <Button label={t('subjects.rename')} variant="light" onPress={() => setRenaming(subject.name)} />
            <Button
              label={t('subjects.deleteSubject')}
              variant="ghost"
              style={{ marginTop: 6 }}
              onPress={() =>
                confirm(
                  t('subjects.deleteSubject'),
                  t('subjects.deleteSubjectMsg'),
                  () => {
                    lectures.forEach((l) => removeFile(l.audioUri));
                    files.forEach((f) => removeFile(f.uri));
                    setMenu(false);
                    removeSubject(subject.id);
                    router.back();
                  },
                  t('common.delete'),
                )
              }
            />
          </>
        )}
      </Sheet>
    </Screen>
  );
}

const st = StyleSheet.create({
  more: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  file: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  ico: { width: 46, height: 54, borderRadius: 10, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 7 },
  icoDark: { backgroundColor: colors.ink },
  lines: { position: 'absolute', top: 10, left: 10, right: 10, height: 2, backgroundColor: '#cfcfcc' },
  badge: { backgroundColor: colors.ink, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 10 },
  input: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.soft,
    paddingHorizontal: 18,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.ink,
  },
});
