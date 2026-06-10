// 设置读写
import { DEFAULT_SETTINGS, type Settings } from '../types';

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings });
}
