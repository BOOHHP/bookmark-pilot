// 首次使用引导：侧边栏内联完成供应商选择 + API Key 配置 + 试分类
import { useState } from 'react';
import { PROVIDERS, getProvider, type Settings } from '../types';
import { saveSettings } from '../core/settings';
import type { Dict } from '../core/i18n';

interface OnboardingProps {
  d: Dict;
  settings: Settings;
  bookmarkCount: number;
  /** limit 为 undefined 表示全量 */
  onStart: (limit?: number) => void;
}

export function Onboarding({ d, settings, bookmarkCount, onStart }: OnboardingProps) {
  const [providerId, setProviderId] = useState(settings.provider);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [saving, setSaving] = useState(false);
  const provider = getProvider(providerId);

  const start = async (limit?: number) => {
    if (!apiKey.trim()) return;
    setSaving(true);
    await saveSettings({
      ...settings,
      provider: provider.id,
      apiKey: apiKey.trim(),
      baseUrl: provider.baseUrl,
      model: provider.defaultModel,
    });
    setSaving(false);
    onStart(limit);
  };

  return (
    <div className="onboarding">
      <div className="ob-hero">
        <div className="ob-logo">🔖</div>
        <h2>{d.obTitle}</h2>
        <p>{d.obDesc(bookmarkCount)}</p>
      </div>

      <div className="ob-step">
        <div className="ob-step-label">{d.obStep1}</div>
        <div className="ob-pills">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              className={`pill ${providerId === p.id ? 'active' : ''}`}
              onClick={() => setProviderId(p.id)}
            >
              {p.label}
              {p.id === 'agnes' && <span className="pill-badge">{d.freeBadge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-step">
        <div className="ob-step-label">{d.obStep2}</div>
        <input
          className="ob-key-input"
          type="password"
          placeholder={d.obKeyPlaceholder}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <a className="ob-key-link" href={provider.keyUrl} target="_blank" rel="noreferrer">
          {d.getApiKey} ↗
        </a>
      </div>

      <div className="ob-step">
        <div className="ob-step-label">{d.obStep3}</div>
        <div className="ob-actions">
          <button
            className="primary"
            disabled={!apiKey.trim() || saving}
            onClick={() => start(20)}
          >
            {d.obTryFirst20}
          </button>
          <button disabled={!apiKey.trim() || saving} onClick={() => start()}>
            {d.obClassifyAll}
          </button>
        </div>
        <p className="ob-hint">{d.obTryHint}</p>
      </div>
    </div>
  );
}
