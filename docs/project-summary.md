# 项目总结：爆品广告工作台

## 项目目标

爆品广告工作台是一个合规优先的本地运营工具，用来验证从授权商品数据到原创广告方案的完整闭环：

1. 获取热卖商品信息。
2. 分析商品和推广素材结构。
3. 生成原创短视频脚本、海报方案、分镜和提示词。
4. 对数据来源、素材版权、广告法风险和销量背书做合规审核。
5. 将方案导出为 JSON，供后续拍摄、设计、投放或人工审核使用。

项目当前定位是 MVP 和本地原型，不是线上 SaaS，也不是自动抓取平台数据的爬虫系统。

## 产品边界

必须坚持的边界：

- 只能使用官方开放平台、商家后台导出、达人/商家授权数据、内部投放数据、用户当前页面中有权访问和使用的数据。
- 不能实现绕过登录、验证码、风控、频控、反爬限制的采集能力。
- 不能以搬运竞品图片、视频、音乐、字幕、演员表演或剪辑为目标。
- 素材理解只分析结构，例如开场钩子、镜头节奏、卖点排列、价格锚点、行动号召。
- 生成结果必须是原创脚本、原创海报提示词、原创拍摄分镜和原创文案。
- 平台发布链路只能发布自有或已授权内容，不能复用未授权第三方素材。

## 当前形态

项目同时支持三种使用形态：

- 本地网页服务：`node src/server.js` 后访问 `http://localhost:4173`。
- Windows 桌面应用：Electron 壳自动启动内置服务并打开工作台窗口。
- Edge 插件采集助手：从当前浏览器已渲染、用户有权访问的页面读取商品卡片并发送到本地工作台。

当前 UI 已升级为桌面运营工作台形态，首屏包含左侧窄导航、顶部连接状态、数据源控制区、销量榜、中央商品预览、右侧商品指标和销量趋势图、下方创意生成、文案优化、素材洞察与投放建议，并保留批量任务区域；合规审核已收进“投放建议”标签页。右侧主工作区已改为自适应堆叠，创意工作区紧跟商品预览/指标，批量任务紧跟创意工作区。

## 已实现能力

- 样例商品销量榜，支持平台、关键词和数量筛选。
- CSV 商品导入，并按销量排序。
- 历史销量 CSV/API 导入，可把授权数据中的 `salesTrend`、`salesHistory`、`dailySales`、`trend` 或日销量明细合并到当前商品。
- 授权文本/HTML 导入，解析标题、价格、销量、店铺和图片链接。
- Edge 插件采集助手，读取当前页面已渲染 DOM 商品卡片。
- 插件数据接收接口和“读取插件数据”按钮。
- Edge 插件识别率调优：支持商品链接/图片/数据属性锚点识别、容器评分、懒加载图片、背景图、平台常见商品链接和更稳的标题/店铺/销量提取。
- 插件识别质量报告：读取插件数据后展示候选卡片、识别率、字段完整度、缺失样本和改进建议。
- 淘宝开放平台 `taobao.tbk.dg.material.optional` 适配入口和签名逻辑。
- 抖音/抖店授权数据适配入口占位。
- 本地规则素材结构分析。
- 敏感词和品牌规则库：支持默认规则启停、自定义规则保存、导入导出、导入差异预览、版本快照回滚、品牌授权状态、品牌授权范围、平台/类目范围、规则合并和审核命中展示。
- OpenAI 兼容大模型分析，可在页面配置 Base URL、模型和 API Key。
- AI 调用失败诊断，能提示 Key、Base URL、模型权限等问题。
- 阿里百炼 Coding 专属预设，支持 `sk-sp` 套餐 Key 搭配 `https://coding.dashscope.aliyuncs.com/v1` 和 `qwen3-coder-plus`。
- 短视频脚本和海报方案生成。
- 自动合规审核，覆盖数据授权、素材版权、极限词、功效承诺、销量背书和效果表达。
- 授权凭证台账：支持登记后台导出、开放平台返回、页面截图、授权文件等凭证摘要，并在合规审核中自动匹配当前商品。
- 视觉模型素材风险分析，支持按需分析图片/视频的水印、字幕、主体、场景、品牌 logo 和画面文字风险，并展示素材可访问性、素材清单、模型候选、风险证据卡、视频抽帧计划、证据截图留档、人工复核清单、本地预检差异和重拍/替换简报。
- 创意结果质量控制，生成广告方案后会给出总分、等级、发布闸门、六个维度评分、优先处理项和改写简报。
- 专业方案交付包导出：单品导出会生成 `plan.json`、`plan.md`、`review-checklist.csv` 和 `manifest.json`，批量成功项也复用专业方案结构。
- 批量任务队列：支持商品多选、批量生成、批量审核、历史生成方案复审、取消、重试、归档、任务搜索、状态筛选、归档查看、高并发限流保护、任务状态保存和批量报告包导出。报告包包含逐商品 JSON、`summary.json`、`batch-report.md`、`batch-summary.csv` 和 `manifest.json`。
- 批量失败原因分类：失败项会记录错误分类、失败阶段、错误代码和是否建议重试，并同步到前端详情、`summary.json`、`batch-report.md` 和 `batch-summary.csv`。
- 批量报告筛选体验：批量详情支持按商品/错误关键词、明细状态和错误分类筛选，并显示当前匹配数量。
- 归档任务管理：归档任务可在含归档/已归档列表中恢复到常规列表，恢复时优先使用归档前状态，旧任务按明细状态推断。
- 本地 API 会话门禁：除 `/api/health` 外，API 默认要求工作台同源页面携带进程内 `ad_workbench_session` Cookie；跨域 CORS 不再使用通配 `*`，Edge 插件导入需要扩展来源和 `X-Workbench-Extension: edge-dom-capture` 标识。
- 正式应用图标已接入前端、Electron 窗口和 Windows 打包配置。
- 首次启动向导，覆盖 AI Key、Edge 插件、授权数据导入、分析/生成/审核流程。
- “打开导出目录”和“打开插件目录”快捷入口。
- Windows 免安装版和 NSIS 安装包构建。
- 2026-06-10 已重新构建 Windows 测试安装包和免安装版，并完成桌面冒烟验证；当前安装包未签名，Windows 仍可能提示未知发布者。
- 2026-06-10 已创建 GitHub `v0.1.0` 测试版 Release，并上传安装包附件 `baopin-workbench-setup-0.1.0.exe`。
- 2026-06-11 已升级 Electron 到 `42.4.0`、electron-builder 到 `26.15.2`，新增一键验证脚本和 GitHub Actions，并构建 `v0.1.1` 测试安装包；`npm audit --audit-level=high` 当前为 0 漏洞。
- 2026-06-20 已完成 `v0.1.2` 测试版构建准备，目标是把桌面安全加固带进可安装包；安装包大小 104,145,215 字节，SHA256 为 `524D0E3089D26B5E285233C198D8E4CF23DFD87FB9E8647DE3CEB4A07A69D541`，发布记录见 `docs/releases/v0.1.2.md`。
- 2026-06-20 已继续完成本地 API 安全加固，新增会话 Cookie 门禁、插件导入请求标识、收窄 CORS 和 UI 回归断言；如果旧版插件发送失败，需要在 `edge://extensions/` 重新加载最新版插件。

## 关键文件

- `src/server.js`：HTTP 服务、API 路由、数据导入、AI 配置、AI 分析、广告生成、合规审核。
- `public/index.html`：工作台页面结构。
- `public/app.js`：前端状态管理、接口调用、渲染逻辑。
- `public/styles.css`：布局和视觉样式。
- `desktop/main.cjs`：Electron 桌面壳，启动内置服务并加载页面。
- `public/assets/app-icon.png`：前端品牌图标和 favicon。
- `desktop/assets/icon.ico`：Electron 运行时窗口图标。
- `build/icon.ico`：Windows 打包图标。
- `edge-extension/`：Edge 插件源码。
- `scripts/verify-edge-extension.mjs`：Edge 插件识别逻辑的本地验证脚本。
- `scripts/fixtures/edge-extension-products.html`：插件识别验证用的本地商品卡片页面。
- `data/products.sample.json`：样例商品数据。
- `data/compliance-rules.local.json`：本机敏感词/品牌规则配置，仅用于开发或桌面运行时，不提交。
- `data/compliance-audit-records.local.json`：本机合规审核留痕，仅用于开发或桌面运行时，不提交。
- `data/authorization-credentials.local.json`：本机授权凭证台账，仅用于开发或桌面运行时，不提交。
- `data/material-rights.local.json`：本机素材版权台账，仅用于开发或桌面运行时，不提交。
- `data/batch-jobs.local.json`：本机批量任务状态，仅用于开发或桌面运行时，不提交。
- `docs/edge-extension-compatibility-report.md`：Edge 插件真实页面兼容性适配报告。
- `docs/feasibility.md`：早期可行性和边界说明。
- `README.md`：用户使用说明。

## 运行与构建

本地网页：

```powershell
node src/server.js
```

桌面开发运行：

```powershell
npm run desktop
```

免安装目录版：

```powershell
npm run pack
```

Windows 安装包：

```powershell
npm run dist
```

要求代码签名的 Windows 安装包：

```powershell
$env:WIN_CSC_LINK="C:\path\to\certificate.pfx"
$env:WIN_CSC_KEY_PASSWORD="your_certificate_password"
npm.cmd run dist:signed
```

当前构建产物：

- `release/win-unpacked/爆品广告工作台.exe`
- `release/爆品广告工作台 Setup 0.1.1.exe`

注意：`release/` 是本机构建产物目录，不提交到 GitHub。后续修改 UI、图标、桌面壳或依赖后，需要重新运行打包命令并重新做安装冒烟测试。

2026-05-19 已重新运行 `npm.cmd run dist`，当前安装包和免安装版已包含最新 UI、正式图标、首次启动向导、目录快捷按钮和桌面端 `127.0.0.1` 加载修复。

## AI 配置状态

工作台左侧“大模型设置”可以保存：

- 主模型 Base URL：默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`
- 主模型：默认 `qwen-plus`
- 主模型 API Key
- 视觉 Base URL：默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`
- 视觉模型：默认 `qwen-vl-plus`，可选 `qwen-vl-max`、`qwen3-vl-plus`、`qwen3-vl-flash`
- 视觉 API Key：可单独保存，留空时共用主模型 Key
- 超时时间

完整 Key 保存到本机 `data/ai-config.local.json` 或桌面版用户数据目录，前端只显示尾号。该本地配置文件已加入 `.gitignore`。

当前已知问题：用户曾使用 `sk-sp` Key 搭配 `https://dashscope.aliyuncs.com/compatible-mode/v1`，返回 `401 Incorrect API key provided`。诊断结论是请求已到达模型接口，但 Key 与 Base URL 或账号权限不匹配。需要换普通百炼 API Key，或使用套餐页面提供的专属 Base URL。

已验证可用组合：

- Base URL：`https://coding.dashscope.aliyuncs.com/v1`
- 模型：`qwen3-coder-plus`
- Key 类型：`sk-sp...` 套餐专属 Key

2026-05-25 已把视觉分析从主模型配置中拆出：文案/Coding 可以继续使用主模型配置，视觉分析改用 `visualBaseUrl`、`visualModel` 和可选 `visualApiKey`，避免 `sk-sp` Coding Key 与视觉模型互相干扰。

曾经出现“同一 Key 有时成功、有时失败”的根因不是接口不可用，而是开发版 Node 服务和桌面版服务同时监听 `4173`，`localhost`/`::1` 与 `127.0.0.1` 读到不同配置。当前桌面端已固定使用 `127.0.0.1:4173`，并且 `src/server.js` 会按实际 host 返回 URL。

## 最近修复

- 修复 Electron 在 Windows 上动态导入服务端模块时的 ESM 路径问题，使用 `pathToFileURL()`。
- 修复桌面版使用 `localhost` 时可能串到 IPv6 `::1` 上另一套服务的问题，统一绑定并加载 `127.0.0.1:4173`。
- 加固桌面安全边界：Electron 只允许工作台本地地址在窗口内导航，外部链接只放行 `http/https`，默认拒绝页面权限和 `webview`，下载限定为工作台本地来源或本地 `blob:` 导出。
- 本地 HTTP 服务已补充 CSP、`nosniff`、`no-referrer`、`X-Frame-Options: DENY` 和 `Permissions-Policy`，静态资源路径改用 `relative()` 校验防止跳出 `public/`。
- 本地 API 已补充进程内会话门禁和收窄 CORS：工作台页面通过 HttpOnly Cookie 自动建立本机会话，外部无会话 POST 会返回 `LOCAL_API_FORBIDDEN`，Edge 插件导入需携带项目约定请求头。
- 修复 AI 调用失败只显示英文错误的问题，加入中文诊断。
- 拆分主模型和视觉模型配置，视觉分析可单独配置 `visualBaseUrl`、`visualModel` 和可选视觉 Key。
- 修复插件来源 URL 文本撑破提示框的问题，长来源会截断并隐藏溢出。
- 修复左侧控制区内容过长时无法滚动的问题。
- 重构前端 UI 为桌面运营工作台布局，新增媒体缩略图、销量趋势图和更清晰的创意工作区。
- 修正销量趋势展示逻辑：不再用商品销量和评分生成模拟趋势；只有导入/API/插件数据提供 `salesTrend`、`salesHistory`、`dailySales` 或 `trend` 等真实历史字段时才绘制，否则明确显示暂无历史销量数据。
- 接入用户提供的正式图标：`public/assets/app-icon.png`、`desktop/assets/icon.ico`、`build/icon.ico`，并配置 Electron 和 electron-builder。
- 新增首次启动向导：自动弹出一次，可通过顶部“新手向导”再次打开，完成状态保存在浏览器 `localStorage`。
- 新增目录快捷入口：`POST /api/open/output-dir` 和 `POST /api/open/extension-dir`，只打开固定的导出目录和插件目录。
- 新增批量任务基础版：`POST /api/batch/jobs` 创建批量生成/审核任务，`GET /api/batch/jobs` 查询任务历史；导出目录下生成 `output/batch-runs/<jobId>/summary.json` 和逐商品 JSON。
- 批量任务导出已升级为报告包：在逐商品 JSON 和 `summary.json` 基础上新增 `batch-report.md`、`batch-summary.csv` 和 `manifest.json`，前端任务详情会展示“汇总 / 报告 / 总表 / 清单”路径。
- 新增敏感词和品牌规则库基础版：`GET /api/compliance-rules` 读取规则库，`POST /api/compliance-rules` 保存默认规则启停和自定义规则；合规审核会显示规则命中明细。
- Edge 插件真实页面识别率第一轮调优：优先发送到 `127.0.0.1:4173`，改用锚点识别和容器评分，增强懒加载图片、背景图、商品链接、标题、店铺、价格和销量提取。
- 新增历史销量导入增强：`POST /api/import/sales-history` 支持授权 CSV/API JSON，将真实历史销量字段合并到当前商品，不根据当前销量模拟趋势。
- 新增批量任务操作：`POST /api/batch/jobs/:id/cancel`、`POST /api/batch/jobs/:id/retry`、`POST /api/batch/jobs/:id/archive`，前端任务列表和详情可取消、重试和归档。
- 规则库新增版本化和范围：保存、导入、重置会记录版本变化，自定义规则支持按平台和类目限定生效范围。
- 插件导入结果新增识别质量报告，展示候选卡片数、识别商品数、字段完整度、缺失字段样本和改进建议。
- 新增授权凭证台账：`GET/POST /api/authorization-credentials` 和 `GET /api/authorization-credentials/export`，投放建议中可登记当前商品凭证摘要，审核会自动匹配凭证。
- 新增素材版权台账：`GET/POST /api/material-rights` 和 `GET /api/material-rights/export`，投放建议中可登记图片、视频、音乐、字体、肖像、Logo 和产品拍摄授权摘要，审核和专业导出证据包会自动匹配。
- 文案优化区调整：将广告方案模块迁移到“文案优化”标签页内，生成后自动切换到该面板，避免结果区和审核区分散。
- 素材洞察区调整：将 `AI 洞察` 从独立主面板改为“素材洞察”里的结果卡片，素材分析和视觉分析完成后都会停留在素材洞察面板。
- 投放建议区调整：将独立的合规审核卡片迁移到“投放建议”标签页，点击合规审核后自动切换到投放建议。
- 右侧主工作区调整：商品预览/指标、创意工作区和批量任务改为同一主工作区内自适应堆叠，避免左侧列高度把创意区和批量任务向下撑出空白。

## 最近验证

最近一次改动后已运行：

```powershell
npm.cmd run verify
npm.cmd audit --audit-level=high
npm.cmd run verify:ui
```

2026-06-15 桌面安全加固验证：

- `node --check desktop\main.cjs`、`node --check src\server.js`、`node --check scripts\verify-ui.mjs` 均通过。
- `npm.cmd run verify` 通过，Edge fixture 识别 10/10 个商品。
- `npm.cmd run verify:ui` 通过，新增安全头断言确认 CSP、`nosniff`、`no-referrer`、`DENY` 和权限策略均存在。

2026-06-20 `v0.1.2` 打包和安装链路验证：

- `npm.cmd audit --audit-level=high` 初次发现 `form-data` / `undici` 新高危传递依赖漏洞；已用 `npm.cmd audit fix` 升级到安全版本，复查为 0 漏洞。
- `npm.cmd run verify`、`npm.cmd audit --audit-level=high`、`npm.cmd run verify:ui` 均通过。
- `npm.cmd run dist` 成功生成 `release/爆品广告工作台 Setup 0.1.2.exe`。
- 免安装版和静默安装版均启动成功，`http://127.0.0.1:4173` 返回 200，卸载后测试安装目录不存在且 4173 端口无占用。

2026-06-11 依赖升级和重新打包验证：

- `electron` 已升级到 `42.4.0`，`electron-builder` 已升级到 `26.15.2`。
- `npm.cmd run verify` 通过，Edge fixture 识别 10/10 个商品。
- `npm.cmd audit --audit-level=high` 返回 0 漏洞。
- `npm.cmd outdated --json` 返回空对象。
- `npm.cmd run verify:ui` 通过，页面回归 `ok: true`，控制台无错误。
- `npm.cmd run dist` 成功生成 `release/爆品广告工作台 Setup 0.1.1.exe` 和 `release/win-unpacked/爆品广告工作台.exe`。
- `0.1.1` 免安装版和安装版均已启动验证，`http://127.0.0.1:4173` 返回 200。
- `0.1.1` 静默安装和卸载均返回 0，卸载后测试安装目录无残留文件且 4173 端口无占用。

2026-05-19 重新打包后验证：

- `npm.cmd run dist` 成功生成 `release/爆品广告工作台 Setup 0.1.0.exe` 和 `release/win-unpacked/爆品广告工作台.exe`。
- 启动新版 `release/win-unpacked/爆品广告工作台.exe` 后，服务监听 `127.0.0.1:4173`。
- `node scripts\verify-ui.mjs http://127.0.0.1:4173` 通过：商品卡 10 个，图片无失败，控制台无错误。
- `POST http://127.0.0.1:4173/api/ai-config/test` 返回 200：`AI 连接测试成功`，模型为 `qwen3-coder-plus`。
- `POST /api/open/output-dir` 和 `POST /api/open/extension-dir` 在打包版验证通过。

2026-05-20 打包配置和安装体验验证：

- 新增 `electron-builder.config.cjs`，`npm.cmd run dist` 已确认从该配置文件加载。
- 新增 `npm.cmd run dist:signed`，要求提供代码签名证书；未提供证书时会提前报错。
- 新增 `build/installer.nsh`，为 NSIS 安装器补充欢迎页和中文卸载欢迎页。
- 安装包和卸载器图标、开始菜单分类、卸载显示名等安装体验配置已接入。
- 当前本机没有正式签名证书，`Get-AuthenticodeSignature` 确认安装包仍为 `NotSigned`。
- `npm.cmd run dist:signed` 已实测在缺少证书时提前失败，避免静默生成未签名包。

2026-05-20 批量任务验证：

- 使用临时用户数据目录启动测试服务，创建 2 个商品的批量审核任务，结果 2/2 成功并生成 `summary.json`。
- 浏览器验证工作台批量面板：全选 10 个商品后批量审核 10/10 完成；批量生成 10/10 完成；历史生成任务的“复审方案”可再次生成 10/10 审核结果。
- `node scripts\verify-ui.mjs http://127.0.0.1:4284` 通过：商品卡 10 个，图片 17/17 加载成功，控制台无错误。

2026-05-21 规则库验证：

- `node --check src\server.js`、`node --check public\app.js`、`node --check desktop\main.cjs`、`node --check scripts\verify-ui.mjs` 均通过。
- 临时新增自定义敏感词并触发合规审核，确认 `audit.flaggedTerms` 能返回自定义规则命中；随后已重置回默认规则。
- `node scripts\verify-ui.mjs http://127.0.0.1:4173` 通过：规则库状态为 `生效 22`，默认敏感词渲染正常，图片 17/17 加载成功，控制台无错误。

2026-05-21 Edge 插件识别验证：

- `node --check edge-extension\popup.js` 和 `node --check scripts\verify-edge-extension.mjs` 通过。
- `node scripts\verify-edge-extension.mjs` 通过：本地测试页 3/3 个商品被识别，标题、价格、销量、店铺、图片均正常，广告位未被误识别。

2026-05-21 文案优化区调整：

- `node --check public\app.js` 和 `node --check public\index.html` 相关改动通过，`node scripts\verify-ui.mjs http://127.0.0.1:4173` 通过。
- 广告方案输出已进入“文案优化”标签页，生成后自动切换到该面板。

2026-05-21 素材洞察区调整：

- 将原来的 `AI 洞察` 主面板合并到“素材洞察”标签页，`AI 洞察` 作为素材洞察里的结果卡片展示。
- “分析素材”和“视觉分析”完成后都会自动切换到“素材洞察”。

2026-05-21 投放建议区调整：

- 将原来的独立 `合规审核` 面板合并到“投放建议”标签页。
- 点击左侧“审核”导航或创意区的合规审核按钮，会打开“投放建议”并展示审核结果。

2026-05-21 右侧主工作区布局调整：

- 新增右侧 `workspace-main` 自适应堆叠区，内部顺序为商品预览、商品指标、创意工作区、批量任务。
- 验证脚本新增布局断言，确认商品预览到创意区、创意区到批量任务之间保持紧凑间距。

## 工作日志

- 2026-05-19 今日完整记录见 `docs/work-log.md`：包含 AI 连接修复、桌面 UI 优化、正式图标接入、销量趋势真实性修正、创意区文字错位修复、验证和重新打包结果。
- 2026-05-20 今日完整记录见 `docs/work-log.md`：包含签名构建入口、安装器体验优化、重新打包、未签名状态确认，以及批量生成/批量审核基础版。
- 2026-05-21 今日完整记录见 `docs/work-log.md`：包含敏感词/品牌规则库基础版、规则库接口、前端规则编辑器、审核命中展示、Edge 插件识别率第一轮调优和验证记录。
- 2026-05-23 今日完整记录见 `docs/work-log.md`：包含历史销量 CSV/API 导入增强、批量任务取消/重试/归档、规则库版本化和平台/类目分组、插件识别质量报告、授权凭证台账。
- 2026-05-26 今日完整记录见 `docs/work-log.md`：包含视觉模型独立配置、视觉风险结果细化、创意质量控制、单品专业交付包和批量报告包导出增强。
- 2026-05-27 今日完整记录见 `docs/work-log.md`：包含素材版权台账基础版、审核匹配、证据包导出和 UI/API 回归验证。
- 2026-06-09 今日完整记录见 `docs/work-log.md`：包含素材版权台账增强、规则库导入差异预览、版本快照回滚和品牌词授权状态审核提示。
- 2026-06-15 今日完整记录见 `docs/work-log.md`：包含 Electron 导航/外链/权限/下载加固、本地服务安全响应头和 UI 安全头回归断言。
- 2026-06-20 今日完整记录见 `docs/work-log.md`：包含 `v0.1.2` 测试版准备、版本升级、发布文档、重新打包和安装链路验证。

## 仍待完善

- 作废聊天中暴露过的阿里百炼 Key，重新生成并在工作台内保存新 Key。
- 提供正式代码签名证书，运行 `npm.cmd run dist:signed` 并确认签名状态为 `Valid`。
- 补版本号策略。
- 完善自动更新策略。
- 素材版权台账后续增强：已支持附件引用、到期提醒、品牌授权范围、渠道/地域/活动范围管理；后续继续优化附件引用上传体验、到期提醒筛选和品牌授权范围差异预览。
- 批量任务后续增强：更细的失败原因、归档任务管理和批量报告筛选体验。
- 视觉模型后续增强：已补充素材清单、视频抽帧计划、证据截图留档、模型候选和人工复核清单；后续继续优化真实视频抽帧执行、证据截图采集和模型候选排序。
- 规则库后续增强：版本快照对比、回滚前差异预览和品牌授权范围模板体验。
- 抖音/抖店开放平台字段映射仍待真实授权后补齐。
- Edge 插件仍需用真实授权页面持续测试，继续沉淀平台/后台导出页的识别样本，并提高质量报告中的字段完整度。

## 2026-05-20 视觉模型分析素材风险
- 新增 `POST /api/analyze-visual-risk`，支持图片和视频素材的视觉复核，返回水印、字幕、主体、场景、镜头切换、品牌 logo、画面文字、风险等级和证据。
- `POST /api/analyze-media` 继续保留文本分析主路径，视觉模型改成单独入口按需触发，避免常规分析变慢。
- 前端在素材洞察面板新增“视觉分析”按钮，并展示视觉风险卡片、证据和处理建议。
- 合规审核已联动视觉结果，可把水印、品牌标识和画面文字风险纳入审核分数与提示。
- 2026-05-29 已继续深化视觉风险结果：`visualRisk` 新增 `assetInventory`、`modelCandidates`、`riskEvidenceCards`、`videoFramePlan`、`evidenceSnapshots` 和 `manualReviewChecklist`；前端素材洞察和专业导出会同步展示这些复核字段。
- 已通过 `node --check src\server.js`、`node --check public\app.js` 和 `node scripts\verify-ui.mjs http://127.0.0.1:4173`。

## 2026-05-21 自定义敏感词和品牌规则
- 新增本机规则库文件 `data/compliance-rules.local.json`，用于保存禁用默认规则和自定义敏感词/品牌规则，文件已加入 `.gitignore`。
- 新增 `GET /api/compliance-rules` 和 `POST /api/compliance-rules`，前端可读取、保存、重置规则库。
- 默认规则库包含 14 条敏感/广告法风险词和 8 条品牌/素材风险词；自定义规则会与默认规则合并，同名规则按标准化词条覆盖。
- 左侧控制区新增“敏感词与品牌规则”编辑器，可切换敏感词/品牌词、启停默认规则、添加自定义规则。
- 合规审核现在会区分敏感词命中和品牌规则命中，并在审核卡片展示“规则命中”明细。
- 已通过语法检查、规则库接口烟测和 `node scripts\verify-ui.mjs http://127.0.0.1:4173`。

## 2026-05-21 Edge 插件真实页面识别率调优
- 插件发送工作台地址改为优先 `http://127.0.0.1:4173`，失败后回退 `localhost`，降低桌面版和开发服务配置串线概率。
- 商品卡识别改为“商品链接/图片/数据属性锚点 -> 卡片容器上溯 -> 评分筛选”，减少漏识别和大容器误识别。
- 新增对 `data-item-id`、`data-goods-id`、`data-product-id`、`data-e2e`、`data-testid`、商品详情链接、懒加载图片、`srcset`、背景图等信号的支持。
- 优化标题、店铺、价格、销量提取，支持 `月售`、`人已买`、`件已售`、`累计销量` 等常见表达。
- 新增 `scripts/verify-edge-extension.mjs` 和本地 fixture 页面，当前可稳定识别 3/3 个测试商品，并排除非商品广告位。

## 2026-05-23 Edge 插件兼容性第二轮调优
- 继续在合规边界内调优插件识别率：仅读取当前已渲染 DOM，不新增后台访问、自动翻页、登录态处理或绕过限制能力。
- 增强京东式、拼多多式、小红书/内容电商式结构识别，新增 `data-sku`、`data-ware-id`、`data-spu-id`、`item.jd.com`、`goods.html`、`mobile.yangkeduo.com`、`/goods/` 等信号。
- 增强图片读取：支持 `data-lazyload`、`data-actualsrc`、`data-imgurl`、`data-cover`、`data-poster`、背景图和 CSS 变量背景图，并过滤 `data:`、`file:`、`blob:`、`javascript:` 等不可用素材地址。
- 增强价格/销量提取：支持拆分价格节点、券后价、活动价、已拼、卖出、单已售、笔成交等表达。
- 插件商品快照新增/保留 `mediaItems`，用于工作台素材缩略图预览切换。
- 本地 fixture 扩展到 6 类商品结构；`node scripts\verify-edge-extension.mjs` 通过：识别 6/6 个商品，广告位未误识别。
- 兼容性适配报告已输出到 `docs/edge-extension-compatibility-report.md`。

## 2026-05-29 Edge 插件兼容性第三轮调优
- 继续在合规边界内调优插件识别率：仍只读取当前已渲染 DOM，不新增后台访问、自动翻页、登录态处理、风控绕过或未授权素材下载。
- 新增 1688 供货卡、快手/小店商品卡、商家后台表格行和紧凑货架卡识别信号，覆盖 `data-offer-id`、`data-commodity-id`、`data-sku-code`、`data-auction-id`、`detail.1688.com`、`kwaixiaodian`、`/offer/`、`/commodity/` 等。
- 增强价格、销量、标题和图片字段：支持 `data-promotion-price`、`data-price-cent`、售价/拿货价、采购/回购、`data-image-url`、`data-thumb`、`data-pic-url` 等字段。
- 增加非商品误识别抑制：广告位、直播入口、优惠券组件、会场入口和专题卡会被降权或排除。
- 本地 fixture 扩展到 10 类商品结构；`node scripts\verify-edge-extension.mjs` 通过：识别 10/10 个商品，广告位/直播入口/优惠券未误识别，4 个样本包含真实 `salesTrend`。

## 2026-05-23 规则库导入导出和审核留痕
- 规则库新增导入/导出能力：`GET /api/compliance-rules/export` 导出 JSON 规则包，`POST /api/compliance-rules/import` 支持合并或覆盖导入。
- 前端规则库工具栏新增“导入规则”“导出规则”，导出文件不包含 API Key、Cookie、Token 或登录态。
- 新增本机审核记录文件 `data/compliance-audit-records.local.json`，已加入 `.gitignore`；仅保存商品摘要、审核结果、命中词、检查项、规则快照和素材证据摘要。
- 合规审核和批量审核都会写入审核留痕；新增 `GET /api/compliance-audits` 和 `GET /api/compliance-audits/export`。
- 投放建议面板新增“审核留痕”区域，展示最近审核记录，并提供“导出记录”JSON 归档入口。
- `scripts/verify-ui.mjs` 已增加规则导入/导出、审核记录生成和记录导出的接口验证。

## 2026-05-23 历史销量、批量任务、规则范围和插件质量报告
- 新增 `POST /api/import/sales-history`：支持授权 CSV/API JSON 导入历史销量，按 `id`、`productId`、`sku`、`title` 等字段匹配当前商品；支持行内趋势数组和 `productId,date,sales` 日销量明细。
- 前端授权数据导入区新增“导入历史销量”按钮，导入后刷新商品列表和销量趋势；没有真实历史字段时仍显示暂无历史销量数据。
- 批量任务新增取消、重试、归档动作，归档任务默认不再显示；取消只停止排队项，运行中单项可自然结束。
- 规则库状态新增版本和 `revisionHistory`；自定义规则支持 `platforms`、`categories` 范围字段，合规审核会按商品平台/类目过滤规则。
- Edge 插件导入结果新增 `qualityReport`，前端展示识别率、字段完整度、缺失样本和改进建议。
- 已通过 `node --check src\server.js`、`node --check public\app.js`、`node --check scripts\verify-ui.mjs`、`node --check edge-extension\popup.js`、`node --check desktop\main.cjs`、`node scripts\verify-edge-extension.mjs` 和临时新服务上的 `node scripts\verify-ui.mjs http://127.0.0.1:4194`。

## 2026-05-23 授权凭证台账
- 新增本机私有文件 `data/authorization-credentials.local.json`，已加入 `.gitignore`，用于保存授权凭证摘要。
- 新增 `GET /api/authorization-credentials`、`POST /api/authorization-credentials` 和 `GET /api/authorization-credentials/export`。
- 前端“投放建议”新增“授权凭证”区域，可为当前商品登记商家后台导出、官方开放平台、页面截图、达人/商家授权、内部投放数据或授权文件摘要，并可导出 JSON 台账。
- 合规审核会自动匹配当前商品凭证，匹配成功时在审核项中显示“已关联授权凭证”；没有匹配时继续提示补齐凭证台账。
- 台账只保存凭证摘要和引用，不保存截图/文件原文，也不保存 API Key、Cookie、Token 或登录态。

## 2026-05-27 素材版权台账
- 新增本机私有文件 `data/material-rights.local.json`，已加入 `.gitignore`，用于保存素材版权摘要。
- 新增 `GET /api/material-rights`、`POST /api/material-rights` 和 `GET /api/material-rights/export`。
- 前端“投放建议”新增“素材版权”区域，可登记当前商品的图片、视频、音乐、字体、肖像、Logo、产品拍摄等素材授权摘要，并可导出 JSON 台账。
- 合规审核会自动匹配当前商品素材版权记录，匹配成功时显示“已关联素材版权台账”；外部素材或视觉风险需要证据但未匹配时提示补齐台账。
- 专业方案导出的证据包和 `plan.md` 会携带匹配到的素材版权摘要；台账只保存摘要和引用，不保存原始素材文件、Key、Cookie、Token 或登录态。
- 2026-06-09 已增强素材版权台账：新增附件引用、品牌授权状态/品牌名、渠道范围、地域范围、活动范围和到期提醒；合规审核会提示已过期、即将到期、有限授权、待复核、不可使用和品牌范围不匹配风险。

## 2026-06-09 规则库差异预览和版本回滚
- 新增 `POST /api/compliance-rules/preview-import`，导入前可预览新增、覆盖、平台/类目变化、品牌授权状态变化、品牌授权范围变化、覆盖移除和默认规则禁用变化。
- 新增规则库 `snapshots`，保存、导入、重置、回滚前会自动保留最近 12 个轻量快照；快照只保存规则状态、自定义规则和默认规则禁用状态，不保存 Key、Cookie、Token、登录态或原始授权文件。
- 新增 `POST /api/compliance-rules/rollback`，可将规则库回滚到指定快照版本，回滚前也会保留当前状态快照。
- 品牌规则新增 `brandAuthorizationStatus`，支持 `risk`、`authorized`、`pending_review`、`forbidden`；同时新增 `brandScope`，保存授权品牌、渠道、地区、活动、有效期、凭证引用等摘要字段，不保存原始授权文件。
- 合规审核会按“已授权、待复核、不可用、需复核”给出不同提示，并检查品牌授权平台/类目、登记品牌、有效期等范围风险；审核留痕会保留授权状态、范围摘要和范围提醒。
- 前端规则库新增导入预览面板、版本快照列表、回滚按钮、品牌词授权状态选择框和品牌授权范围编辑字段。
- `scripts/verify-ui.mjs` 已覆盖导入预览 schema、授权状态变化 diff、品牌授权范围变化 diff、快照生成、回滚恢复、品牌范围审核提示和新 UI 控件渲染。
