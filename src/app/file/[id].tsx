import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { colors } from '../../theme';
import { readText } from '../../lib/files';
import PdfView from '../../components/PdfView';
import { ShareIcon } from '../../components/icons';
import { BackLink, Kicker, T } from '../../components/ui';

/** opens a syllabus file inside the app */
export default function FileViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const file = useStore((s) => s.files.find((f) => f.id === id));
  const folder = useStore((s) => s.folders.find((f) => f.id === file?.parentId));
  const [pages, setPages] = useState<{ page: number; total: number } | null>(null);
  const [text, setText] = useState<string | null>(null);

  const kind = !file
    ? null
    : file.mimeType === 'application/pdf'
      ? 'pdf'
      : file.mimeType.startsWith('image/')
        ? 'image'
        : file.mimeType.startsWith('text/')
          ? 'text'
          : 'other';

  useEffect(() => {
    if (file && kind === 'text')
      readText(file.uri)
        .then(setText)
        .catch(() => setText(''));
  }, [file?.uri, kind]);

  if (!file) return <View style={st.screen} />;

  return (
    <View style={[st.screen, { paddingTop: insets.top + 14 }]}>
      <View style={st.head}>
        <BackLink label={folder?.name ?? t('syllabus.root')} />
        <Pressable
          accessibilityLabel={t('syllabus.share')}
          hitSlop={10}
          style={st.round}
          onPress={async () => {
            if (await Sharing.isAvailableAsync())
              await Sharing.shareAsync(file.uri, {
                mimeType: file.mimeType,
                dialogTitle: file.name,
              });
          }}
        >
          <ShareIcon size={19} color={colors.ink} />
        </Pressable>
      </View>
      <View style={st.title}>
        <Kicker>{pages ? `${pages.page} / ${pages.total}` : kind === 'image' ? t('subjects.images') : kind?.toUpperCase()}</Kicker>
        <T weight="semibold" numberOfLines={2} style={st.name}>
          {file.name}
        </T>
      </View>

      <View style={[st.body, { paddingBottom: insets.bottom }]}>
        {kind === 'pdf' && <PdfView uri={file.uri} onPages={(page, total) => setPages({ page, total })} />}
        {kind === 'image' && (
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            showsVerticalScrollIndicator={false}
          >
            <Image source={{ uri: file.uri }} resizeMode="contain" style={{ width, height: height * 0.72 }} />
          </ScrollView>
        )}
        {kind === 'text' && (
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <T mono style={{ fontSize: 13, lineHeight: 20 }}>
              {text ?? ''}
            </T>
          </ScrollView>
        )}
        {kind === 'other' && <T style={st.other}>{t('syllabus.cantShow')}</T>}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { paddingHorizontal: 24, marginTop: 16, marginBottom: 14 },
  name: { fontSize: 24, letterSpacing: -0.9, marginTop: 6 },
  body: {
    flex: 1,
    backgroundColor: colors.soft,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  other: {
    textAlign: 'center',
    color: colors.mute,
    marginTop: 60,
    paddingHorizontal: 40,
  },
});
