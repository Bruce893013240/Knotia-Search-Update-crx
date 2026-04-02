# Knotia AI Search

**AI-powered semantic search for IFRS / IAS / ASPE accounting standards on Knotia**

Instead of scrolling through the table of contents, type a plain-language question and the extension automatically highlights the relevant standards, sections, and paragraphs.

---

## Installation · 安装方法

### English

> Chrome Web Store is not used. Install directly from the `.crx` file.

**Step 1 — Enable Developer Mode**

Open `chrome://extensions` in Chrome. Toggle **Developer mode** on (top-right corner).

**Step 2 — Install the .crx file**

Download `knotia-1.7.crx` from this page and drag it onto the `chrome://extensions` tab. Click **Add extension** when Chrome asks for confirmation.

**Step 3 — Set the keyboard shortcut** *(important)*

Open `chrome://extensions/shortcuts`, find **Knotia AI Search → Open Knotia AI Search**, click the input box and press your shortcut:

| Platform | Shortcut |
|----------|----------|
| Mac | `⌘ Shift F` |
| Windows | `Ctrl Shift F` |

Chrome does **not** set this automatically — you must do it once manually.

**Step 4 — Configure your API key**

Click the Knotia icon in the Chrome toolbar → **Settings**:

1. Choose an AI Provider (Anthropic Claude or OpenAI GPT)
2. Select a Model
3. Paste your API Key
4. Click **Save**, then **Test Connection** to verify

| Provider | Where to get a key |
|----------|--------------------|
| Anthropic (Claude) | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI (GPT) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

---

### 中文

> 本扩展不通过 Chrome 网上应用店分发，直接安装 `.crx` 文件即可。

**第一步 — 开启开发者模式**

在 Chrome 地址栏输入 `chrome://extensions`，打开右上角的 **开发者模式** 开关。

**第二步 — 安装 .crx 文件**

从本页面下载 `knotia-1.7.crx`，将文件拖拽到 `chrome://extensions` 标签页上，弹出确认框后点击 **添加扩展程序**。

**第三步 — 设置键盘快捷键** *（必须手动设置）*

打开 `chrome://extensions/shortcuts`，找到 **Knotia AI Search → 打开 Knotia AI Search**，点击输入框并按下快捷键：

| 平台 | 快捷键 |
|------|--------|
| Mac | `⌘ Shift F` |
| Windows | `Ctrl Shift F` |

Chrome 不会自动设置此快捷键，首次安装后需手动操作一次。

**第四步 — 配置 API Key**

点击 Chrome 工具栏中的 Knotia 图标 → **Settings（设置）**：

1. 选择 AI 服务商（Anthropic Claude 或 OpenAI GPT）
2. 选择模型
3. 粘贴你的 API Key
4. 点击 **Save（保存）**，再点 **Test Connection（测试连接）** 验证是否正常

| 服务商 | 获取 Key 的地址 |
|--------|----------------|
| Anthropic (Claude) | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI (GPT) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

---

## Usage · 使用方法

### English

1. Open any Knotia standards page (`knotia.ca` or via your library proxy)
2. Press `⌘ Shift F` (Mac) or `Ctrl Shift F` (Windows) to open the search bar
3. Type your question in plain English and press **Enter**

The extension works in three automatic stages:

| Stage | What happens |
|-------|-------------|
| **1 — Standards** | Relevant top-level standards in the table of contents are highlighted in amber. Click one to expand it. |
| **2 — Sections** | After expanding a standard, the AI highlights the most relevant sub-sections. Click one to open the document. |
| **3 — Paragraphs** | Once the document loads, relevant passages are highlighted in yellow. Press `Enter` / `Shift Enter` or use the ▲▼ buttons to jump between them. |

Press `Esc` or click **✕** to close the search bar.

---

### 中文

1. 打开任意 Knotia 标准页面（`knotia.ca` 或通过图书馆代理访问）
2. 按 `⌘ Shift F`（Mac）或 `Ctrl Shift F`（Windows）打开搜索栏
3. 用自然语言输入问题，按 **Enter** 开始搜索

扩展会自动执行三个阶段：

| 阶段 | 发生了什么 |
|------|-----------|
| **第一阶段 — 标准定位** | 左侧目录中相关的顶级标准被标黄。点击展开。 |
| **第二阶段 — 章节定位** | 展开标准后，AI 重新分析并高亮最相关的子章节。点击打开文档。 |
| **第三阶段 — 段落高亮** | 文档内容加载后，相关段落被高亮显示。按 `Enter` / `Shift Enter` 或点击 ▲▼ 在结果间跳转。 |

按 `Esc` 或点击 **✕** 关闭搜索栏。

---

## Troubleshooting · 常见问题

### Search bar doesn't appear · 搜索栏不出现

- Refresh the Knotia tab after installing (`⌘ R` / `Ctrl R`)
- Check `chrome://extensions/shortcuts` — the shortcut must be set manually
- As a fallback, click the Knotia icon in the Chrome toolbar

### "AI error — check Settings for a valid API key"

- Open Settings, verify your API key is saved correctly
- Click **Test Connection** to confirm the key is valid

### "TOC not found — are you on a Knotia standards page?"

- The extension only works on standards pages that have a table of contents sidebar
- Make sure you have navigated to an actual standard, not the Knotia homepage

---

## Auto-Update · 自动更新

Once installed, the extension updates silently in the background. Chrome checks for new versions roughly every 5 hours. No action is required on your part.

安装后扩展会自动静默更新，Chrome 大约每 5 小时检查一次新版本，无需任何手动操作。

---

## Privacy · 隐私

Your API key is stored locally in Chrome's extension storage and never leaves your browser except when making direct API calls to your chosen AI provider (Anthropic or OpenAI). No data is sent to any third-party servers.

API Key 仅存储在本地 Chrome 扩展存储中，只在向 AI 服务商（Anthropic 或 OpenAI）发起请求时才会离开浏览器，不会发送至任何其他服务器。

---

## Supported Sites · 支持的网站

- `*.knotia.ca/*`

> 通过大学图书馆代理访问的用户，请确保最终落在 `knotia.ca` 域名下，插件才会生效。
>
> If you access Knotia through a university proxy, the extension only activates once you are on the `knotia.ca` domain.
