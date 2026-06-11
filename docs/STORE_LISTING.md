# Chrome Web Store 上架材料（提交表单复制用）

## 基本信息

| 字段 | 内容 |
|---|---|
| 名称 | BookmarkPilot 书签金字塔 |
| 类别 | 生产工具 (Productivity) |
| 语言 | 中文（简体）+ English |
| 隐私政策 URL | https://github.com/BOOHHP/bookmark-pilot/blob/main/docs/PRIVACY.md |
| 主页 URL | https://github.com/BOOHHP/bookmark-pilot |

## 简短描述（≤132 字符）

**中文**：
用 AI 理解你的书签，一键构建金字塔式分类目录。支持 6 家 LLM 供应商，可撤销、可编辑、含死链清理。

**English**:
AI understands your bookmarks and organizes them into a pyramid hierarchy in one click. 6 LLM providers, undoable, editable.

## 详细描述

**中文**：

🔖 BookmarkPilot 让积压多年的书签重获新生。

【核心功能】
• AI 金字塔分类 — LLM 阅读每条书签的标题与域名，自动构建清晰的两层分类目录
• 完全可控 — 应用前可重命名、删除、拖拽调整分类；应用后一键撤销，书签原路放回
• 新书签自动归类 — 整理后新增的书签一键增量归入现有分类
• 书签健康检查 — 检测重复书签与失效链接（区分确定死链与疑似失效，支持登录后重检）
• 试分类 — 先试前 20 条几秒看效果，再决定全量整理
• 数据导出/导入 — 重装、换电脑不丢失分类成果

【支持的 AI 供应商】
Agnes AI（免费）、OpenRouter、OpenAI、Claude、Gemini、DeepSeek — 使用你自己的 API Key。

【隐私承诺】
• 书签数据仅发送给你自己配置的 AI 供应商，绝不经过开发者服务器
• 无统计、无跟踪、无广告
• API Key 仅保存在本机，永不同步或上传
• 任何整理前自动备份，可导出标准 HTML 随时恢复

【其他】
深色/浅色主题、自定义主题色、中英双语界面。

**English**:

🔖 BookmarkPilot brings years of accumulated bookmarks back to life.

【Core features】
• AI pyramid classification — an LLM reads each bookmark's title & domain and builds a clean two-level category tree
• Full control — rename, delete, drag & drop categories before applying; one-click undo restores everything
• Auto-categorize new bookmarks — incrementally slot new bookmarks into the existing tree
• Bookmark health check — find duplicates and broken links (certain vs. suspect, login-aware recheck)
• Trial mode — preview with the first 20 bookmarks before a full run
• Data export / import — survive reinstall or a new computer

【Supported AI providers】
Agnes AI (free), OpenRouter, OpenAI, Claude, Gemini, DeepSeek — with your own API key.

【Privacy promise】
• Bookmark data goes only to the AI provider you configure — never through any developer server
• No analytics, no tracking, no ads
• Your API key stays on this device, never synced or uploaded
• Automatic backup before any change, exportable as standard HTML

【More】
Dark/light themes, custom accent color, Chinese & English UI.

## 权限说明（审核表单 Justification）

| 权限 | 理由（英文填写） |
|---|---|
| bookmarks | Core feature: read bookmark titles/URLs to classify them, and create folders / move bookmarks when the user applies the result. |
| sidePanel | The extension's main UI lives in Chrome's side panel. |
| storage | Persist user settings, classification results and label cache locally. |
| favicon | Display bookmark site icons in the list UI. |
| Host permissions (6 API domains) | Call the LLM provider's REST API that the user explicitly configures with their own API key. |
| `<all_urls>` (optional) | Requested at runtime only when the user runs dead-link checking or metadata enrichment; used solely to probe HTTP status / read page title & description. No content is collected or transmitted. |
| Remote code | None. All code is packaged; only JSON data is exchanged with the LLM APIs. |

## 截图要求（需手动截取，1280×800 或 640×400，至少 1 张）

建议截取 5 张：
1. 侧边栏分类树全貌（深色主题，展开几个分类）
2. 分类进行中的动效进度面板
3. 应用确认弹窗（展示变更摘要）
4. 健康检查结果（重复 + 疑似失效分组）
5. 设置页（供应商 pills + 外观设置）

## 提交步骤

1. 注册开发者账号（一次性 $5）: https://chrome.google.com/webstore/devconsole
2. 「新建项目」→ 上传 bookmark-pilot-v0.5.0-store.zip（即 dist 目录打包，本仓库 Release 同款）
3. 填写上方文案、上传截图与 128px 图标（icons/icon128.png）
4. 隐私政策 URL 填上表链接；「数据使用」声明：不收集任何用户数据
5. 提交审核（通常 1–3 个工作日）
