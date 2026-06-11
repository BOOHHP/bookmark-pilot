<div align="center">

<img src="icons/icon128.png" alt="BookmarkPilot" width="96" />

# BookmarkPilot 书签金字塔

**用 LLM 理解你的书签，一键构建金字塔式分类目录的 Chrome 扩展。**

简体中文 · [English](README.md)

[![Release](https://img.shields.io/github/v/release/BOOHHP/bookmark-pilot)](https://github.com/BOOHHP/bookmark-pilot/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](#开源协议)

</div>

---

## ✨ 功能特性

- 🧠 **AI 金字塔分类** — LLM 阅读每条书签的标题、域名和原文件夹，构建清晰的两层分类树（Map-Reduce 三阶段：打标 → 建树 → 归类）
- ✏️ **分类结果可编辑** — 应用前双击重命名文件夹、删除分类、拖拽书签换分类，完全由你掌控
- ↩️ **一键撤销** — 每次应用都会记录书签原位置，撤销即原路放回并删除 AI 整理文件夹
- 🔔 **新书签自动归类** — 整理后新增的书签会有角标和横幅提示，一键增量归入现有分类树，不重建、不重复消耗 API
- 🩺 **书签健康检查** — 检测重复书签（本地零成本）；死链检测分两级：协议层确定死链（404/410/无法访问）与内容层疑似失效（软 404 / 需登录 / 跳首页）。探测携带登录状态，疑似项支持登录后一键重检自动消除误报
- ⚡ **试分类与成本预估** — 先试前 20 条几秒看效果；全量前显示预计 API 请求次数和缓存命中数
- 🔍 **智能搜索** — 匹配标题、网址、AI 摘要和 AI 标签
- 🎨 **主题定制** — 深色/浅色/跟随系统，自定义主题色和字体，整套界面由一个主题色派生
- 🌐 **中英双语** — 自动跟随浏览器语言，可手动切换
- 💾 **安全第一** — 任何改动前自动备份（可导出标准 Netscape HTML 随时恢复）；URL 级标签缓存避免重复消耗 API 额度

## 🤖 支持的模型供应商

| 供应商 | 协议 | 备注 |
|---|---|---|
| Agnes AI | OpenAI 兼容 | **免费 API** |
| OpenRouter | OpenAI 兼容 | |
| OpenAI | OpenAI | |
| Claude (Anthropic) | Anthropic Messages | |
| Gemini (Google) | Gemini generateContent | |
| DeepSeek | OpenAI 兼容 | |

所有供应商均支持在线拉取模型列表。API Key 仅保存在本机 `chrome.storage.local`，不会同步或上传。

## 📦 安装

1. 从 [Releases](https://github.com/BOOHHP/bookmark-pilot/releases) 下载最新的 `bookmark-pilot-vX.Y.Z.zip`
2. 解压到任意文件夹
3. 打开 Chrome → 地址栏输入 `chrome://extensions` → 开启右上角**开发者模式**
4. 点击**加载已解压的扩展程序**，选择解压后的文件夹
5. 点击工具栏图标打开侧边栏，按引导三步开始

## 🚀 快速上手

1. 选择供应商（Agnes AI 免费）并粘贴 API Key
2. 点击「⚡ 试分类前 20 条」预览效果，或直接「全部分类」
3. 检查分类树 — 重命名 / 删除 / 拖拽随心调整
4. 点击「应用到书签」— 书签栏会出现「✨ AI 整理」文件夹
5. 不满意？「↩️ 撤销整理」一键复原

## 🛠️ 本地开发

```bash
npm install
npm run build    # 输出到 dist/
npm run dev      # 监听模式
```

技术栈：Vite 5 + React 18 + TypeScript，Chrome Manifest V3（Side Panel API）。

```
src/
├── background/     # Service Worker：侧边栏行为、新书签角标
├── core/           # llm.ts（三种 API 协议）· classifier.ts（Map-Reduce）
│                   # bookmarks.ts（应用/撤销/备份）· health.ts · treeEdit.ts
│                   # cache.ts · settings.ts · i18n.ts
├── sidepanel/      # App / Tree / HealthPanel / Onboarding
└── options/        # 设置页（API + 外观）
```

## 🔒 隐私说明

- 书签标题/域名**仅**发送给你自己配置的 LLM 供应商
- 无统计、无跟踪、无第三方服务器
- 死链检测的 `<all_urls>` 权限为**可选、按需申请**，仅用于探测链接 HTTP 状态

## 开源协议

MIT
