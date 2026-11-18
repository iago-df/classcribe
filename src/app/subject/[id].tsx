import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useStore, uid } from '../../store';
import { useT } from '../../i18n';
import { colors, fonts } from '../../theme';
import { keepSyllabusFile, removeFile } from '../../lib/files';
import { confirm } from '../../lib/confirm';
import LectureRow from '../../components/LectureRow';
import { BackLink, Button, Empty, H1, Kicker, Pad, Row, Screen, Segmented, Sheet, SmallPill, T } from '../../components/ui';
import type { Lecture, SyllabusFile, Unit } from '../../types';

export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const subject = useStore((s) => s.subjects.find((x) => x.id === id));
  const lectures = useStore((s) => s.lectures).filter((l) => l.subjectId === id);
  const files = useStore((s) => s.files).filter((f) => f.subjectId === id);
  const units = useStore((s) => s.units).filter((u) => u.subjectId === id);
  const { addFile, updateFile, removeFile: dropFile, updateSubject, removeSubject, addUnit, renameUnit, removeUnit, moveLectures, removeLecture } =
    useStore.getState();

  const [tab, setTab] = useState<'lectures' | 'syllabus'>('lectures');
  const [fileMenu, setFileMenu] = useState<SyllabusFile | null>(null);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  // units: the name being typed for a new / renamed unit, the unit whose menu is open, the lecture being moved
  const [unitName, setUnitName] = useState<string | null>(null);
  const [unitMenu, setUnitMenu] = useState<Unit | null>(null);
  const [moving, setMoving] = useState<Lecture | null>(null);

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

  // the student's units in the order they made them, then whatever has no unit
  const loose = lectures.filter((l) => !l.unitId || !units.some((u) => u.id === l.unitId));
  const saveUnit = () => {
    if (!unitName?.trim()) return;
    if (unitMenu) renameUnit(unitMenu.id, unitName);
    else addUnit(subject!.id, unitName);
    setUnitName(null);
    setUnitMenu(null);
  };

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
          {lectures.length === 0 && units.length === 0 && <Empty title={t('subjects.noLectures')} />}
          {units.map((u) => {
            const own = lectures.filter((l) => l.unitId === u.id);
            return (
              <View key={u.id} style={st.unit}>
                <View style={st.unitHead}>
                  <View style={{ flex: 1 }}>
                    <T weight="semibold" style={st.unitName}>
                      {u.name}
                    </T>
                    <Kicker style={{ marginTop: 2 }}>{own.length === 1 ? t('subjects.lecture1') : t('units.count', { n: own.length })}</Kicker>
                  </View>
                  <Pressable hitSlop={10} onPress={() => setUnitMenu(u)} style={st.unitMore}>
                    <T weight="semibold" style={{ fontSize: 14, marginTop: -5 }}>
                      ···
                    </T>
                  </Pressable>
                </View>
                {own.map((l) => (
                  <LectureRow key={l.id} lecture={l} onLongPress={() => setMoving(l)} />
                ))}
              </View>
            );
          })}
          {loose.length > 0 && (
            <View style={st.unit}>
              {units.length > 0 && (
                <T weight="semibold" style={[st.unitName, { color: colors.mute, marginBottom: 4 }]}>
                  {t('units.none')}
                </T>
              )}
              {loose.map((l) => (
                <LectureRow key={l.id} lecture={l} onLongPress={() => setMoving(l)} />
              ))}
            </View>
          )}
          <Pressable onPress={() => setUnitName('')} style={st.addUnit}>
            <T weight="medium" style={{ fontSize: 14, color: colors.mute }}>
              + {t('units.add')}
            </T>
          </Pressable>
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

      {/* new unit / rename unit */}
      <Sheet
        visible={unitName !== null}
        onClose={() => {
          setUnitName(null);
          setUnitMenu(null);
        }}
      >
        <T weight="semibold" style={st.sheetTitle}>
          {unitMenu ? t('units.rename') : t('units.add')}
        </T>
        <TextInput
          value={unitName ?? ''}
          onChangeText={setUnitName}
          onSubmitEditing={saveUnit}
          autoFocus
          placeholder={t('units.placeholder')}
          placeholderTextColor={colors.faint}
          style={st.input}
        />
        <Button label={t('common.save')} onPress={saveUnit} disabled={!unitName?.trim()} style={{ marginTop: 14 }} />
      </Sheet>

      {/* unit menu */}
      <Sheet visible={!!unitMenu && unitName === null} onClose={() => setUnitMenu(null)}>
        <T weight="semibold" style={st.sheetTitle}>
          {unitMenu?.name}
        </T>
        <Button label={t('units.rename')} variant="light" onPress={() => setUnitName(unitMenu?.name ?? '')} />
        <Button
          label={t('units.remove')}
          variant="ghost"
          style={{ marginTop: 6 }}
          onPress={() =>
            unitMenu &&
            confirm(
              t('units.remove'),
              t('units.removeMsg'),
              () => {
                removeUnit(unitMenu.id);
                setUnitMenu(null);
              },
              t('common.delete'),
            )
          }
        />
      </Sheet>

      {/* move a lecture to another unit */}
      <Sheet visible={!!moving} onClose={() => setMoving(null)}>
        <T weight="semibold" numberOfLines={1} style={st.sheetTitle}>
          {moving?.title}
        </T>
        <Kicker style={{ marginBottom: 8, marginLeft: 2 }}>{t('units.moveTo')}</Kicker>
        {[...units.map((u) => ({ id: u.id as string | null, name: u.name })), { id: null, name: t('units.none') }].map((u) => (
          <Row
            key={u.id ?? 'none'}
            label={u.name}
            selected={(moving?.unitId ?? null) === u.id}
            onPress={() => {
              if (moving) moveLectures([moving.id], u.id);
              setMoving(null);
            }}
          />
        ))}
        <Button
          label={t('lecture.deleteLecture')}
          variant="ghost"
          style={{ marginTop: 8 }}
          onPress={() =>
            moving &&
            confirm(t('lecture.deleteLecture'), t('lecture.deleteLectureMsg'), () => {
              removeFile(moving.audioUri);
              removeLecture(moving.id);
              setMoving(null);
            })
          }
        />
      </Sheet>

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
  unit: { marginTop: 22 },
  unitHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6 },
  unitName: { fontSize: 17, letterSpacing: -0.4 },
  unitMore: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  addUnit: { alignSelf: 'flex-start', marginTop: 22, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d0d0cd' },
  sheetTitle: { fontSize: 22, letterSpacing: -0.7, marginBottom: 14 },
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
