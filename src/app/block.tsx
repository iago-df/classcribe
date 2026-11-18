import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useStore, uid } from '../store';
import { useT } from '../i18n';
import { colors, fonts, shades } from '../theme';
import { hhmm } from '../lib/time';
import { Button, Kicker, SheetScreen, T, useSheetClose } from '../components/ui';
import type { Shade } from '../types';

export default function BlockEditorScreen() {
  return (
    <SheetScreen>
      <BlockEditor />
    </SheetScreen>
  );
}

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
  const subject = subjects.find((s) => s.id === subjectId);
  const [shade, setShade] = useState<Shade>(subject?.shade ?? ((subjects.length % 4) as Shade));

  const valid = (creating ? newName.trim().length > 0 : !!subjectId) && end > start;

  function save() {
    if (!valid) return;
    let sid = subjectId!;
    if (creating) sid = addSubject(newName, shade).id;
    else updateSubject(sid, { shade });
    upsertBlock({ id: existing?.id ?? uid(), subjectId: sid, day, start, end, room: room.trim() || undefined });
    close();
  }

  return (
    <View>
      <T weight="semibold" style={st.title}>
        {existing ? t('block.editTitle') : t('block.newTitle')}
      </T>

      <Kicker style={st.label}>{t('block.subject')}</Kicker>
      <View style={st.wrapRow}>
        {subjects.map((s) => {
          const on = !creating && s.id === subjectId;
          return (
            <Pressable
              key={s.id}
              onPress={() => {
                setCreating(false);
                setSubjectId(s.id);
                setShade(s.shade);
              }}
              style={[st.opt, on && st.optOn]}
            >
              <T weight="medium" style={{ fontSize: 14, color: on ? colors.white : colors.ink }}>
                {s.name}
              </T>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setCreating(true)} style={[st.opt, creating && st.optOn]}>
          <T weight="medium" style={{ fontSize: 14, color: creating ? colors.white : colors.ink }}>
            + {t('subjects.add')}
          </T>
        </Pressable>
      </View>
      {creating && (
        <TextInput
          value={newName}
          onChangeText={setNewName}
          autoFocus={subjects.length > 0}
          placeholder={t('block.newSubject')}
          placeholderTextColor={colors.faint}
          style={st.input}
        />
      )}

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
        <Stepper label={t('block.start')} value={start} onChange={(v) => { setStart(v); if (end <= v) setEnd(v + 50); }} />
        <Stepper label={t('block.end')} value={end} onChange={setEnd} />
      </View>

      <Kicker style={st.label}>{t('block.room')}</Kicker>
      <TextInput value={room} onChangeText={setRoom} placeholder={t('block.roomPlaceholder')} placeholderTextColor={colors.faint} style={[st.input, { marginTop: 0 }]} />

      <Kicker style={st.label}>{t('block.shade')}</Kicker>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {shades.map((sh, i) => (
          <Pressable key={i} onPress={() => setShade(i as Shade)} style={[st.swatch, { backgroundColor: sh.bg }, shade === i && st.swatchOn]} />
        ))}
      </View>

      {!valid && end <= start && <T style={{ color: colors.mute, marginTop: 18 }}>{t('block.invalid')}</T>}
      <Button label={t('common.save')} onPress={save} disabled={!valid} style={{ marginTop: 28 }} />
      {existing && (
        <Button
          label={t('block.delete')}
          variant="ghost"
          style={{ marginTop: 4 }}
          onPress={() => {
            removeBlock(existing.id);
            close();
          }}
        />
      )}
      <Button label={t('common.cancel')} variant="ghost" onPress={close} />
    </View>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const latest = useRef(value);
  latest.current = value;
  const step = (d: number) => onChange(Math.max(6 * 60, Math.min(23 * 60, latest.current + d)));
  const hold = (d: number) => {
    timer.current = setInterval(() => step(d), 110);
  };
  const release = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  return (
    <View style={{ flex: 1 }}>
      <Kicker style={st.label}>{label}</Kicker>
      <View style={st.stepper}>
        <Pressable onPress={() => step(-5)} onLongPress={() => hold(-5)} onPressOut={release} style={st.stepBtn} hitSlop={6}>
          <T weight="semibold" style={{ fontSize: 20 }}>−</T>
        </Pressable>
        <T mono weight="medium" style={{ fontSize: 20 }}>
          {hhmm(value)}
        </T>
        <Pressable onPress={() => step(5)} onLongPress={() => hold(5)} onPressOut={release} style={st.stepBtn} hitSlop={6}>
          <T weight="semibold" style={{ fontSize: 20 }}>+</T>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 24 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#d8d8d5', alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 28, letterSpacing: -1 },
  label: { marginTop: 24, marginBottom: 10 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  optOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  day: { flex: 1, height: 46, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  input: {
    marginTop: 12,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 18,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.ink,
  },
  stepper: {
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.line },
  swatchOn: { borderWidth: 3, borderColor: colors.paper, outlineWidth: 2, outlineColor: colors.ink, outlineStyle: 'solid' },
});
