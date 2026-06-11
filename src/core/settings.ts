// 设置读写：storage.local 为主（含 apiKey）；非敏感字段镜像到 storage.sync 跨设备漫游
import { DEFAULT_SETTINGS, type Settings } from '../types';

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get('settings');
  if (data.settings) {
    return { ...DEFAULT_SETTINGS, ...data.settings };
  }
  // 本机无设置（新装/重装）：尝试从 sync 恢复外观与供应商偏好
  try {
    const synced = await chrome.storage.sync.get('settings');
    if (synced.settings) {
      const restored = { ...DEFAULT_SETTINGS, ...synced.settings, apiKey: '' };
      await chrome.storage.local.set({ settings: restored });
      return restored;
    }
  } catch {
    /* sync 不可用则忽略 */
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings });
  // 镜像到 sync（剔除 apiKey，安全 + 避开 sync 8KB 单项限制风险）
  try {
    const { apiKey: _omit, ...safe } = settings;
    await chrome.storage.sync.set({ settings: safe });
  } catch {
    /* 配额超限或未登录账号时忽略 */
  }
}
