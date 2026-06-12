# Privacy Policy / 隐私政策

**BookmarkPilot 书签金字塔**

Last updated / 最近更新: 2026-06-11

---

## English

### What data the extension accesses

- **Bookmarks**: titles, URLs and folder structure of your Chrome bookmarks, used solely to classify and organize them.
- **Page metadata (optional)**: if you grant the optional site-access permission, the extension may fetch a page's `<title>`/`meta description` to improve classification of poorly-titled bookmarks, and probe HTTP status for dead-link checking.

### Where data goes

- Bookmark titles and domains are sent **only** to the LLM provider **you configure yourself** (Agnes AI / OpenRouter / OpenAI / Anthropic / Google Gemini / DeepSeek), using **your own API key**, for the sole purpose of classification.
- **No data is ever sent to the developer or any third-party server.** There is no analytics, telemetry, tracking or advertising of any kind.

### Local storage

- Your API key, settings, classification results and label cache are stored locally via `chrome.storage.local`.
- Non-sensitive preferences (appearance, provider choice — **never the API key**) may sync across your devices via your own Chrome account (`chrome.storage.sync`).
- Uninstalling the extension deletes all stored data.

### Permissions explained

| Permission | Why |
|---|---|
| `bookmarks` | Read & organize your bookmarks |
| `sidePanel` | Show the main UI |
| `storage` | Save settings & results locally |
| `favicon` | Show bookmark icons in the list |
| Provider API hosts | Call the LLM API you configured |
| `<all_urls>` (optional, on demand) | Dead-link checking & metadata fetch; requested only when you use those features |

### Contact

Open an issue at <https://github.com/BOOHHP/bookmark-pilot/issues>.

---

## 简体中文

### 扩展访问哪些数据

- **书签**：您 Chrome 书签的标题、网址和文件夹结构，仅用于分类与整理。
- **页面元信息（可选）**：如果您授予可选的网站访问权限，扩展可能抓取页面 `<title>`/`meta description` 以改进无意义标题书签的分类，并在死链检测时探测 HTTP 状态。

### 数据去向

- 书签标题与域名**仅**发送给**您自己配置**的 LLM 供应商（Agnes AI / OpenRouter / OpenAI / Anthropic / Google Gemini / DeepSeek），使用**您自己的 API Key**，仅用于分类。
- **任何数据都不会发送给开发者或任何第三方服务器。** 无统计、无遥测、无跟踪、无广告。

### 本地存储

- 您的 API Key、设置、分类结果和标签缓存通过 `chrome.storage.local` 保存在本机。
- 非敏感偏好（外观、供应商选择——**绝不含 API Key**）可通过您自己的 Chrome 账号跨设备同步（`chrome.storage.sync`）。
- 卸载扩展即删除全部存储数据。

### 权限说明

| 权限 | 用途 |
|---|---|
| `bookmarks` | 读取并整理您的书签 |
| `sidePanel` | 展示主界面 |
| `storage` | 本地保存设置与结果 |
| `favicon` | 在列表中显示书签图标 |
| 供应商 API 域名 | 调用您配置的 LLM API |
| `<all_urls>`（可选、按需） | 死链检测与元信息抓取；仅在您使用相应功能时申请 |

### 联系方式

请在 <https://github.com/BOOHHP/bookmark-pilot/issues> 提交 issue。
