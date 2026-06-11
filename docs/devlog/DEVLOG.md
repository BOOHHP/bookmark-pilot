# BookmarkPilot 开发日志

> 所有开发记录按时间倒序追加在本文件中。新条目插入到 `---` 分隔线下方。

---

## 2026-06-10 — v0.1.0 初始版本

**项目概述**：BookmarkPilot 书签金字塔 — 一款 Chrome 扩展，用 LLM 理解你的书签，按金字塔结构智能分类，一键整理书签栏。

| 字段 | 值 |
|------|----|
| 版本 | 0.1.0 |
| 构建工具 | Vite 5 + React 18 + TypeScript 5 |
| Chrome 最低版本 | 114 (Manifest V3) |
| Git Tag | `v0.1.0` (cb1be4e) |

### 完成的功能

#### 1. 核心架构

采用 **Map-Reduce 两阶段分类** 架构：

- **阶段一 (Map / 打标)**: 批量发送书签给 LLM，获取每条书签的一句话摘要 + 标签。支持 40 条/批、2 路并发、URL 哈希缓存（避免重复请求）。
- **阶段二a (Reduce / 建树)**: 统计全部标签频次，让 LLM 设计金字塔分类树（≤8 大类、≤2 层深度）。
- **阶段二b (Assign / 归类)**: 把每条书签分配到叶子分类节点，60 条/批。未匹配的归入"其他"兜底分类，空分类自动剪枝。

#### 2. 多供应商 LLM 客户端 (`src/core/llm.ts`)

支持 6 家 LLM 供应商，三种 API 协议：

| 供应商 | API 协议 | 默认模型 |
|--------|----------|----------|
| Agnes AI (免费) | OpenAI 兼容 | agnes-2.0-flash |
| OpenRouter | OpenAI 兼容 | openai/gpt-4o-mini |
| OpenAI | OpenAI 兼容 | gpt-4o-mini |
| Claude (Anthropic) | Anthropic Messages | claude-3-5-haiku-latest |
| Gemini (Google) | Gemini generateContent | gemini-2.0-flash |
| DeepSeek | OpenAI 兼容 | deepseek-chat |

关键实现细节：
- 429/5xx 指数退避重试（最多 4 次，BASE_DELAY 1500ms）
- Anthropic 协议需要 `anthropic-dangerous-direct-browser-access` 头绕过浏览器限制
- Gemini 协议需在 URL 中拼接模型名
- `extractJson()`: 容忍 ` ```json ` 包裹、前后缀文本的 JSON 提取
- `listModels()`: 各家 `/models` 接口拉取可用模型列表
- `testConnection()`: API 连通性测试

#### 3. 书签操作 (`src/core/bookmarks.ts`)

- `getFlatBookmarks()`: 递归遍历整棵书签树，拍平为 `{ id, title, url, folderPath }` 列表，过滤非 HTTP 协议
- `dedupeByUrl()`: 同 URL 去重（送 LLM 用）
- `backupBookmarks()`: 应用前自动备份到 `storage.local`
- `backupToHtml()`: 将备份导出为 Netscape HTML（可导入浏览器恢复）
- `applyToBookmarks()`: 在书签栏创建「✨ AI 整理」文件夹，按树结构建文件夹并移动书签
- `planApply()`: 统计应用计划（文件夹数 + 移动数）用于确认弹窗

#### 4. 侧边栏 UI (`src/sidepanel/`)

- **App.tsx**: 主界面，含工具栏（搜索 + 分类/取消 + 应用 + 设置）、三阶段进度条、分类树展示、备份下载、应用确认弹窗
- **Tree.tsx**: 可折叠分类树组件，favicon 图标显示，点击书签打开新标签页
- 搜索过滤：按标题/URL/摘要实时过滤，保留含命中书签的分类节点

#### 5. 设置页 (`src/options/`)

双 Tab 布局：

- **API 设置**: 供应商胶囊选择（Agnes 带"免费API"徽章）、API Key、自定义 URL/模型、在线拉取模型列表、连接测试、缓存清理
- **外观设置**: 语言（自动/中/英）、颜色模式（系统/浅/深）、字体选择（5 种）、字号滑块、主题色选择（6 预设 + 自定义取色器 + 实时预览）

#### 6. 国际化 (`src/core/i18n.ts`)

- 完整的中英双语字典，涵盖侧边栏和设置页全部文案
- `resolveLang()`: 支持 `auto`（跟随浏览器 `navigator.language`）

#### 7. 主题系统

- CSS 变量驱动：所有颜色由 `--accent` 通过 `color-mix()` 派生
- 深色/浅色两套配色，通过 `html[data-theme]` 切换
- 外观修改实时生效：设置页通过 `chrome.storage.onChanged` 同步到侧边栏
- 系统 prefers-color-scheme 变化监听

#### 8. 工程配置

- **Vite multi-entry**: sidepanel / options / background 三入口
- **Background SW**: 固定输出路径 `src/background/index.js`，与 manifest.json 对应
- **构建后处理**: 自动拷贝 manifest.json + icons 到 dist
- **TypeScript**: strict 模式、bundler moduleResolution

---

### 文件清单

```
bookmark-pilot/
├── manifest.json              # Chrome Extension Manifest V3
├── package.json               # 项目配置 (React 18 + Vite 5)
├── tsconfig.json              # TypeScript 配置
├── vite.config.ts             # Vite 构建配置（三入口 + 资源拷贝）
├── sidepanel.html             # 侧边栏入口 HTML
├── options.html               # 设置页入口 HTML
├── icons/                     # 扩展图标 (16/32/48/128 + SVG)
└── src/
    ├── types.ts               # 全局类型定义 + 供应商预设 + 设置接口
    ├── background/
    │   └── index.ts           # Service Worker（点击图标打开侧边栏）
    ├── core/
    │   ├── bookmarks.ts       # 书签读取/去重/备份/回写
    │   ├── cache.ts           # URL→标签缓存（djb2 哈希 + storage.local）
    │   ├── classifier.ts      # 两阶段 Map-Reduce 分类编排
    │   ├── i18n.ts            # 中英双语国际化
    │   ├── llm.ts             # 多供应商 LLM 客户端（OpenAI/Anthropic/Gemini）
    │   └── settings.ts        # 设置读写（storage.local）
    ├── options/
    │   ├── main.tsx           # 设置页 React 组件
    │   └── styles.css         # 设置页样式
    └── sidepanel/
        ├── App.tsx            # 主界面 React 组件
        ├── main.tsx           # 侧边栏入口
        ├── styles.css         # 侧边栏样式
        └── Tree.tsx           # 分类树组件
```

---

### 技术决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| API 协议 | 自行封装三种协议 | 不依赖外部 SDK，减小体积；扩展环境限制 node_modules |
| 分类策略 | Map-Reduce 两阶段 | 先理解再组织，比一次性分类更稳定、可缓存中间结果 |
| 缓存策略 | URL djb2 哈希 → storage.local | 简单、无依赖、同 URL 跨次分类不重复请求 |
| 并发控制 | 简单 Worker 池 (CONCURRENCY=2) | 避免 429，兼顾速度 |
| 备份机制 | JSON 存 storage + Netscape HTML 导出 | 内部恢复 + 标准格式兼容浏览器原生导入 |
| 主题方案 | CSS color-mix() 从单一 accent 色派生 | 用户只需选一个颜色，深浅色自动适配 |

---

### 已知限制 & 后续计划

- [ ] 未实现书签撤销/还原（目前只能通过 HTML 备份手动导入恢复）
- [ ] 无增量分类——每次"重新分类"会重跑全流程（已有缓存可加速打标阶段）
- [ ] 分类树不支持拖拽手动调整
- [ ] 未接入 Chrome Web Store 发布流程
- [ ] 未添加单元测试
- [ ] 大量书签 (>2000) 的性能尚未实测
