import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { colors } from '../theme';
import { T } from './ui';

/** native pdf reader: scroll through pages, pinch to zoom */
export default function PdfView({ uri, onPages }: { uri: string; onPages?: (page: number, total: number) => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View style={st.center}>
        <T style={{ color: colors.mute }}>PDF</T>
      </View>
    );
  }
  return (
    <Pdf
      source={{ uri, cache: false }}
      style={st.pdf}
      trustAllCerts={false}
      spacing={10}
      fitPolicy={0}
      onPageChanged={(page, total) => onPages?.(page, total)}
      onLoadComplete={(total) => onPages?.(1, total)}
      onError={() => setFailed(true)}
    />
  );
}

const st = StyleSheet.create({
  pdf: { flex: 1, backgroundColor: colors.soft },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
