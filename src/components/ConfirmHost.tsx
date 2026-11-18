import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useT } from '../i18n';
import { useConfirm, type ConfirmRequest } from '../lib/confirm';
import { colors } from '../theme';
import { TrashIcon } from './icons';
import { Sheet } from './Sheet';
import { Button, T } from './ui';

/** mounted once at the root; shows whatever confirm() asked for */
export default function ConfirmHost() {
  const { t } = useT();
  const request = useConfirm((s) => s.request);
  const set = useConfirm((s) => s.set);
  // keep the last request on screen while the sheet slides away
  const [shown, setShown] = useState<ConfirmRequest | null>(null);
  useEffect(() => {
    if (request) setShown(request);
  }, [request]);

  const close = () => set(null);

  return (
    <Sheet visible={!!request} onClose={close}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: colors.soft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <TrashIcon size={22} color={colors.ink} />
        </View>
        <T weight="semibold" style={{ fontSize: 21, letterSpacing: -0.6, textAlign: 'center' }}>
          {shown?.title}
        </T>
        <T style={{ fontSize: 14, lineHeight: 20, color: colors.mute, textAlign: 'center', marginTop: 8, paddingHorizontal: 10 }}>
          {shown?.message}
        </T>
      </View>
      <Button
        label={shown?.yesLabel ?? t('common.delete')}
        style={{ marginTop: 22 }}
        onPress={() => {
          const go = request?.onYes;
          close();
          go?.();
        }}
      />
      <Button label={t('common.cancel')} variant="ghost" onPress={close} style={{ marginTop: 4 }} />
    </Sheet>
  );
}
