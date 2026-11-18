import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type KeyName = 'anthropic_api_key' | 'openai_api_key' | 'server_token';

// secure store isn't available on web, fall back to localStorage there (dev only)
export async function getKey(name: KeyName): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(name) ?? null;
  return SecureStore.getItemAsync(name);
}

export async function setKey(name: KeyName, value: string) {
  const v = value.trim();
  if (Platform.OS === 'web') {
    if (v) globalThis.localStorage?.setItem(name, v);
    else globalThis.localStorage?.removeItem(name);
    return;
  }
  if (v) await SecureStore.setItemAsync(name, v);
  else await SecureStore.deleteItemAsync(name);
}
