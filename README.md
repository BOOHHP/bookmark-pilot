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
- 🔃 **Live Sync** — removing or editing a bookmark in the browser instantly updates the side panel tree and folder counts
- 🩺 **Bookmark Health Check** — find duplicates (local, free) and broken links with two-tier detection: protocol-level dead links (404/410/unreachable) and content-level "possibly broken" pages (soft 404, login wall, redirects to homepage). Probes carry your login state, and each suspect has a one-click re-check to clear false positives after signing in
- ⚡ **Trial Mode & Cost Estimate** — try the first 20 bookmarks in seconds; see expected API request count before a full run; onboarding can be skipped entirely
- ✨ **Animated Progress** — 3-step indicator, large percentage display, shimmering progress bar and flowing background while classifying
- 🔍 **Smart Search** — match title, URL, AI summary and AI tags
- 📤 **Export / Import** — back up classification result, label cache and settings (no API key) as JSON; restore after reinstalling or on another computer without re-spending API quota
- 🏷️ **Meta Enrichment** — bookmarks with meaningless titles ("Untitled", bare domains) get their page title/description fetched for better classification (optional permission)
- 🧩 **Structure-Preserving Re-classify** — re-classifying keeps your manually renamed/adjusted categories as constraints instead of starting from scratch
- ☁️ **Settings Roaming** — appearance & provider preferences sync across devices via Chrome account (API key never syncs)
- 🎁 **What's New Dialog** — after Chrome auto-updates the extension, the next side panel open shows a concise changelog (accumulates across skipped versions, shown once)
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
├── background/     # service worker: side panel behavior, new-bookmark badge, link probes
├── core/           # llm.ts (3 API protocols) · classifier.ts (Map-Reduce)
│                   # bookmarks.ts (apply/undo/backup) · health.ts · probe.ts · treeEdit.ts
│                   # cache.ts · settings.ts · i18n.ts
├── sidepanel/      # App / Tree / HealthPanel / Onboarding
└── options/        # settings page (API + appearance)
```

## 🔒 Privacy

- Bookmark titles/domains are sent **only** to the LLM provider you configure
- No analytics, no tracking, no third-party servers
- Dead-link checking requests `<all_urls>` **optionally and on demand**; probes run in the background service worker and are used solely to check link status

## 💖 Support the Developer

BookmarkPilot is my first Chrome extension — free, open source, and built in my spare time. If it helps you tame your bookmarks, you can support its development with a small donation:

- **Donate via PayPal**: the extension's Options page (❤️ Support tab) provides a donate button that opens a secure **PayPal** payment page. PayPal balance, credit cards (Visa / Mastercard) and UnionPay cards are accepted via guest checkout — no PayPal account required. Preset amounts are 0.5 / 1 / 2 / 5 / 10 in your local currency (auto-detected from your browser region, manually switchable), or enter a custom amount.
- **Users in China**: WeChat Pay / Alipay QR codes are shown on the same page.

Donations are entirely voluntary and unlock nothing extra — every feature is and will remain free. All funds go toward the continued development and maintenance of this project. Thank you! 💛

## License

MIT
