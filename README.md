<div align="center">

<img src="icons/icon128.png" alt="BookmarkPilot" width="96" />

# BookmarkPilot

**LLM-powered Chrome extension that understands your bookmarks and organizes them into a pyramid hierarchy — in one click.**

[简体中文](README.zh-CN.md) · English

[![Release](https://img.shields.io/github/v/release/BOOHHP/bookmark-pilot)](https://github.com/BOOHHP/bookmark-pilot/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](#license)

</div>

---

## ✨ Features

- 🧠 **AI Pyramid Classification** — LLM reads each bookmark's title, domain and folder context, then builds a clean two-level category tree (Map-Reduce: label → build tree → assign)
- ✏️ **Fully Editable Results** — double-click to rename folders, delete categories, drag & drop bookmarks between categories before applying
- ↩️ **One-Click Undo** — every apply records original positions; undo restores everything and removes the AI folder
- 🔔 **Auto-Categorize New Bookmarks** — after organizing, new bookmarks get a badge + banner; one click slots them into the existing tree incrementally
- 🩺 **Bookmark Health Check** — find duplicates (local, free) and dead links (optional permission), batch clean-up
- ⚡ **Trial Mode & Cost Estimate** — try the first 20 bookmarks in seconds; see expected API request count before a full run
- 🔍 **Smart Search** — match title, URL, AI summary and AI tags
- 🎨 **Themeable UI** — dark / light / system mode, custom accent color, fonts; whole UI derives from one accent color
- 🌐 **i18n** — Chinese & English, auto-detected from browser
- 💾 **Safety First** — automatic backup (exportable as standard Netscape HTML) before any change; URL-level label cache to avoid re-spending API quota

## 🤖 Supported Providers

| Provider | Protocol | Note |
|---|---|---|
| Agnes AI | OpenAI-compatible | **Free API** |
| OpenRouter | OpenAI-compatible | |
| OpenAI | OpenAI | |
| Claude (Anthropic) | Anthropic Messages | |
| Gemini (Google) | Gemini generateContent | |
| DeepSeek | OpenAI-compatible | |

Live model-list fetching is supported for all providers. API keys are stored in `chrome.storage.local` only — never synced or uploaded.

## 📦 Install

1. Download the latest `bookmark-pilot-vX.Y.Z.zip` from [Releases](https://github.com/BOOHHP/bookmark-pilot/releases)
2. Unzip it to a folder
3. Open Chrome → `chrome://extensions` → enable **Developer mode**
4. Click **Load unpacked** and select the unzipped folder
5. Click the toolbar icon to open the side panel — the onboarding wizard takes it from there

## 🚀 Quick Start

1. Pick a provider (Agnes AI is free) and paste your API key
2. Click **⚡ Try first 20** to preview, or **Classify all**
3. Review the tree — rename / delete / drag to adjust
4. Click **Apply to bookmarks** — a `✨ AI Organized` folder appears in your bookmarks bar
5. Not happy? **↩️ Undo organize** puts everything back

## 🛠️ Development

```bash
npm install
npm run build    # outputs to dist/
npm run dev      # watch mode
```

Tech stack: Vite 5 + React 18 + TypeScript, Chrome Manifest V3 (Side Panel API).

```
src/
├── background/     # service worker: side panel behavior, new-bookmark badge
├── core/           # llm.ts (3 API protocols) · classifier.ts (Map-Reduce)
│                   # bookmarks.ts (apply/undo/backup) · health.ts · treeEdit.ts
│                   # cache.ts · settings.ts · i18n.ts
├── sidepanel/      # App / Tree / HealthPanel / Onboarding
└── options/        # settings page (API + appearance)
```

## 🔒 Privacy

- Bookmark titles/domains are sent **only** to the LLM provider you configure
- No analytics, no tracking, no third-party servers
- Dead-link checking requests `<all_urls>` **optionally and on demand**, used solely for HTTP status probes

## License

MIT
