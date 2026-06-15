# AGENTS.md

## 项目身份

这是“爆品广告工作台”，一个合规优先的本地工具，用于把授权商品数据转化为原创广告方案。它不是爬虫项目，也不是未授权素材搬运工具。

## 长期目标

- 帮助运营人员从授权商品数据中筛选机会。
- 分析推广素材结构，但不复制素材。
- 生成原创脚本、分镜、海报提示词和广告方案。
- 提供合规审核和证据留存能力。
- 最终形态是本地桌面工作台，配合浏览器插件和授权数据源使用。

## 不可突破的边界

- 不实现绕过登录、验证码、风控、频控或反爬的采集能力。
- 不抓取未授权页面作为默认能力。
- 不下载、搬运、复刻竞品图片、视频、音乐、字幕、演员表演或剪辑。
- 不生成规避平台审核、规避版权或规避广告法的方案。
- 不把 API Key、Cookie、Token、登录态写入代码、README、前端或可提交文件。

## 合规采集原则

允许的数据来源：

- 官方开放平台。
- 商家后台导出。
- 达人/商家授权数据。
- 内部投放数据。
- 用户当前浏览器中有权访问和使用的页面内容。
- 用户手动粘贴的授权文本、HTML 或 CSV。

Edge 插件只能读取当前页面已渲染 DOM 内容，不处理登录态，不绕过平台限制，不做后台爬取。
插件商品识别改动必须优先基于当前 DOM、商品链接、图片、标题、价格、销量和店铺等可见信号调优；不能扩展为后台访问、自动翻页、绕过登录或批量抓取。

## 技术结构

- `src/server.js`：本地 HTTP 服务和核心业务逻辑。
- `public/`：工作台前端。
- `desktop/main.cjs`：Electron 桌面壳。
- `edge-extension/`：Edge 采集助手。
- `scripts/verify-edge-extension.mjs`：Edge 插件商品识别本地验证脚本。
- `scripts/fixtures/edge-extension-products.html`：插件识别验证用的本地商品卡片页面。
- `data/products.sample.json`：样例数据。
- 历史销量导入接口是 `POST /api/import/sales-history`，只合并授权 CSV/API JSON 中真实存在的历史字段。
- `data/batch-jobs.local.json`：本机批量任务状态，仅用于开发/桌面运行时，不提交。
- `data/compliance-rules.local.json`：本机敏感词和品牌规则状态，仅用于开发/桌面运行时，不提交。
- `data/compliance-audit-records.local.json`：本机合规审核留痕，仅用于开发/桌面运行时，不提交。
- `data/authorization-credentials.local.json`：本机授权凭证台账，仅用于开发/桌面运行时，不提交。
- `data/material-rights.local.json`：本机素材版权台账，仅用于开发/桌面运行时，不提交。
- `public/assets/app-icon.png`：前端品牌图标和 favicon。
- `desktop/assets/icon.ico`：Electron 运行时窗口图标。
- `build/icon.ico`：electron-builder Windows 打包图标。
- `docs/`：项目文档。

## 开发命令

```powershell
node src/server.js
```

```powershell
npm run desktop
```

```powershell
npm.cmd run dist
```

```powershell
npm.cmd run dist:signed
```

```powershell
npm.cmd run verify
```

```powershell
npm.cmd run verify:ui
```

PowerShell 可能阻止 `npm.ps1`，优先使用 `npm.cmd`。

## 验证要求

改动后至少运行相关检查：

```powershell
npm.cmd run verify
```

涉及桌面壳时：

```powershell
node --check desktop\main.cjs
```

涉及插件时：

```powershell
node --check edge-extension\popup.js
```

涉及 Edge 插件商品识别规则时：

```powershell
node --check scripts\verify-edge-extension.mjs
node scripts\verify-edge-extension.mjs
```

涉及前端主流程时：

```powershell
npm.cmd run verify:ui
```

涉及桌面安全响应头、Electron 导航或下载策略时，也需要运行 `npm.cmd run verify:ui`，确认 CSP、`nosniff`、`no-referrer`、`DENY` 和权限策略断言仍通过。

涉及打包时：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm.cmd run dist
```

## AI 配置规则

- 页面可保存主模型 Base URL、模型、API Key，以及独立的视觉模型 Base URL、模型和可选视觉 API Key。
- 大模型设置需要具备记忆能力：下次打开自动恢复主模型和视觉模型的 Base URL、模型、超时和已保存 Key 的尾号。
- 阿里百炼普通 Key 默认搭配 `https://dashscope.aliyuncs.com/compatible-mode/v1` 和 `qwen-plus`；Coding Plan / 套餐专属 `sk-sp` Key 搭配 `https://coding.dashscope.aliyuncs.com/v1` 和 `qwen3-coder-plus`。
- 视觉分析默认使用独立视觉配置，推荐 `https://dashscope.aliyuncs.com/compatible-mode/v1` 搭配 `qwen-vl-plus`、`qwen-vl-max`、`qwen3-vl-plus` 或 `qwen3-vl-flash`；视觉 Key 留空时可以共用主 Key，但 `sk-sp` Coding Key 通常应单独配置支持视觉模型的普通百炼 Key。
- 完整 Key 只能保存到本机私有配置，例如 `data/ai-config.local.json` 或 Electron 用户数据目录。
- 前端只能显示 Key 尾号，不能回显完整 Key。
- `data/ai-config.local.json` 必须保持在 `.gitignore` 中。
- AI 调用失败时要给可操作诊断，例如 Key 错误、Base URL 不匹配、模型权限不足、网络不可达。

## 规则库规则

- 默认敏感词和品牌规则可以写在代码中作为基础规则，但用户启停状态和自定义规则只能写入本机私有配置。
- `data/compliance-rules.local.json` 必须保持在 `.gitignore` 中，不提交、不打印完整内容作为示例数据。
- 规则库接口是 `GET /api/compliance-rules`、`POST /api/compliance-rules`、`GET /api/compliance-rules/export`、`POST /api/compliance-rules/preview-import`、`POST /api/compliance-rules/import` 和 `POST /api/compliance-rules/rollback`。
- 自定义规则与默认规则按标准化词条合并；同名自定义规则可以覆盖默认规则。
- 规则库状态必须包含版本信息、`revisionHistory` 和 `snapshots`；保存、导入、重置、回滚等会改变规则语义的操作需要记录修订摘要，并在变更前生成轻量快照。
- 规则库快照只保存规则状态、自定义规则和默认规则禁用状态，不保存 API Key、Cookie、Token、登录态或原始授权文件内容；前端回滚必须调用 `POST /api/compliance-rules/rollback`。
- 导入规则前应调用 `POST /api/compliance-rules/preview-import` 展示新增、覆盖、平台/类目变化、品牌授权状态变化、品牌授权范围变化、覆盖移除和默认规则禁用变化，再让用户确认导入。
- 自定义规则支持 `platforms`、`categories` 范围字段；品牌规则还支持 `brandAuthorizationStatus`，取值包括 `risk`、`authorized`、`pending_review`、`forbidden`；品牌规则的 `brandScope` 只能保存授权品牌、渠道、地区、活动、有效期、凭证引用、复核人和备注等摘要字段，不能保存原始授权文件内容。
- 合规审核必须区分敏感词命中和品牌规则命中，并保留 `term`、`severity`、`replacement`、`note`、`kind`、`source`、`ruleId`、`brandAuthorizationStatus`、`brandScopeSummary`、`brandScopeWarnings` 等字段，方便后续审核留痕。
- 合规审核记录接口是 `GET /api/compliance-audits` 和 `GET /api/compliance-audits/export`。
- `data/compliance-audit-records.local.json` 必须保持在 `.gitignore` 中，不提交；记录只保存商品摘要、审核结果、命中词、检查项、规则快照和证据摘要，不保存 Key、Cookie、Token 或登录态。
- 规则库用于风险提示和人工复核辅助，不能生成规避平台审核、规避版权或规避广告法的方案。

## 授权凭证台账规则

- 授权凭证接口是 `GET /api/authorization-credentials`、`POST /api/authorization-credentials` 和 `GET /api/authorization-credentials/export`。
- `data/authorization-credentials.local.json` 必须保持在 `.gitignore` 中，不提交。
- 凭证台账只保存凭证名称、来源类型、平台/类目、关联商品、引用、审核人和时间等摘要，不保存原始截图/文件内容，不保存 Key、Cookie、Token、登录态或授权系统密码。
- 合规审核可以用台账匹配结果提示“已关联授权凭证”，但台账仍需人工复核，不能作为绕过平台审核、版权审核或广告法要求的依据。

## 素材版权台账规则

- 素材版权接口是 `GET /api/material-rights`、`POST /api/material-rights` 和 `GET /api/material-rights/export`。
- `data/material-rights.local.json` 必须保持在 `.gitignore` 中，不提交。
- 素材版权台账只保存素材名称、素材类型、来源类型、授权范围、平台/类目、关联商品、引用、附件引用、品牌授权范围、渠道/地域/活动范围、审核人、到期时间和登记时间等摘要，不保存原始图片、视频、音乐、字体文件、授权系统内容、Key、Cookie、Token 或登录态。
- 素材类型支持图片、视频、音乐、字体、肖像、Logo、产品拍摄和其他；来源类型支持自有制作、品牌素材库、商家授权、图库/素材库许可、达人/创作者授权、平台素材、代理商制作和其他。
- 合规审核可以用台账匹配结果提示“已关联素材版权台账”，外部素材或视觉风险需要证据但未匹配时应提示补齐台账。
- 素材版权台账用于证据留存和人工复核辅助，不能作为绕过平台审核、版权审核、肖像权审核或广告法要求的依据。

## 桌面应用规则

- Electron 需要用 `pathToFileURL()` 动态导入 ESM 服务端模块。
- 桌面版服务固定绑定并加载 `http://127.0.0.1:4173`，避免 Windows 上 `localhost` 解析到 IPv6 `::1` 时读到另一套开发服务配置。
- 桌面版运行数据必须写入 `app.getPath('userData')`，不要写入安装目录。
- Electron 窗口内只允许工作台本地地址导航；打开外部链接只能放行 `http:` 和 `https:`，禁止 `file:`、`javascript:`、`data:` 和自定义协议被传给 `shell.openExternal()`。
- Electron 默认拒绝页面权限申请，禁止附加 `webview`；下载只允许工作台本地地址和本地工作台页面创建的 `blob:` 导出。
- 本地 HTTP 服务需要保留基础安全响应头：`Content-Security-Policy`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer`、`X-Frame-Options: DENY` 和 `Permissions-Policy`；静态资源路径必须防止跳出 `public/`。
- 安装包输出目录是 `release/`，不要提交构建产物。
- Windows 打包配置入口是 `electron-builder.config.cjs`；默认 `npm.cmd run dist` 可生成未签名测试包，`npm.cmd run dist:signed` 会要求签名证书并在缺失时提前失败。
- 当前使用 Electron `42.4.0` 和 electron-builder `26.15.2`；electron-builder 26 的 Windows 证书主题和 SHA1 需要写入 `win.signtoolOptions`，不要把空的 `certificateSubjectName` / `certificateSha1` 直接放在 `win` 顶层。
- 代码签名证书只能通过环境变量传入，例如 `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` 或 `CSC_LINK` / `CSC_KEY_PASSWORD`，不要写入代码或文档。
- 当前本机尚未提供正式签名证书，默认安装包仍可能显示未知发布者；图标已接入代码，但安装包需要重新构建后才会更新。

## UI 规则

- 工作台是运营工具，不做营销落地页。
- 当前 UI 已按桌面运营工作台方向重构：左侧窄导航、顶部状态栏、数据源控制区、销量榜、中央商品预览、右侧指标和趋势图、下方创意生成/文案优化/素材洞察/投放建议（含合规审核）。
- 右侧主工作区当前按“商品预览/指标 -> 创意工作区 -> 批量任务”自适应堆叠，创意区和批量任务必须紧跟上方模块，不能被左侧列高度拖出大块空白。
- 当前已内置首次启动向导，并提供“新手向导”“导出目录”“插件目录”顶部快捷按钮。
- 当前已接入批量任务面板：商品卡可多选，批量生成会按“素材分析 -> 原创方案 -> 合规审核 -> 逐商品 JSON/批量报告包”执行；批量审核支持选中商品审核，也支持对历史批量生成方案做复审。
- 当前已接入批量任务取消、重试和归档；归档任务默认不显示，取消只停止排队项，运行中单项可自然结束。
- 当前已接入规则库编辑器：左侧控制区可切换敏感词/品牌词，启停默认规则，新增自定义规则，导入前预览差异、导出规则 JSON、维护平台/类目范围、维护品牌授权状态和品牌授权范围摘要，并支持版本快照回滚；合规审核会展示命中明细、品牌授权状态和范围匹配提示。
- 当前已接入审核留痕：投放建议中展示最近审核记录，审核完成和批量审核都会写入本机私有记录，可导出 JSON 归档。
- 当前已接入授权凭证台账：投放建议中可为当前商品登记授权凭证摘要，合规审核会自动匹配并展示关联凭证。
- 当前已接入素材版权台账：投放建议中可登记图片、视频、音乐、字体、肖像、Logo 和产品拍摄授权摘要，支持附件引用、到期提醒、品牌授权范围、渠道/地域/活动范围管理，合规审核和专业导出证据包会自动匹配。
- 当前已接入插件识别质量报告：读取插件数据后展示候选卡片、识别率、字段完整度、缺失字段样本和改进建议。
- 当前已接入创意结果质量控制：广告方案生成后展示质量分、等级、发布闸门、六个维度评分、优先处理项和改写简报，并随专业导出携带。
- 当前已接入视觉风险工作包：素材洞察会展示素材清单、素材可访问性、模型候选、风险证据卡、视频抽帧计划、证据截图留档、人工复核清单、风险矩阵、证据要求和重拍/替换简报；这些字段会随专业导出和证据包携带。
- 当前“导出方案”会生成专业交付包目录，包含 `plan.json`、`plan.md`、`review-checklist.csv` 和 `manifest.json`；导出包不包含 API Key、Cookie、Token、登录态或原始授权文件内容。
- “销量趋势”只能展示真实导入的历史字段，例如 `salesTrend`、`salesHistory`、`dailySales` 或 `trend`；没有这些字段时必须显示暂无历史销量数据，不能用模拟曲线冒充真实趋势。
- 信息密度可以高，但要保持可扫描、可滚动、不卡布局。
- 长 URL、长标题、来源信息必须截断或换行，不能撑破容器。
- 左侧控制区内容较多时必须保留上下滚动能力。
- 按钮文案要短，状态提示要能说明下一步。

## 批量任务规则

- 批量入口是 `POST /api/batch/jobs`，前端只能提交当前已选的授权商品快照，或提交历史批量生成任务的 `sourceJobId` 用于方案复审。
- 批量列表接口 `GET /api/batch/jobs` 支持 `q`/`keyword` 搜索、`status` 状态筛选和 `includeArchived=1`/`archived=1` 查看归档任务，响应需要包含 `queue` 队列容量元数据。
- 批量动作接口是 `POST /api/batch/jobs/:id/cancel`、`POST /api/batch/jobs/:id/retry` 和 `POST /api/batch/jobs/:id/archive`。
- 归档任务支持 `POST /api/batch/jobs/:id/restore` 恢复到归档前状态；旧归档任务没有归档元数据时按明细状态推断恢复状态；运行中任务被归档后，后台单项自然结束不能把任务状态改回 `completed`。
- 单个批量任务最多 50 个商品；同时排队/运行任务最多 6 个；待处理商品最多 160 件；每分钟最多创建 8 个批量任务，超限需要返回可操作错误提示。
- 批量任务状态写入本机 `data/batch-jobs.local.json` 或 Electron 用户数据目录；该文件必须保持在 `.gitignore` 中。
- 批量导出写入 `output/batch-runs/<jobId>/`，包含每个商品的 JSON、`summary.json` 结构化汇总、`batch-report.md` 可读报告、`batch-summary.csv` 表格总表和 `manifest.json` 文件清单。
- 批量失败项需要保留 `category`、`categoryLabel`、`stage`、`stageLabel`、`code`、`retryable`、`message` 和 `hint`，报告和 CSV 应展示错误分类与失败阶段，便于后续排查。
- 批量并发只能用于本地生成/审核任务，不得扩展为后台爬取、登录态采集、绕过风控或未授权素材下载。
- 批量生成结果仍必须是原创脚本、分镜、海报提示词和广告方案，不能搬运或复刻第三方素材。

## 后续优先级

1. 作废聊天中暴露过的阿里百炼 Key，重新生成并在工作台内保存新 Key。
2. 提供正式代码签名证书并完善发布安装体验。
3. 素材版权台账后续增强：附件引用上传体验、到期提醒筛选和品牌授权范围差异预览。
4. 规则库后续增强：版本快照对比、回滚前差异预览和品牌授权范围模板体验。
5. Edge 插件真实页面识别率继续调优：用真实授权页面补样本，沉淀到 `scripts/fixtures/edge-extension-products.html`，并用质量报告追踪字段完整度。
6. 批量任务后续增强：更细的失败原因、归档任务管理和批量报告筛选体验。
7. 视觉模型分析素材风险（已接入素材清单、素材可访问性、风险证据卡、视频抽帧计划、证据截图留档、模型候选和人工复核清单；继续优化真实视频抽帧执行、证据截图采集和模型候选排序）。
