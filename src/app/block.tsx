import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useStore, uid } from '../store';
import { useT } from '../i18n';
import { colors, fonts, shades } from '../theme';
import { hhmm } from '../lib/time';
import ClockPicker from '../components/ClockPicker';
import { confirm } from '../lib/confirm';
import { CloseIcon, TrashIcon } from '../components/icons';
import { Button, Kicker, Segmented, SheetScreen, T, useSheetClose } from '../components/ui';
import type { ClassKind, Shade, Subject } from '../types';

export default function BlockEditorScreen() {
  return (
    <SheetScreen>
      <BlockEditor />
    </SheetScreen>
  );
}

const ROW = 46; // every row has the same height so the sheet never grows

function BlockEditor() {
  const close = useSheetClose();
  const params = useLocalSearchParams<{ id?: string; day?: string; start?: string }>();
  const { t, dict } = useT();
  const subjects = useStore((s) => s.subjects);
  const existing = useStore((s) => s.blocks.find((b) => b.id === params.id));
  const { upsertBlock, removeBlock, addSubject, updateSubject } = useStore.getState();

  const initStart = existing?.start ?? Number(params.start ?? 540);
  const [subjectId, setSubjectId] = useState<string | null>(existing?.subjectId ?? subjects[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(subjects.length === 0);
  const [day, setDay] = useState(existing?.day ?? Number(params.day ?? 0));
  const [start, setStart] = useState(initStart);
  const [end, setEnd] = useState(existing?.end ?? initStart + 60);
  const [room, setRoom] = useState(existing?.room ?? '');
  const [clock, setClock] = useState<'start' | 'end' | null>(null);
  const [kind, setKind] = useState<ClassKind>(existing?.kind ?? 'theory');
  const subject = subjects.find((s) => s.id === subjectId);
  // theory and practice of the same subject can have different colours
  const shadeOf = (s: Subject | undefined, k: ClassKind): Shade =>
    s ? (k === 'practice' ? s.practiceShade ?? s.shade : s.shade) : ((subjects.length % 4) as Shade);
  const [shade, setShade] = useState<Shade>(shadeOf(subject, kind));

  const valid = (creating ? newName.trim().length > 0 : !!subjectId) && end > start;

  function save() {
    if (!valid) return;
    let sid = subjectId!;
    if (creating) sid = addSubject(newName, kind === 'theory' ? shade : undefined).id;
    updateSubject(sid, kind === 'practice' ? { practiceShade: shade } : { shade });
    upsertBlock({ id: existing?.id ?? uid(), subjectId: sid, day, start, end, room: room.trim() || undefined, kind });
    close();
  }

  return (
    <View>
      <View style={st.head}>
        <T weight="semibold" style={st.title}>
          {existing ? t('block.editTitle') : t('block.newTitle')}
        </T>
        {existing && (
          <Pressable
            accessibilityLabel={t('block.delete')}
            hitSlop={10}
            style={st.iconBtn}
            onPress={() =>
              confirm(t('block.delete'), t('block.deleteMsg'), () => {
                removeBlock(existing.id);
                close();
              })
            }
          >
            <TrashIcon size={19} color={colors.ink} />
          </Pressable>
        )}
      </View>

      <Kicker style={st.label}>{t('block.subject')}</Kicker>
      {creating ? (
        <View style={st.newRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            autoFocus={subjects.length > 0}
            placeholder={t('block.newSubject')}
            placeholderTextColor={colors.faint}
            style={[st.input, { flex: 1 }]}
          />
          {subjects.length > 0 && (
            <Pressable onPress={() => setCreating(false)} style={st.iconBtn} hitSlop={8} accessibilityLabel={t('common.cancel')}>
              <CloseIcon size={18} />
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: ROW }} contentContainerStyle={{ gap: 8 }}>
          <Pressable onPress={() => setCreating(true)} style={st.opt}>
            <T weight="medium" style={{ fontSize: 14 }}>
              + {t('subjects.add')}
            </T>
          </Pressable>
          {subjects.map((s) => {
            const on = s.id === subjectId;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  setSubjectId(s.id);
                  setShade(shadeOf(s, kind));
                }}
                style={[st.opt, on && st.optOn]}
              >
                <T weight="medium" style={{ fontSize: 14, color: on ? colors.white : colors.ink }}>
                  {s.name}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Kicker style={st.label}>{t('block.kind')}</Kicker>
      <Segmented
        value={kind}
        onChange={(k) => {
          setKind(k);
          if (!creating) setShade(shadeOf(subject, k));
        }}
        options={[
          { key: 'theory', label: t('block.theory') },
          { key: 'practice', label: t('block.practice') },
        ]}
      />

      <Kicker style={st.label}>{t('block.day')}</Kicker>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {dict.days.short.map((d, i) => (
          <Pressable key={i} onPress={() => setDay(i)} style={[st.day, day === i && st.optOn]}>
            <T mono weight="medium" style={{ fontSize: 13, color: day === i ? colors.white : colors.ink }}>
              {d}
            </T>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Kicker style={st.label}>{t('block.start')}</Kicker>
          <Pressable onPress={() => setClock('start')} style={st.time}>
            <T mono weight="medium" style={{ fontSize: 20 }}>
              {hhmm(start)}
            </T>
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <Kicker style={st.label}>{t('block.end')}</Kicker>
          <Pressable onPress={() => setClock('end')} style={[st.time, end <= start && { borderColor: colors.ink }]}>
            <T mono weight="medium" style={{ fontSize: 20 }}>
              {hhmm(end)}
            </T>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Kicker style={st.label}>{t('block.room')}</Kicker>
          <TextInput value={room} onChangeText={setRoom} placeholder={t('block.roomPlaceholder')} placeholderTextColor={colors.faint} style={st.input} />
        </View>
        <View>
          <Kicker style={st.label}>{t('block.shade')}</Kicker>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {shades.map((sh, i) => (
              <Pressable key={i} onPress={() => setShade(i as Shade)} style={[st.swatch, { backgroundColor: sh.bg }, shade === i && st.swatchOn]} />
            ))}
          </View>
        </View>
      </View>

      <Button label={t('common.save')} onPress={save} disabled={!valid} style={{ marginTop: 26 }} />
      <Pressable onPress={close} style={st.cancel}>
        <T style={{ color: colors.mute, fontSize: 14 }}>{t('common.cancel')}</T>
      </Pressable>

      <ClockPicker
        visible={clock !== null}
        title={clock === 'end' ? t('block.end') : t('block.start')}
        value={clock === 'end' ? end : start}
        onClose={() => setClock(null)}
        onDone={(v) => {
          if (clock === 'start') {
            setStart(v);
            if (end <= v) setEnd(v + 50);
          } else setEnd(v);
          setClock(null);
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 26, letterSpacing: -1 },
  label: { marginTop: 18, marginBottom: 9 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: ROW },
  opt: { height: ROW, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.soft },
  optOn: { backgroundColor: colors.ink },
  day: { flex: 1, height: ROW, borderRadius: 14, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  time: { height: 54, borderRadius: 18, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  input: { height: ROW, borderRadius: 16, backgroundColor: colors.soft, paddingHorizontal: 16, fontSize: 15, fontFamily: fonts.medium, color: colors.ink },
  swatch: { width: ROW - 8, height: ROW - 8, marginTop: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  swatchOn: { borderWidth: 3, borderColor: colors.white, outlineWidth: 2, outlineColor: colors.ink, outlineStyle: 'solid' },
  cancel: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 24 },
});
