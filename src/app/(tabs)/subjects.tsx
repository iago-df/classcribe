import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { colors, fonts } from '../../theme';
import { GearIcon, PlusIcon } from '../../components/icons';
import { Button, Empty, H1, Kicker, Pad, Screen, Sheet, T } from '../../components/ui';

export default function SubjectsScreen() {
  const { t } = useT();
  const subjects = useStore((s) => s.subjects);
  const lectures = useStore((s) => s.lectures);
  const addSubject = useStore((s) => s.addSubject);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const create = () => {
    if (!name.trim()) return;
    const s = addSubject(name);
    setName('');
    setAdding(false);
    router.push(`/subject/${s.id}`);
  };

  return (
    <Screen>
      <Pad style={st.head}>
        <View>
          <Kicker>{t('subjects.count', { n: subjects.length })}</Kicker>
          <H1>{t('subjects.title')}</H1>
        </View>
        <Pressable accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={st.gear} hitSlop={8}>
          <GearIcon />
        </Pressable>
      </Pad>

      {subjects.length === 0 ? (
        <Empty title={t('subjects.empty')} hint={t('subjects.emptyHint')}>
          <Button label={t('subjects.createSchedule')} onPress={() => router.push('/agenda')} style={{ alignSelf: 'stretch', marginTop: 12 }} />
          <Pressable onPress={() => setAdding(true)} style={{ padding: 12 }}>
            <T style={{ color: colors.mute }}>{t('subjects.add')}</T>
          </Pressable>
        </Empty>
      ) : (
        <View style={st.grid}>
          {subjects.map((s) => {
            const own = lectures.filter((l) => l.subjectId === s.id);
            const fresh = own.some((l) => l.status === 'ready' && !l.seen);
            const n = own.length;
            return (
              <Pressable
                key={s.id}
                onPress={() => router.push(`/subject/${s.id}`)}
                style={({ pressed }) => [st.card, fresh && st.cardDark, pressed && { opacity: 0.85 }]}
              >
                <View style={st.top}>
                  <T mono style={[st.topText, fresh && { color: '#8d8d8a' }]}>
                    {s.abbr}
                  </T>
                  <T mono style={[st.topText, fresh && { color: colors.white }]}>
                    {fresh ? t('subjects.isNew') : '→'}
                  </T>
                </View>
                <View>
                  <T weight="semibold" numberOfLines={2} style={[st.name, fresh && { color: colors.white }]}>
                    {s.name}
                  </T>
                  <T style={[st.sub, fresh && { color: '#9c9c99' }]}>
                    {n === 1 ? t('subjects.lecture1') : t('subjects.lectures', { n })}
                  </T>
                </View>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setAdding(true)} style={({ pressed }) => [st.card, st.add, pressed && { opacity: 0.7 }]}>
            <PlusIcon color={colors.mute} />
            <T style={{ color: colors.mute, fontSize: 13, marginTop: 8 }}>{t('subjects.add')}</T>
          </Pressable>
        </View>
      )}

      <Sheet visible={adding} onClose={() => setAdding(false)}>
        <T weight="semibold" style={{ fontSize: 22, letterSpacing: -0.7 }}>
          {t('subjects.add')}
        </T>
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          onSubmitEditing={create}
          placeholder={t('block.newSubject')}
          placeholderTextColor={colors.faint}
          style={st.input}
        />
        <Button label={t('common.save')} onPress={create} disabled={!name.trim()} style={{ marginTop: 16 }} />
      </Sheet>
    </Screen>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  gear: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, paddingHorizontal: 22, marginTop: 24 },
  card: {
    width: '48.2%',
    height: 156,
    borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardDark: { backgroundColor: colors.ink, borderColor: colors.ink },
  add: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: '#d0d0cd', alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  topText: { fontSize: 11, letterSpacing: 0.7, color: colors.mute },
  name: { fontSize: 19, letterSpacing: -0.6 },
  sub: { fontSize: 12, color: colors.mute, marginTop: 3 },
  input: {
    marginTop: 18,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.soft,
    paddingHorizontal: 18,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.ink,
  },
});
