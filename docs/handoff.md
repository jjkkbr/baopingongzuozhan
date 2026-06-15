# 接力交接文档

## 当前状态

项目已经从网页 MVP 发展为本地桌面应用原型：

- 本地网页服务可运行。
- Electron 桌面版可运行并已生成安装包。
- Edge 插件可作为动态页面商品采集入口。
- AI 设置已集成到工作台页面。
- 合规审核和广告方案生成主流程可用。
- UI 已重构为桌面运营工作台样式：左侧窄导航、顶部状态栏、数据源控制、销量榜、中央商品预览、右侧产品指标和趋势图、下方创意生成/文案优化/素材洞察/投放建议（含合规审核）。
- 用户提供的正式图标已接入前端、Electron 窗口和 Windows 打包配置。
- 已新增首次启动向导，以及顶部“新手向导”“导出目录”“插件目录”快捷按钮。
- 已新增批量生成/批量审核，支持多选商品、任务历史、批量报告包导出、历史方案复审、取消、重试和归档。
- 已新增视觉模型素材风险分析基础版，支持按需复核图片/视频素材风险。
- 已新增创意结果质量控制：广告方案生成后会展示质量分、等级、维度评分、发布闸门、优先处理项和改写简报。
- 已增强专业导出物：单品“导出方案”会生成 `plan.json`、`plan.md`、`review-checklist.csv` 和 `manifest.json` 交付包；批量任务会生成逐商品 JSON、`summary.json`、`batch-report.md`、`batch-summary.csv` 和 `manifest.json` 报告包。
- 已补充批量失败原因分类：失败项会显示错误分类、失败阶段和是否建议重试，报告包和 CSV 也会携带这些字段。
- 已补充批量详情筛选：可按商品/错误关键词、明细状态和错误分类过滤当前任务明细。
- 已补充归档任务恢复：归档任务在含归档/已归档列表中可点击“恢复”，回到常规任务列表。
- 已新增敏感词和品牌规则库，支持默认规则启停、自定义规则保存、导入导出、导入差异预览、版本快照回滚、品牌授权状态、品牌授权范围、平台/类目范围和审核命中展示。
- 已完成 Edge 插件识别率调优和质量报告，增强商品链接、数据属性、懒加载图片、背景图、标题、店铺、销量等识别，并展示字段完整度。
- 已新增历史销量 CSV/API 导入增强，可把授权历史字段合并到当前商品趋势图。
- 已新增授权凭证台账，可登记当前商品的后台导出、开放平台、页面截图或授权文件摘要，并在合规审核中自动匹配。
- 已将广告方案输出模块迁移到“文案优化”标签页，并在生成后自动切换到该面板。
- 已将 `AI 洞察` 合并到“素材洞察”标签页，素材分析和视觉分析结果集中展示。
- 已将合规审核迁移到“投放建议”标签页，点击审核后自动切换到该面板。
- 已将右侧主工作区改为自适应堆叠：商品预览/指标、创意工作区、批量任务按顺序紧凑排列，不再被左侧列高度撑出空白。

最新可执行文件：

- 安装包：`release/爆品广告工作台 Setup 0.1.1.exe`
- 免安装版：`release/win-unpacked/爆品广告工作台.exe`

2026-05-19 已重新运行 `npm.cmd run dist`，当前 `release/` 产物已包含最新 UI、正式图标、首次启动向导、目录快捷按钮、`127.0.0.1` 桌面加载修复和 AI Coding 专属预设。

历史说明：2026-05-20、2026-05-21 和 2026-05-23 的批量任务、视觉分析、规则库、历史销量导入和插件质量报告等源码能力曾在源码中完成，后续已通过 2026-06-10 的重新打包进入当前测试安装包。

2026-06-10 已再次运行 `npm.cmd run dist`，当前 `release/` 测试安装包已包含截至本日的规则库品牌授权范围、素材版权台账增强、批量任务限流/筛选/归档、插件质量报告、视觉风险工作包、专业导出和 README 发布安全检查说明。免安装版已做冒烟验证：`http://127.0.0.1:4173` 返回 200，页面可识别，运行数据写入 `C:\Users\123\AppData\Roaming\爆品广告工作台`，打包资源包含 `resources/edge-extension/manifest.json`。

注意：当前安装包尚未配置正式代码签名证书，Windows 安装时仍可能提示未知发布者；`release/` 是本机构建产物目录，不提交到 GitHub。

2026-06-10 已补充 `v0.1.0` 测试版发布准备并创建 GitHub Release：真实安装链路验证通过，安装器静默安装返回 `0`，已安装主程序启动后 `http://127.0.0.1:4173` 返回 200，运行数据写入用户数据目录，卸载器静默卸载返回 `0`，卸载后测试安装目录无残留文件且 4173 端口无占用。GitHub Release 草稿已写入 `docs/releases/v0.1.0.md`，线上 Release 地址为 `https://github.com/jjkkbr/baopingongzuozhan/releases/tag/v0.1.0`，附件文件名为 `baopin-workbench-setup-0.1.0.exe`。

2026-06-11 已升级 Electron 到 `42.4.0`、electron-builder 到 `26.15.2`，新增 `npm.cmd run verify` 与 GitHub Actions 自动验证，并发布 `v0.1.1` 测试版。线上 Release 地址为 `https://github.com/jjkkbr/baopingongzuozhan/releases/tag/v0.1.1`，附件文件名为 `baopin-workbench-setup-0.1.1.exe`。`npm audit --audit-level=high` 当前为 0 漏洞，`0.1.1` 安装包 SHA256 为 `E7A02E7918FF1423821618E9D97020C6EA18D93924BE151E7F5CB0992A6ACDA1`。

2026-06-15 已完成桌面安全加固：Electron 窗口内只允许工作台本地地址导航，外部链接只放行 `http/https`，默认拒绝页面权限和 `webview`，下载限定为工作台本地来源或本地 `blob:` 导出；本地 HTTP 服务已补充 CSP、`nosniff`、`no-referrer`、`X-Frame-Options: DENY` 和 `Permissions-Policy`，UI 回归脚本会检查这些安全头。

## 环境

- Windows
- Node.js >= 20
- npm 使用 `npm.cmd`，因为 PowerShell 执行策略可能阻止 `npm.ps1`
- Electron：`42.4.0`
- electron-builder：`26.15.2`

依赖安装：

```powershell
npm.cmd install
```

如 Electron 下载慢，可临时使用镜像：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm.cmd install
```

## 常用命令

网页服务：

```powershell
node src/server.js
```

桌面开发：

```powershell
npm run desktop
```

构建安装包：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm.cmd run dist
```

构建要求代码签名的安装包：

```powershell
$env:WIN_CSC_LINK="C:\path\to\certificate.pfx"
$env:WIN_CSC_KEY_PASSWORD="your_certificate_password"
npm.cmd run dist:signed
```

UI 验证：

```powershell
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

语法检查：

```powershell
node --check src\server.js
node --check public\app.js
node --check desktop\main.cjs
node --check edge-extension\popup.js
```

Edge 插件识别验证：

```powershell
node --check scripts\verify-edge-extension.mjs
node scripts\verify-edge-extension.mjs
```

## 重要上下文

### 合规边界

用户曾提出用爬取方式获取淘宝商品。当前方案已经改为：

- 用户粘贴授权文本/HTML。
- Edge 插件读取当前页面已渲染、用户有权访问的数据。
- 不做后台爬取，不绕过登录、验证码、风控、频控或反爬。

后续接力时不要把它改成未授权爬虫。

### AI Key 问题

当前大模型配置支持 OpenAI 兼容接口。页面里可以保存主模型 Base URL、模型和 Key，也可以单独保存视觉模型 Base URL、视觉模型和可选视觉 Key。

曾经失败的原因：

- Base URL：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- 模型：`qwen-plus`
- Key 尾号：`****3b30`
- 返回：`401 Incorrect API key provided`

结论：请求格式和地址能打到接口，失败是 Key 与 Base URL、账号权限或地域不匹配。需要换百炼控制台普通 API Key，或使用套餐专属 Key 对应的专属 Base URL。

已验证可用组合：

- Key：`sk-sp...3b30`
- Base URL：`https://coding.dashscope.aliyuncs.com/v1`
- 模型：`qwen3-coder-plus`

工作台已新增“阿里百炼 Coding 专属”预设，用于这类 `sk-sp` Key。

2026-05-25 已完成 AI 配置拆分：文案/Coding 继续使用主模型配置；视觉分析改用独立的 `visualBaseUrl`、`visualModel` 和可选 `visualApiKey`。视觉模型默认 `qwen-vl-plus`，下拉包含 `qwen-vl-max`、`qwen3-vl-plus`、`qwen3-vl-flash`；视觉 Key 留空时共用主 Key，但如果主 Key 是 `sk-sp` Coding Key，建议单独填写支持视觉模型的普通百炼 Key。

最近进一步定位过一次“仍然无法连接 AI”的问题：同一台机器上曾同时存在开发版 Node 服务和桌面版服务监听 `4173`，其中 `localhost`/`::1` 和 `127.0.0.1` 读到不同 AI 配置，导致看起来像保存后仍连接失败。修复方式：

- `src/server.js` 的 `startServer()` 会按实际 host 返回 URL。
- `desktop/main.cjs` 使用 `LOCAL_HOST = '127.0.0.1'`，健康检查和窗口加载都固定走 `127.0.0.1`。
- 桌面版 AI 配置在 `C:\Users\123\AppData\Roaming\爆品广告工作台\data\ai-config.local.json`，网页开发模式配置在项目内 `data/ai-config.local.json`，两者不是同一个文件。

当前已确认 `http://127.0.0.1:4173/api/ai-config/test` 使用 `sk-sp...3b30`、`https://coding.dashscope.aliyuncs.com/v1`、`qwen3-coder-plus` 返回 200。

### Electron 修复

曾出现错误：

```text
Only URLs with a scheme in: file, data, node, and electron are supported by the default ESM loader.
Received protocol 'e:'
```

修复点在 `desktop/main.cjs`：

```js
const { pathToFileURL } = require('node:url');
const { startServer } = await import(pathToFileURL(serverModulePath).href);
```

不要改回直接 `import(serverModulePath)`。

同时不要把桌面窗口加载地址改回不确定的 `localhost`。Windows 环境中 `localhost` 可能优先解析到 IPv6 `::1`，如果另一个开发服务监听在 `::`，会造成配置串线。

### 桌面安全加固

当前桌面安全策略落在 `desktop/main.cjs` 和 `src/server.js`：

- `BrowserWindow` 保持 `nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`。
- 窗口内导航只允许 `http://127.0.0.1:4173` 和兼容用的 `http://localhost:4173`；其他导航会被阻止。
- `shell.openExternal()` 只允许 `http:` 和 `https:`，不要把 `file:`、`javascript:`、`data:` 或自定义协议传给系统打开。
- 默认拒绝页面权限申请和权限检查，禁止附加 `webview`。
- 下载只允许工作台本地来源，兼容前端本地 `blob:` JSON 导出。
- 本地 HTTP 服务保留 CSP、`nosniff`、`no-referrer`、`X-Frame-Options: DENY` 和 `Permissions-Policy`；静态资源路径使用 `relative()` 校验，防止跳出 `public/`。

涉及这些策略时需运行：

```powershell
npm.cmd run verify
npm.cmd run verify:ui
```

### 数据保存位置

网页开发模式：

- 本地 AI 配置：`data/ai-config.local.json`
- 本地敏感词/品牌规则：`data/compliance-rules.local.json`
- 本地素材版权台账：`data/material-rights.local.json`
- 本地批量任务状态：`data/batch-jobs.local.json`
- 导出：`output/`

桌面版：

- 通过 `AD_WORKBENCH_USER_DATA_DIR = app.getPath('userData')`
- AI 配置和导出文件写到系统用户数据目录
- 不应写到安装目录

### 图标资源

用户提供的图标源文件已复制并生成以下资源：

- `public/assets/app-icon.png`：前端左侧品牌、顶部品牌和 favicon。
- `desktop/assets/app-icon.png`：桌面资源备份。
- `desktop/assets/icon.ico`：Electron `BrowserWindow` 运行时窗口图标。
- `build/icon.ico`：electron-builder Windows 安装包图标。
- `build/icon.png`：备用 PNG 图标。

`package.json` 已配置 `build.win.icon = "build/icon.ico"`；`desktop/main.cjs` 已配置 `icon: APP_ICON`。

### UI 改版

本轮 UI 参考用户提供的运营工作台截图完成重构，主要文件：

- `public/index.html`：改为侧边导航 + 工作台网格布局。
- `public/styles.css`：重做视觉风格、卡片、榜单、指标、趋势图和响应式布局。
- `public/app.js`：新增媒体缩略图和销量趋势图渲染。
- 销量趋势不再生成模拟曲线；只有商品数据提供 `salesTrend`、`salesHistory`、`dailySales` 或 `trend` 等真实历史字段时才绘制，否则显示“暂无历史销量数据 / 无历史”。

验证结果：

```powershell
node --check public\app.js
node --check src\server.js
node --check desktop\main.cjs
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

最近一次 UI 验证通过：商品卡 10 个，图片全部加载成功，控制台无错误，截图输出到 `output-screenshot.png`。

### 历史销量导入

已新增历史销量 CSV/API 导入增强，主要文件：

- `src/server.js`：新增 `POST /api/import/sales-history`，支持 CSV 或 JSON 历史销量合并。
- `public/app.js`：新增“导入历史销量”动作，导入后刷新商品列表和销量趋势图。
- `scripts/verify-ui.mjs`：新增历史销量合并接口回归。

当前行为：

- 支持 `salesTrend`、`salesHistory`、`dailySales`、`trend` 等行内趋势字段。
- 支持 `productId,date,sales` 这类日销量明细表，按商品聚合后写入趋势字段。
- 按 `id`、`productId`、`sku`、`title` 等授权字段匹配当前商品。
- 不会根据当前销量倒推或模拟历史曲线；没有真实历史字段时仍显示暂无历史销量数据。

### 批量任务

已完成批量生成、批量审核和任务操作，主要文件：

- `src/server.js`：新增 `POST /api/batch/jobs` 和 `GET /api/batch/jobs`，本地队列最多同时跑 2 个任务，每个任务内部最多并发处理 2 个商品；已补充单任务 50 件、排队/运行任务 6 个、待处理商品 160 件、每分钟创建 8 个任务的限流保护；`GET /api/batch/jobs` 支持 `q`/`keyword` 搜索、`status` 筛选和 `includeArchived=1` 查看归档；新增 `POST /api/batch/jobs/:id/cancel`、`POST /api/batch/jobs/:id/retry`、`POST /api/batch/jobs/:id/archive`。
- `public/index.html`：新增商品多选控制和“批量任务”面板。
- `public/app.js`：新增多选状态、批量任务创建、历史轮询、详情渲染、“复审方案”动作、取消、重试、归档按钮，以及任务搜索、状态筛选、含归档开关和队列容量提示。
- `public/styles.css`：新增批量面板、任务卡、详情列表和响应式布局。
- `.gitignore`：新增 `data/batch-jobs.local.json`，避免本机任务记录进入提交。

当前行为：

- 批量生成会执行“素材分析 -> 原创方案 -> 合规审核”，并为每个商品写出 JSON。
- 批量审核可审核当前多选商品；历史批量生成任务完成后可点击“复审方案”，对已生成方案再次审核。
- 排队/运行中任务可取消；取消会停止排队项，运行中的单项可自然结束。
- 失败或取消的任务可重试，系统会优先重试失败/取消项，没有可重试项时按原商品快照新建任务。
- 非活跃任务可归档，默认任务列表不再显示；勾选“含归档”或按 `status=archived` 可重新查看和搜索归档任务，并可恢复到常规列表。
- 任务状态保存到本机 `data/batch-jobs.local.json` 或桌面版用户数据目录。
- 导出写入 `output/batch-runs/<jobId>/`，包含逐商品 JSON、`summary.json` 结构化汇总、`batch-report.md` 可读报告、`batch-summary.csv` 表格总表和 `manifest.json` 文件清单。
- 失败项会归类为队列限制、导出写入、网络连接、AI 配置、模型权限、平台接口、输入数据、合规审核或系统异常，并标记失败阶段与是否建议重试。
- 批量详情支持商品/错误关键词、明细状态和错误分类筛选，适合大批量任务复盘。

已验证：

- 临时服务中创建 2 个商品批量审核任务，2/2 完成。
- 浏览器中全选 10 个商品后，批量审核 10/10、批量生成 10/10、历史方案复审 10/10 均完成。
- `node scripts\verify-ui.mjs http://127.0.0.1:4284` 通过。

### Edge 插件识别率

已完成第一轮调优，主要文件：

- `edge-extension/popup.js`：采集逻辑从通用 DOM 扫描改为锚点识别、容器上溯和评分筛选；优先向 `http://127.0.0.1:4173` 发送数据，失败后再回退 `localhost`。
- `scripts/verify-edge-extension.mjs`：启动临时 Edge，打开本地测试页，把插件采集函数注入页面验证。
- `scripts/fixtures/edge-extension-products.html`：本地测试页，模拟淘宝式 data-item、抖音/电商式 data-e2e、通用商品链接、京东/拼多多/小红书、1688 供货卡、快手/小店商品卡、商家后台表格行、紧凑货架卡和非商品反例。
- `.gitignore`：新增 `.edge-extension-verify-*/`，避免测试浏览器临时目录进入提交。

当前行为：

- 支持 `data-item-id`、`data-auction-id`、`data-offer-id`、`data-goods-id`、`data-product-id`、`data-commodity-id`、`data-sku-code`、`data-e2e`、`data-testid`、商品详情链接等锚点。
- 支持 `img`、`data-src`、`data-original`、`data-lazy-src`、`data-image-url`、`data-thumb`、`data-pic-url`、`srcset` 和 `background-image` 图片。
- 标题提取会优先使用 `aria-label`、`title`、`alt`、标题类节点，再回退到文本行；价格、销量、店铺会被清理，降低粘连。
- 第三轮调优已覆盖 1688、快手小店、商家后台表格行、紧凑货架卡，并抑制广告位、直播入口、优惠券组件等误识别。
- 继续只读取当前页面已渲染 DOM，不处理登录态，不后台爬取，不绕过平台限制。

插件导入到工作台后会生成识别质量报告：

- 后端在 `/api/import/extension-products` 中写入 `qualityReport`，统计候选卡片、识别商品、识别率、字段完整度、缺失字段样本和改进建议。
- 前端 `extensionQualityReport` 面板会在“读取插件数据”后展示质量报告，便于判断真实授权页面哪些字段需要补样本。
- 质量报告只评估当前页面已渲染 DOM 的识别结果，不代表可以后台访问、自动翻页或补抓隐藏字段。

已验证：

- 2026-05-29 第三轮验证：`node scripts\verify-edge-extension.mjs` 通过，fixture 识别 10/10 个商品，广告位/直播入口/优惠券未误识别，4 个商品包含真实 `salesTrend`。

- `node --check edge-extension\popup.js` 通过。
- `node --check scripts\verify-edge-extension.mjs` 通过。
- `node scripts\verify-edge-extension.mjs` 通过：识别 3/3 个测试商品，广告位未误识别。

### 文案优化区

已将原来的独立广告方案输出区改为“文案优化”标签页内的面板，主要文件：

- `public/index.html`：把 `output-panel` 移进 `ops-panel`，作为“文案优化”面板内容。
- `public/app.js`：新增 `switchOpsPanel()`，点击“文案优化”切换显示，生成广告方案后自动切到该面板。
- `public/styles.css`：补充标签页与面板样式，去掉嵌套卡片感，避免卡片套卡片。
- `scripts/verify-ui.mjs`：新增“文案优化”面板激活状态检查。

当前行为：

- 默认停留在“创意生成”，点击“文案优化”可以查看生成结果。
- 生成广告方案后会自动切到“文案优化”，便于直接查看口播、字幕和版式。
- 仍保留导出 JSON 按钮在文案优化面板中。
- 点击“素材洞察”可以查看素材结构、AI 洞察和视觉风险；分析完成后会自动切到该面板。

已验证：

- `node --check public\app.js`、`node --check scripts\verify-ui.mjs` 通过。
- `node scripts\verify-ui.mjs http://127.0.0.1:4173` 通过，并确认“文案优化”面板处于活动状态。

### 敏感词和品牌规则

已完成基础版规则库，主要文件：

- `src/server.js`：新增默认规则库、规则库读写、默认/自定义规则合并、审核命中拆分和 `GET/POST /api/compliance-rules`。
- `public/index.html`：左侧控制区新增“敏感词与品牌规则”编辑器。
- `public/app.js`：新增规则库状态、读取/保存/重置、自定义规则新增、默认规则启停、审核后展示规则命中。
- `public/styles.css`：新增规则编辑器、规则列表、命中列表样式。
- `scripts/verify-ui.mjs`：新增规则库渲染检查。
- `.gitignore`：新增 `data/compliance-rules.local.json`，避免本机规则进入提交。

当前行为：

- 默认内置 14 条敏感/广告法风险词和 8 条品牌/素材风险规则。
- 用户可禁用默认规则，也可新增自定义敏感词或品牌规则。
- 自定义规则与默认规则按标准化词条合并；同名自定义规则可覆盖默认规则。
- 合规审核会分别显示敏感词命中和品牌规则命中，`audit.flaggedTerms` 会返回词条、严重程度、替换建议、备注、类型、来源和规则 ID。

已验证：

- `node --check src\server.js`、`node --check public\app.js`、`node --check desktop\main.cjs`、`node --check scripts\verify-ui.mjs` 通过。
- 临时新增 `测试禁词` 后合规审核可命中自定义规则，随后已重置为默认规则。
- `node scripts\verify-ui.mjs http://127.0.0.1:4173` 通过：规则库状态 `生效 22`，商品卡 10 个，图片 17/17 加载成功，控制台无错误。

### 首次启动向导和目录快捷按钮

新增能力：

- 顶部“新手向导”按钮：可随时打开首次启动向导。
- 首次打开浏览器端时，如本地 `localStorage` 没有 `adWorkbenchGuideCompleted=done`，会自动弹出向导。
- 向导包含四步：配置 AI Key、安装 Edge 插件、导入授权商品、生成并审核。
- 顶部“导出目录”按钮和向导内“打开导出目录”按钮会调用 `POST /api/open/output-dir`。
- 顶部“插件目录”按钮和向导内“打开插件目录”按钮会调用 `POST /api/open/extension-dir`。

目录打开接口只允许固定目录，不接受任意路径：

- 导出目录：网页开发模式为项目 `output/`，桌面版为 `app.getPath('userData')\output`。
- 插件目录：开发模式为项目 `edge-extension/`，打包版为 `resources/edge-extension`。

打包版已验证：

- `POST /api/open/output-dir` 返回 `C:\Users\123\AppData\Roaming\爆品广告工作台\output`。
- `POST /api/open/extension-dir` 返回 `release\win-unpacked\resources\edge-extension`。
- `POST /api/ai-config/test` 返回 200，模型为 `qwen3-coder-plus`。

### 工作日志

- 2026-05-19 今日完整记录见 `docs/work-log.md`。重点包括 AI 连接修复、桌面 UI 优化、正式图标接入、销量趋势真实性修正、创意区文字错位修复、验证和重新打包结果。
- 2026-05-20 今日记录见 `docs/work-log.md`。重点包括新增 `electron-builder.config.cjs`、`dist:signed` 签名构建入口、NSIS 安装器欢迎页和安装器图标配置；并新增批量生成/批量审核基础版。
- 2026-05-21 今日记录见 `docs/work-log.md`。重点包括敏感词/品牌规则库基础版、规则库接口、前端规则编辑器、审核命中展示、Edge 插件识别率第一轮调优和验证记录。
- 2026-05-23 今日记录见 `docs/work-log.md`。重点包括历史销量 CSV/API 导入增强、批量任务取消/重试/归档、规则库版本化和平台/类目分组、插件识别质量报告、授权凭证台账。
- 2026-05-26 今日记录见 `docs/work-log.md`。重点包括视觉模型独立配置、视觉风险结果细化、创意质量控制、单品专业交付包和批量报告包导出增强。
- 2026-05-27 今日记录见 `docs/work-log.md`。重点包括素材版权台账基础版、审核匹配、专业导出证据包和 UI/API 回归验证。
- 2026-06-09 今日记录见 `docs/work-log.md`。重点包括素材版权台账增强、规则库导入差异预览、版本快照回滚和品牌词授权状态审核提示。
- 2026-06-15 今日记录见 `docs/work-log.md`。重点包括 Electron 导航/外链/权限/下载加固、本地服务安全响应头和 UI 安全头回归断言。

## 当前风险与注意事项

- `data/ai-config.local.json` 可能包含真实 Key，已加入 `.gitignore`，不要提交。
- `data/compliance-rules.local.json` 是本机规则库配置，已加入 `.gitignore`，不要提交。
- `data/compliance-audit-records.local.json` 是本机审核留痕文件，已加入 `.gitignore`，不要提交。
- `data/authorization-credentials.local.json` 是本机授权凭证台账文件，已加入 `.gitignore`，不要提交。
- `data/material-rights.local.json` 是本机素材版权台账文件，已加入 `.gitignore`，不要提交。
- `data/batch-jobs.local.json` 是本机批量任务状态文件，已加入 `.gitignore`，不要提交。
- `.edge-extension-verify-*/` 是插件验证脚本使用的临时浏览器配置目录，已加入 `.gitignore`。
- `release/`、`node_modules/`、日志和截图也已忽略。
- 构建时可能从 GitHub 下载 NSIS 或签名工具失败，重试即可；Electron 本体可用 `ELECTRON_MIRROR` 加速。
- `npm install` 可能被 PowerShell 执行策略阻止，使用 `npm.cmd install`。
- 图标已接入源码和打包配置；如后续再改 UI、图标或桌面壳，需要再次打包。
- 已新增签名构建入口，但本机尚未提供正式代码签名证书，当前安装包仍为 `NotSigned`，Windows 可能提示未知发布者。

## 建议下一步

1. 作废聊天中暴露过的阿里百炼 Key，重新生成并在工作台内保存新 Key。
2. 提供正式代码签名证书并运行 `npm.cmd run dist:signed`，减少 Windows 未知发布者提示。
3. 素材版权台账已支持附件引用、到期提醒和品牌授权范围管理；后续继续优化附件引用上传体验、到期提醒筛选和品牌授权范围差异预览。
4. 规则库后续增强：版本快照对比、回滚前差异预览和品牌授权范围模板体验。
5. 用真实授权商品页继续测试 Edge 插件识别率，并把失败样本沉淀到本地验证页和质量报告样本。
6. 批量任务后续增强：更细的失败原因、归档任务管理和批量报告筛选体验。
7. 视觉模型后续增强：已补充素材清单、视频抽帧计划、证据截图留档、模型候选和人工复核清单；后续继续优化真实视频抽帧执行、证据截图采集和模型候选排序。

## 2026-05-20 视觉模型分析素材风险
- 已新增 `POST /api/analyze-visual-risk`，可对图片和视频素材做视觉复核，返回水印、字幕、主体、场景、镜头切换、品牌 logo、画面文字、风险等级和证据。
- `POST /api/analyze-media` 继续作为文本分析主流程，视觉模型通过独立按钮按需触发，避免分析按钮变慢。
- 前端“素材洞察”区已经加入 AI 洞察、视觉分析入口和视觉风险卡片，合规审核也会引用视觉结果。
- 2026-05-25 已细化视觉分析结果：报告新增素材地址可访问性 `assetAccess`、本地预检摘要 `localPrecheck`、本地预检与视觉模型差异 `precheckComparison`、风险矩阵 `riskMatrix`、证据要求 `evidenceRequired`、复核重点 `reviewFocus` 和重拍/替换简报 `reshootBrief`。
- 2026-05-29 已继续深化视觉风险工作包：报告新增素材清单 `assetInventory`、模型候选 `modelCandidates`、风险证据卡 `riskEvidenceCards`、视频抽帧计划 `videoFramePlan`、证据截图留档 `evidenceSnapshots` 和人工复核清单 `manualReviewChecklist`。
- 前端视觉风险卡片已展示素材可访问性、素材清单、模型候选、差异提示、风险证据卡、风险矩阵、视频抽帧计划、证据截图留档、人工复核清单、证据要求和重拍简报；窄屏下会自适应单列展示。
- 验证已通过 `node --check src\server.js`、`node --check public\app.js`、`node scripts\verify-ui.mjs http://127.0.0.1:4173`。

## 2026-05-21 自定义敏感词和品牌规则
- 已新增 `GET /api/compliance-rules` 和 `POST /api/compliance-rules`。
- 规则库存储在本机 `data/compliance-rules.local.json`，用于保存禁用默认规则和自定义规则，文件已忽略。
- 前端左侧控制区已经可以编辑敏感词和品牌规则，支持默认规则启停、自定义规则新增、保存和重置。
- 合规审核已经接入规则库，命中会进入 `audit.flaggedTerms`，并在审核卡片显示“规则命中”。
- 验证已通过 `node --check src\server.js`、`node --check public\app.js`、`node --check desktop\main.cjs`、`node --check scripts\verify-ui.mjs`、`node scripts\verify-ui.mjs http://127.0.0.1:4173`。

## 2026-05-21 Edge 插件真实页面识别率调优
- 已将插件发送目标改为优先 `http://127.0.0.1:4173`，失败后回退 `localhost`。
- 已把卡片识别改为锚点识别、容器上溯和评分筛选，增强商品链接、数据属性、懒加载图片、`srcset`、背景图等场景。
- 已优化标题、店铺、价格、销量提取，减少页面文本粘连造成的标题和店铺污染。
- 已新增本地验证脚本和测试页：`node scripts\verify-edge-extension.mjs`。
- 验证已通过 `node --check edge-extension\popup.js`、`node --check scripts\verify-edge-extension.mjs`、`node scripts\verify-edge-extension.mjs`。

## 2026-05-23 Edge 插件兼容性第二轮调优
- 继续坚持插件边界：只读取当前页面已渲染 DOM，不做后台抓取、自动翻页、登录绕过、风控绕过或未授权素材下载。
- 已增强京东式、拼多多式、小红书/内容电商式商品卡兼容，新增 `data-sku`、`data-ware-id`、`data-spu-id`、`item.jd.com`、`goods.html`、`mobile.yangkeduo.com`、`/goods/` 等识别信号。
- 已增强图片和素材读取：支持更多懒加载属性、CSS 变量背景图，并输出 `mediaItems` 供工作台缩略图预览。
- 已增强价格和销量识别：支持拆分价格节点、券后价、活动价、已拼、卖出、单已售、笔成交等页面文案。
- `scripts/fixtures/edge-extension-products.html` 已扩展到 6 类授权模拟结构；`node scripts\verify-edge-extension.mjs` 通过，识别 6/6 个测试商品，并排除广告位。
- 兼容性适配报告：`docs/edge-extension-compatibility-report.md`。

## 2026-05-23 规则库导入导出和审核留痕
- 规则库新增导入/导出接口：`GET /api/compliance-rules/export`、`POST /api/compliance-rules/import`；导入支持合并和覆盖。
- 前端规则库工具栏新增“导入规则”“导出规则”，导出的 JSON 仅包含规则配置和摘要，不包含 Key、Cookie、Token 或登录态。
- 新增本机私有审核记录文件 `data/compliance-audit-records.local.json`，已加入 `.gitignore`，不要提交。
- 合规审核接口现在会返回 `record` 并写入留痕；批量审核/批量生成中的审核结果也会写入同一套记录。
- 新增 `GET /api/compliance-audits` 和 `GET /api/compliance-audits/export`，投放建议面板展示最近审核记录并可导出 JSON。
- `scripts/verify-ui.mjs` 已覆盖规则导入/导出、审核命中、审核记录生成和记录导出。

## 2026-05-23 历史销量、批量任务、规则范围和插件质量报告
- 历史销量导入：新增 `POST /api/import/sales-history` 和前端“导入历史销量”，支持授权 CSV/API JSON、行内趋势字段和日销量明细表。
- 批量任务操作：新增取消、重试、归档接口和前端按钮；归档任务默认不在任务列表显示。
- 规则库版本和范围：规则保存、导入、重置会更新版本和 `revisionHistory`；自定义规则可按平台/类目限定，审核时按商品上下文过滤。
- 插件识别质量报告：`/api/import/extension-products` 返回 `qualityReport`，前端展示识别率、字段完整度、缺失字段样本和改进建议。
- 验证已通过 `node --check src\server.js`、`node --check public\app.js`、`node --check scripts\verify-ui.mjs`、`node --check edge-extension\popup.js`、`node --check desktop\main.cjs`、`node scripts\verify-edge-extension.mjs`；临时新服务 `http://127.0.0.1:4194` 上的 `node scripts\verify-ui.mjs` 也已通过。
- 注意：如果 `4173` 上仍跑着旧服务，需要重启桌面版或 Node 服务后，新接口和新 UI 才会生效。

## 2026-06-09 规则库差异预览和版本回滚
- 新增接口：`POST /api/compliance-rules/preview-import` 和 `POST /api/compliance-rules/rollback`。
- 规则库状态新增 `snapshots`，保存、导入、重置和回滚前会自动保存最近 12 个轻量快照；快照只保存规则状态、自定义规则和默认规则禁用状态，不保存 Key、Cookie、Token、登录态或原始授权文件。
- 导入规则前前端会展示差异预览，覆盖新增、覆盖、平台/类目变化、品牌授权状态变化、品牌授权范围变化、覆盖移除和默认规则禁用变化，用户确认后才真正导入。
- 品牌规则新增 `brandAuthorizationStatus`，可标记“需复核、已授权、待复核、不可用”；同时新增 `brandScope`，只保存授权品牌、渠道、地区、活动、有效期、凭证引用等摘要，不保存原始授权文件。
- 合规审核会根据授权状态和品牌授权范围给不同提示，并在审核留痕保留授权状态、范围摘要和范围提醒。
- 前端规则库新增导入预览区、版本快照列表、回滚按钮、品牌词授权状态选择框和品牌授权范围编辑字段。
- 验证已通过 `node --check src\server.js`、`node --check public\app.js`、`node --check scripts\verify-ui.mjs` 和 `node scripts\verify-ui.mjs http://127.0.0.1:4173`。

## 2026-05-23 授权凭证台账
- 新增本机私有台账文件 `data/authorization-credentials.local.json`，已加入 `.gitignore`。
- 新增接口：`GET /api/authorization-credentials`、`POST /api/authorization-credentials`、`GET /api/authorization-credentials/export`。
- “投放建议”中新增“授权凭证”面板，可登记当前商品的商家后台导出、官方开放平台、页面截图、达人/商家授权、内部投放数据或授权文件摘要。
- 合规审核会读取台账并匹配当前商品，匹配成功时显示“已关联授权凭证”，未匹配时提示补齐凭证台账。
- 台账只保存摘要和引用，不保存截图/文件原文，不保存 Key、Cookie、Token 或登录态。

## 2026-05-27 素材版权台账
- 新增本机私有台账文件 `data/material-rights.local.json`，已加入 `.gitignore`。
- 新增接口：`GET /api/material-rights`、`POST /api/material-rights`、`GET /api/material-rights/export`。
- “投放建议”中新增“素材版权”面板，可登记当前商品的图片、视频、音乐、字体、肖像、Logo、产品拍摄等素材授权摘要。
- 合规审核会读取素材版权台账并匹配当前商品，匹配成功时显示“已关联素材版权台账”；外部素材或视觉风险需要证据但未匹配时提示补齐台账。
- 专业方案导出的证据包和 `plan.md` 会携带匹配到的素材版权摘要；台账只保存摘要和引用，不保存原始素材文件、Key、Cookie、Token 或登录态。
- 2026-06-09 已增强素材版权台账：支持附件引用、到期时间、品牌授权状态/品牌名、渠道/地域/活动范围；审核和导出会携带范围摘要，并提示过期、即将到期、待复核、有限授权、不可使用和品牌范围不匹配风险。
