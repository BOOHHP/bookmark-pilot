# Chrome Web Store 上架材料（官方指南优化版）

依据官方文档《创建出色的商品详情页面》整理：商品详情页要准确、清晰、有吸引力；摘要突出主要使用场景，描述避免关键词堆砌；截图展示真实体验，图片素材与品牌保持一致。

官方参考：https://developer.chrome.com/docs/webstore/best-listing?hl=zh-cn

---

## 1. 基本信息

| 字段 | 推荐填写 |
|---|---|
| 名称 | BookmarkPilot 书签金字塔 |
| 类别 | 生产工具 (Productivity) |
| 语言 | 中文（简体）+ English |
| 主页 URL | https://github.com/BOOHHP/bookmark-pilot |
| 支持 URL | https://github.com/BOOHHP/bookmark-pilot/issues |
| 隐私政策 URL | https://github.com/BOOHHP/bookmark-pilot/blob/main/docs/PRIVACY.md |

## 2. 商品摘要（≤132 字符，纯文本）

官方建议：摘要应让用户快速理解产品能解决什么问题；不要写“最强”“最佳”等宽泛宣传语。

### 中文推荐

用 AI 理解并整理你的 Chrome 书签，自动生成可编辑的金字塔分类，支持撤销、健康检查和数据备份。

### English recommended

AI-powered Chrome bookmark organizer that builds editable pyramid categories, with undo, health checks and data backup.

## 3. 商品说明（详细描述）

官方建议：先用一小段概览说明用途，再列出最重要功能；保持准确、简洁、信息充分，不堆砌无关关键词。

### 中文说明

BookmarkPilot 是一款面向重度书签用户的 AI 书签整理工具。它会读取书签标题、网址和原文件夹结构，通过你自己配置的 LLM 供应商生成清晰的金字塔式分类目录，帮助你把长期积累的书签重新变得可浏览、可搜索、可维护。

核心功能：

• AI 金字塔分类：自动构建两层书签分类树，适合大量书签的快速整理  
• 结果可编辑：应用前可重命名分类、删除分类、拖拽书签调整归属  
• 一键应用与撤销：整理前自动备份；不满意可一键恢复到原位置  
• 新书签增量归类：整理后新增的书签可一键归入现有分类树  
• 书签健康检查：检测重复书签、确定死链和疑似失效页面，支持登录后重检  
• 数据导出/导入：分类结果与缓存可导出为 JSON，重装或换电脑后可恢复  
• 可视化体验：分类和死链检测过程提供清晰进度和流动背景动效  
• 多供应商支持：Agnes AI、OpenRouter、OpenAI、Claude、Gemini、DeepSeek

隐私与安全：

• 使用你自己的 API Key，书签数据仅发送给你选择的 LLM 供应商  
• 不经过开发者服务器，无统计、无跟踪、无广告  
• API Key 仅保存在本机，不会同步或上传  
• `<all_urls>` 权限为可选权限，仅在你运行死链检测或元信息增强时按需申请

适合：书签数量多、分类长期混乱、经常收藏资料但很少回头整理的人。

### English description

BookmarkPilot is an AI-powered bookmark organizer for heavy Chrome bookmark users. It reads bookmark titles, URLs and existing folder context, then uses the LLM provider you configure to build a clean pyramid-style category tree. The goal is to make accumulated bookmarks browsable, searchable and maintainable again.

Core features:

• AI pyramid classification: build a two-level bookmark category tree for large bookmark collections  
• Editable results: rename categories, delete categories and drag bookmarks before applying  
• Apply and undo safely: automatic backup before changes; one-click undo restores original positions  
• Incremental new-bookmark classification: slot newly added bookmarks into the existing tree  
• Bookmark health check: find duplicates, confirmed dead links and suspect pages; recheck after login  
• Data export / import: export classification results and cache as JSON, then restore after reinstalling or moving devices  
• Visual progress: animated progress UI for classification and dead-link checking  
• Provider support: Agnes AI, OpenRouter, OpenAI, Claude, Gemini and DeepSeek

Privacy and safety:

• Uses your own API key; bookmark data is sent only to the LLM provider you choose  
• No developer server, no analytics, no tracking and no ads  
• API keys stay on this device and are never synced or uploaded  
• `<all_urls>` is optional and requested only when you run dead-link checking or metadata enrichment

Best for users with many accumulated bookmarks who want a safer, editable way to organize them.

## 4. 权限说明（审核表单 Justification）

| 权限 | 英文理由（可复制到审核表单） |
|---|---|
| bookmarks | Core feature. The extension reads bookmark titles, URLs and folder structure to classify bookmarks, and creates folders / moves bookmarks only when the user explicitly applies the result. |
| sidePanel | The extension's primary user interface is implemented in Chrome's Side Panel. |
| storage | Persist settings, classification results, label cache, backup metadata and update-notification state locally. Non-sensitive preferences may also sync through the user's Chrome account. |
| favicon | Display bookmark site icons in the side panel list to help users identify pages visually. |
| Host permissions for LLM APIs | Call the REST API of the LLM provider explicitly selected by the user, using the user's own API key. No developer-owned server is involved. |
| optional `<all_urls>` | Requested at runtime only when the user runs dead-link checking or metadata enrichment. It is used solely to probe link status and read page title / meta description. No page content is collected, stored as raw content, or sent to the developer. |
| Remote code | None. All executable code is packaged with the extension. Network requests exchange JSON data with user-configured LLM APIs only. |

## 5. 数据使用声明（商店隐私表单）

建议选择：**不收集或使用用户数据用于开发者目的**。

可填写说明：

BookmarkPilot stores settings, classification results and cache locally in Chrome storage. Bookmark titles/domains may be sent only to the LLM provider selected by the user, using the user's own API key, solely to provide the classification feature. The developer does not collect, transmit, sell, or access user data.

## 6. 图片与视频素材清单

官方建议：截图应展示真实用户体验，清晰、最新、少文字、无失真；使用方角、无内边距、全出血。宣传图片不要只是截图，应体现品牌，简洁、饱和、可缩小后仍清晰。

### 商店图标

| 资源 | 文件 |
|---|---|
| 128x128 图标 | `icons/icon128.png` |

检查点：简单、品牌一致、小尺寸仍能识别；不要使用复杂界面截图作为图标。

### 截图（必需，至少 1 张；推荐 5 张）

尺寸：`1280x800`（推荐）或 `640x400`。  
格式：方角、无内边距、全出血；避免大量文字覆盖。

推荐顺序：

1. **AI 分类树结果**：侧边栏显示已展开的金字塔分类，体现核心价值  
2. **分类进度动效**：展示大号进度、三阶段进度点和流动背景  
3. **结果可编辑**：展示重命名、删除或拖拽调整分类的状态  
4. **健康检查**：展示重复书签、确定死链、疑似失效分组和重检按钮  
5. **设置页**：展示多供应商选择、Agnes AI 免费 API 标签、主题与数据导入导出

截图注意：

• 使用真实扩展界面，不要做与实际功能不符的营销图  
• 不要截到 API Key、私人书签标题、邮箱或账号头像等敏感信息  
• 截图中的品牌色尽量与图标、宣传图保持一致  
• 不要添加“官方推荐”“第一”“最佳”等虚假或无法证明的标识

### 可选宣传图片

| 类型 | 尺寸 | 用途 |
|---|---|
| 小宣传图块 | 440x280 | 首页、类别页、搜索结果展示 |
| 滚动图片 | 1400x560 | 若被 Chrome Web Store 选入首页轮播时使用 |

设计建议：

• 采用 BookmarkPilot 图标、深色/浅色界面色和绿色强调色  
• 少文字，突出“AI Bookmark Organizer”或“AI 书签金字塔”  
• 用简洁的金字塔分类示意 + 真实侧边栏局部图，不要堆满 UI 截图  
• 避免大量白色或浅灰背景；确保缩小到 50% 仍清楚

## 7. 发布前质量检查清单

- [ ] `npm run build` 成功
- [ ] 上传 zip 根目录含 `manifest.json`，不含外层 `dist/` 文件夹
- [ ] zip 不包含 `node_modules`、源码 map、测试数据或未使用素材
- [ ] manifest 版本号与 zip 文件名一致
- [ ] 隐私政策 URL 可公开访问
- [ ] 截图为真实最新版界面，清晰、无敏感信息
- [ ] 商品摘要 ≤132 字符，且没有夸大宣传
- [ ] 商品说明没有关键词堆砌或与功能无关的词
- [ ] 权限理由与实际代码一致，尤其是 `<all_urls>` 为 optional 且按需申请
- [ ] 数据使用声明与隐私政策一致：开发者不收集用户数据

## 8. 提交步骤

1. 打开开发者控制台：https://chrome.google.com/webstore/devconsole
2. 新建项目或进入现有项目
3. 上传 `bookmark-pilot-v0.5.0-store.zip`
4. 填写基本信息、摘要、详细说明、隐私政策 URL、支持 URL
5. 上传 `icons/icon128.png` 和截图；如有宣传图片也一并上传
6. 填写权限理由与数据使用声明
7. 建议首次发布选择可见性为“未列出”或小范围测试，确认无误后再公开
8. 提交审核

## 9. 审核可能追问的答复模板

### 为什么需要 `<all_urls>`？

`<all_urls>` is optional and requested only at runtime when the user starts dead-link checking or metadata enrichment. It is used to fetch HTTP status and page title/meta description for the user's own bookmarks. The extension does not collect raw page content, does not send it to the developer, and does not use this permission outside user-initiated checks.

### 是否收集用户数据？

No. The developer does not collect or receive user data. Bookmark titles/domains are sent only to the LLM provider explicitly configured by the user, using the user's own API key, solely to provide bookmark classification.

### 是否包含远程代码？

No. All executable code is packaged in the extension. Network calls are data requests to user-configured LLM APIs and do not load or execute remote code.
