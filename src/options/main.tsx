import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_SETTINGS, FONT_OPTIONS, PROVIDERS, fontCss, getProvider, type Settings } from '../types';
import { loadSettings, saveSettings } from '../core/settings';
import { testConnection, listModels } from '../core/llm';
import { clearCache } from '../core/cache';
import { applyColorMode, t } from '../core/i18n';
import './styles.css';

const PRESET_COLORS = ['#7c9a72', '#3370ff', '#9a72c9', '#c97272', '#c9a052', '#52a8a0'];

type Tab = 'api' | 'appearance';

function OptionsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [tab, setTab] = useState<Tab>('api');
  const [status, setStatus] = useState('');
  const [testing, setTesting] = useState(false);
  const [liveModels, setLiveModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const d = t(settings.language);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  // 主题色实时作用于设置页自身
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', settings.themeColor);
  }, [settings.themeColor]);

  // 颜色模式：system 时跟随系统变化
  useEffect(() => {
    applyColorMode(settings.colorMode);
    if (settings.colorMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyColorMode('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.colorMode]);

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  /** 外观设置：变更后立即持久化，侧边栏通过 storage.onChanged 实时同源切换 */
  const updateAppearance = (patch: Partial<Settings>) =>
    setSettings((s) => {
      const next = { ...s, ...patch };
      void saveSettings(next);
      return next;
    });

  const save = async () => {
    await saveSettings(settings);
    setStatus(d.statusSaved);
    setTimeout(() => setStatus(''), 2000);
  };

  const test = async () => {
    setTesting(true);
    setStatus(d.statusTesting);
    try {
      await saveSettings(settings);
      await testConnection(settings);
      setStatus(d.statusConnOk);
    } catch (e) {
      setStatus(`${d.statusConnFail}: ${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  };

  const resetCache = async () => {
    await clearCache();
    setStatus(d.statusCacheCleared);
  };

  const fetchModels = async () => {
    setFetchingModels(true);
    setStatus(d.fetchingModels);
    try {
      const models = await listModels(settings);
      setLiveModels(models);
      setStatus(d.fetchModelsOk(models.length));
    } catch (e) {
      setStatus(`${d.fetchModelsFail}: ${(e as Error).message}`);
    } finally {
      setFetchingModels(false);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <div className="logo">B↑</div>
        <h1>BookmarkPilot</h1>
        <span className="sub">{d.optionsSub}</span>
      </div>
      <div className="body">
        <nav className="sidebar">
          <button className={`nav-item ${tab === 'api' ? 'active' : ''}`} onClick={() => setTab('api')}>
            {d.navApi}
          </button>
          <button
            className={`nav-item ${tab === 'appearance' ? 'active' : ''}`}
            onClick={() => setTab('appearance')}
          >
            {d.navAppearance}
          </button>
        </nav>

        <main className="content">
          {tab === 'api' ? (
            <>
              <h2>{d.apiTitle}</h2>
              <p className="desc">{d.apiDesc}</p>

              <div className="section-label">{d.sectionProvider}</div>
              <div className="card">
                <h3>{d.providerTitle}</h3>
                <p className="hint">{d.providerHint}</p>
                <div className="pills">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      className={`pill ${settings.provider === p.id ? 'active' : ''}`}
                      onClick={() =>
                        update({ provider: p.id, baseUrl: p.baseUrl, model: p.defaultModel })
                      }
                      onClickCapture={() => setLiveModels([])}
                    >
                      {p.label}{p.id === 'agnes' && <span className="pill-badge">{d.freeBadge}</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="section-label">{d.sectionConnection}</div>
              <div className="card">
                <h3>{d.apiKeyTitle}</h3>
                <p className="hint">{d.apiKeyHint}</p>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => update({ apiKey: e.target.value.trim() })}
                  placeholder="sk-..."
                />
                <p className="key-links">
                  <a href={getProvider(settings.provider).keyUrl} target="_blank" rel="noreferrer">
                    {d.getApiKey}
                  </a>
                  {' · '}
                  <a href={getProvider(settings.provider).homeUrl} target="_blank" rel="noreferrer">
                    {d.visitHome}
                  </a>
                </p>
                <label className="field">{d.apiUrl}</label>
                <input
                  type="text"
                  value={settings.baseUrl}
                  onChange={(e) => update({ baseUrl: e.target.value.trim() })}
                />
                <label className="field">{d.model}</label>
                {(() => {
                  const models = liveModels.length
                    ? liveModels
                    : getProvider(settings.provider).models;
                  const isPreset = models.includes(settings.model);
                  return (
                    <>
                      <div className="row" style={{ flexWrap: 'nowrap' }}>
                        <select
                          style={{ flex: 1 }}
                          value={isPreset ? settings.model : '__custom__'}
                          onChange={(e) =>
                            update({ model: e.target.value === '__custom__' ? '' : e.target.value })
                          }
                        >
                          {models.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                          <option value="__custom__">{d.customModel}</option>
                        </select>
                        <button
                          className="btn"
                          onClick={fetchModels}
                          disabled={fetchingModels || !settings.apiKey}
                          title={d.fetchModels}
                        >
                          {fetchingModels ? d.fetchingModels : d.fetchModels}
                        </button>
                      </div>
                      {!isPreset && (
                        <input
                          type="text"
                          style={{ marginTop: 8 }}
                          value={settings.model}
                          autoFocus
                          placeholder={d.customModelPlaceholder}
                          onChange={(e) => update({ model: e.target.value.trim() })}
                        />
                      )}
                    </>
                  );
                })()}
                <p className="hint" style={{ marginTop: 6 }}>{d.modelHint}</p>
              </div>

              <div className="section-label">{d.sectionData}</div>
              <div className="card">
                <h3>{d.cacheTitle}</h3>
                <p className="hint">{d.cacheHint}</p>
                <button className="btn" onClick={resetCache}>{d.clearCache}</button>
              </div>

              <div className="actions">
                <button className="btn primary" onClick={save}>{d.save}</button>
                <button className="btn" onClick={test} disabled={testing || !settings.apiKey}>
                  {d.testConn}
                </button>
              </div>
              <div className="status">{status}</div>
            </>
          ) : (
            <>
              <h2>{d.appearanceTitle}</h2>
              <p className="desc">{d.appearanceDesc}</p>

              <div className="section-label">{d.sectionLanguage}</div>
              <div className="card">
                <h3>{d.languageTitle}</h3>
                <p className="hint">{d.languageHint}</p>
                <div className="pills">
                  {(
                    [
                      ['auto', d.langAuto],
                      ['zh', '简体中文'],
                      ['en', 'English'],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      className={`pill ${settings.language === v ? 'active' : ''}`}
                      onClick={() => updateAppearance({ language: v })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="section-label">{d.sectionColorMode}</div>
              <div className="card">
                <h3>{d.colorModeTitle}</h3>
                <div className="pills">
                  {(
                    [
                      ['system', d.modeSystem],
                      ['light', d.modeLight],
                      ['dark', d.modeDark],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      className={`pill ${settings.colorMode === v ? 'active' : ''}`}
                      onClick={() => updateAppearance({ colorMode: v })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="section-label">{d.sectionText}</div>
              <div className="card">
                <h3>{d.fontTitle}</h3>
                <p className="hint">{d.fontHint}</p>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => updateAppearance({ fontFamily: e.target.value })}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>

                <label className="field">{d.fontSize(settings.fontSize)}</label>
                <div className="row">
                  <input
                    type="range"
                    min={12}
                    max={20}
                    step={1}
                    value={settings.fontSize}
                    onChange={(e) => updateAppearance({ fontSize: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="section-label">{d.sectionColor}</div>
              <div className="card">
                <h3>{d.themeTitle}</h3>
                <p className="hint">{d.themeHint}</p>
                <div className="swatches">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`swatch ${settings.themeColor === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      title={c}
                      onClick={() => updateAppearance({ themeColor: c })}
                    />
                  ))}
                  <input
                    type="color"
                    value={settings.themeColor}
                    onChange={(e) => updateAppearance({ themeColor: e.target.value })}
                    title={d.customColor}
                  />
                </div>
              </div>

              <div className="section-label">{d.sectionPreview}</div>
              <div
                className="preview"
                style={{ fontFamily: fontCss(settings.fontFamily), fontSize: settings.fontSize }}
              >
                <div className="pv-folder">📂 前端开发 <span className="pv-accent">12</span></div>
                <div className="pv-item">🔖 MDN Web Docs — Web 开发权威文档</div>
                <div className="pv-item pv-accent">🔖 React 官方文档（悬停高亮效果）</div>
              </div>

              <div className="actions">
                <button className="btn primary" onClick={save}>{d.save}</button>
              </div>
              <div className="status">{status}</div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<OptionsPage />);
