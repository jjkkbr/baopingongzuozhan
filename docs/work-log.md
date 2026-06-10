# 工作日志

## 2026-06-09

### 规则库差异预览和版本回滚

继续补齐规则库后续增强，把“导入前先看差异、误操作可回滚、品牌词授权状态能进入审核提示”落到后端接口、前端规则库和验证脚本里。

已完成：
- 新增 `POST /api/compliance-rules/preview-import`，可在合并/覆盖导入前预览新增、覆盖、平台/类目变化、品牌授权状态变化、品牌授权范围变化、覆盖移除和默认规则禁用变化。
- 新增规则库 `snapshots`，保存、导入、重置、回滚前自动保留最近 12 个轻量快照；快照只保存规则状态、自定义规则和默认规则禁用状态，不保存 Key、Cookie、Token、登录态或原始授权文件。
- 新增 `POST /api/compliance-rules/rollback`，支持按快照版本回滚；覆盖导入时也会以导入前真实状态生成快照，避免丢失恢复点。
- 品牌规则新增 `brandAuthorizationStatus`，支持需复核、已授权、待复核、不可用；合规审核会根据状态输出不同风险提示，审核留痕保留该字段。
- 品牌规则新增 `brandScope`，只保存授权品牌、渠道、地区、活动、有效期、凭证引用等摘要，不保存原始授权文件内容。
- 合规审核会检查品牌授权平台/类目、登记品牌、有效期等范围风险，并在命中词和审核留痕中保留范围摘要和范围提醒。
- 前端规则库新增导入预览面板、版本快照列表、回滚按钮、品牌词授权状态选择框和品牌授权范围编辑字段。
- 导入预览明细新增逐条前后变化说明，能看到风险等级、替换建议、平台/类目、授权状态和品牌授权范围变化。
- 修复快照同版本去重策略：同一版本保留最新快照，避免重置/回滚后同版本旧快照影响恢复。
- `scripts/verify-ui.mjs` 新增导入预览、授权状态变化 diff、品牌授权范围变化 diff、快照生成、回滚恢复、品牌范围审核提示和新 UI 控件回归。

验证记录：
```powershell
node --check src\server.js
node --check public\app.js
node --check scripts\verify-ui.mjs
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

### 素材版权台账增强

继续完善素材版权证据能力，把“附件引用、到期提醒和品牌授权范围管理”落到素材版权台账、合规审核、专业导出和 UI 表单里。

已完成：
- 服务端素材版权记录新增 `attachmentRefs`、`brandScope`、`channelScope`、`regionScope`、`campaignScope`、`startsAt`、`expiresAt`、`expiryStatus`、`scopeSummary` 和 `scopeWarnings`。
- 素材版权台账仅保存附件编号、合同编号、网盘路径、截图编号、URL 等引用摘要，不保存原始图片、视频、音乐、字体文件、授权系统内容、Key、Cookie、Token 或登录态。
- 合规审核会识别素材授权已过期、即将到期、品牌授权待复核、有限授权、不可使用和登记品牌与当前商品不明显匹配等风险。
- 专业导出 `plan.md`、证据包和审核留痕会携带素材版权范围摘要、附件引用数量、品牌授权状态、到期状态和范围提醒。
- 前端“素材版权”表单新增附件引用、到期时间、品牌范围、品牌授权状态、渠道、地域和活动范围；台账卡片显示到期提醒、品牌状态、附件数量、范围摘要和警告。
- `scripts/verify-ui.mjs` 已补充素材版权增强字段回归，验证创建、审核匹配、导出和 UI 控件渲染。

验证记录：
```powershell
node --check src\server.js
node --check public\app.js
node --check scripts\verify-ui.mjs
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

## 2026-05-29

### Edge 插件真实页面识别率第三轮调优

围绕真实授权电商页面继续提升 Edge 插件识别率，仍只读取当前页面已渲染 DOM，不新增后台请求、自动翻页、登录态处理、验证码/风控绕过或未授权素材下载。

已完成：
- 扩展商品锚点：新增 `data-auction-id`、`data-offer-id`、`data-commodity-id`、`data-sku-code`、`data-gid` 等真实页面常见字段。
- 扩展商品链接：新增 `detail.1688.com/offer/`、`kwaixiaodian`、`youzan`、`/offer/`、`/commodity/` 等链接识别。
- 扩展标题来源：新增 `data-offer-title`、`data-commodity-title`、`data-subject` 和 offer/commodity 名称类节点。
- 扩展图片来源：新增 `data-image-url`、`data-img-url`、`data-cover-url`、`data-thumb`、`data-thumbnail`、`data-pic`、`data-pic-url`。
- 扩展价格和销量：支持 `data-promotion-price`、`data-price-cent`、售价/拿货价、采购/回购、次采购、人回购等表达。
- 扩展历史销量：支持 `data-series`、`data-statistics`、`data-sold-history` 等结构化趋势字段。
- 增加误识别抑制：广告位、直播入口、优惠券、会场入口和专题组件会被排除或降权。
- 本地 fixture 从 6 个商品样本扩展到 10 个，新增 1688 供货卡、快手/小店商品卡、商家后台表格行、紧凑货架卡，并增加直播入口和优惠券反例。
- 更新 `docs/edge-extension-compatibility-report.md`、`docs/project-summary.md`、`docs/handoff.md` 和 `README.md`。

验证记录：
```powershell
node --check edge-extension\popup.js
node --check scripts\verify-edge-extension.mjs
node scripts\verify-edge-extension.mjs
```

验证结果：本地 fixture 识别 10/10 个商品；广告位、直播入口、优惠券组件未被误识别；4 个商品包含真实 `salesTrend`。

### 视觉模型风险分析继续深化

继续把“视觉模型风险分析”从结论卡升级为可复核的工作包，重点补齐素材清单、抽帧计划、证据截图留档和模型候选，方便素材洞察、专业导出和人工审核统一读取。

已完成：
- 服务端 `visualRisk` 结构新增 `assetInventory`、`modelCandidates`、`riskEvidenceCards`、`videoFramePlan`、`evidenceSnapshots` 和 `manualReviewChecklist`。
- 视觉风险报告会自动把素材清单、风险证据卡、视频关键帧留档计划和人工复核清单汇总到同一份结果里，便于发布前复核。
- 专业方案导出 `plan.json`、`plan.md`、`review-checklist.csv` 和 `evidencePackage` 都同步携带新的视觉证据字段。
- 前端“素材洞察”新增素材清单、模型候选、风险证据卡、视频抽帧计划、证据截图留档和人工复核清单展示。
- `scripts/verify-ui.mjs` 新增视觉风险工作包回归：用内嵌视频/图片数据验证视觉风险 API 返回结构化字段。

验证记录：
```powershell
node --check src\server.js
node --check public\app.js
node --check scripts\verify-ui.mjs
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

验证结果：本地 UI/API 回归通过；视觉风险 API 返回 `assetInventory`、`modelCandidates`、`riskEvidenceCards`、`videoFramePlan`、`evidenceSnapshots` 和 `manualReviewChecklist`，前端主流程未受影响。

## 2026-05-27

### 素材版权台账基础版

继续完善爆品广告工作台的合规证据能力，先落地“素材版权台账基础版”，让图片、视频、音乐、字体、肖像、Logo 和产品拍摄授权摘要可以在本机登记、导出，并参与合规审核和专业交付包证据留存。

已完成：
- 新增本机私有台账文件 `data/material-rights.local.json`，已加入 `.gitignore`，不提交、不打印原始内容。
- 新增素材版权接口：`GET /api/material-rights`、`POST /api/material-rights`、`GET /api/material-rights/export`。
- 素材版权记录支持素材类型、来源类型、授权范围、平台/类目、关联商品、引用、审核人、到期时间和登记时间等摘要字段。
- “投放建议”新增“素材版权”面板，可为当前商品登记素材授权摘要，并可导出 JSON 台账。
- 合规审核已接入素材版权匹配：匹配成功时展示“已关联素材版权台账”；外部素材或视觉风险需要证据但未匹配时提示补齐版权台账。
- 审核留痕会保存素材版权匹配摘要；专业方案导出的 `evidencePackage` 和 `plan.md` 会携带匹配到的素材版权摘要。
- `scripts/verify-ui.mjs` 新增素材版权 API 回归：创建台账、审核匹配、导出 schema 均纳入自动验证。
- 修复批量任务归档竞态：运行中任务被归档后，后台处理自然结束不会再把任务状态覆盖回 `completed`。
- `scripts/verify-ui.mjs` 同步检查“投放建议”里的素材版权面板和字段是否实际渲染。

合规边界：
- 素材版权台账只保存摘要和引用，不保存原始图片、视频、音乐、字体文件或授权系统内容。
- 台账、导出包和审核留痕不保存 API Key、Cookie、Token 或登录态。
- 素材版权匹配仅用于风险提示、证据留存和人工复核辅助，不能作为绕过平台审核、版权审核、肖像权审核或广告法要求的依据。

验证记录：
```powershell
node --check src\server.js
node --check public\app.js
node --check scripts\verify-ui.mjs
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

## 2026-05-26

### 专业导出物增强

围绕“导出物更专业”补齐单品广告方案交付包，让导出结果不仅是机器可读 JSON，也能直接给运营、设计和审核人员阅读和复核。

已完成：
- `POST /api/export-plan` 改为生成目录化专业交付包，路径为 `output/ad-plans/<时间-商品名>/`。
- 导出包包含 `plan.json`、`plan.md`、`review-checklist.csv` 和 `manifest.json`。
- `plan.json` 保留完整结构化数据，包含商品、创意、质量控制、素材风险、合规审核、制作包和证据包。
- `plan.md` 生成可读方案书，包含交付结论、创意质量、原创广告方案、制作包、素材风险、合规审核和证据包。
- `review-checklist.csv` 汇总创意质量、素材风险、合规审核和证据留存项，方便人工复核或表格归档。
- 批量任务成功项的逐商品 JSON 改为复用专业方案结构，并附加批量任务上下文。
- 前端导出提示改为显示交付包目录和文件清单。

验证记录：
```powershell
node --check src\server.js
node --check public\app.js
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

接口验证：
- 已通过本地 API 导出样例商品交付包。
- 确认 `plan.json`、`plan.md`、`review-checklist.csv`、`manifest.json` 四个文件均已写入桌面版用户数据目录。

### 批量报告包导出增强

继续推进“导出物更专业”，把批量任务从单纯的逐商品 JSON 和 `summary.json` 升级为可交付的批量报告包。

已完成：
- 批量任务输出目录 `output/batch-runs/<jobId>/` 新增 `batch-report.md`、`batch-summary.csv` 和 `manifest.json`，并保留原有 `summary.json` 和逐商品 JSON。
- `summary.json` 的商品摘要新增创意质量快照和合规审核快照，方便后续系统读取。
- `batch-report.md` 汇总任务概览、结果统计、创意/合规均分、输出文件清单、商品明细、失败项和下一步建议。
- `batch-summary.csv` 提供运营筛选用总表，包含商品、平台、类目、状态、商品分、创意分、发布闸门、合规分、标题、CTA、输出文件和错误原因。
- `manifest.json` 记录批量报告包 schema、任务元数据、计数和文件清单，便于交接归档。
- 前端批量任务详情新增“汇总 / 报告 / 总表 / 清单”四类输出路径展示，并用自适应网格避免长路径撑破面板。

验证记录：
```powershell
node --check src\server.js
node --check public\app.js
```

接口验证：
- 使用临时用户数据目录和临时端口创建 2 个商品的批量生成任务，任务状态 `completed`，完成 2/2，失败 0。
- 确认输出目录包含 `summary.json`、`batch-report.md`、`batch-summary.csv`、`manifest.json` 和 2 个逐商品 JSON。
- 确认 `manifest.json` 的 schema 为 `ad-workbench.batch-export-bundle`，`batch-report.md` 包含“结果概览”，`batch-summary.csv` 包含 `creativeGate` 字段。

### 批量失败原因分类

继续补齐批量任务后续增强里的“更细失败原因”，让失败项不只显示一段错误文字。

已完成：
- `normalizeBatchError` 新增 `category`、`categoryLabel`、`stage`、`stageLabel`、`code`、`retryable` 字段。
- 错误分类覆盖队列限制、导出写入、网络连接、AI 配置、模型权限、平台接口、输入数据、合规审核和系统异常。
- 批量执行会标记素材分析、创意生成、合规审核、审核留痕、导出写入等失败阶段。
- `summary.json`、`batch-report.md` 和 `batch-summary.csv` 均携带错误分类、失败阶段、错误代码和是否建议重试。
- 前端批量详情失败项新增短标签，显示错误分类、失败阶段和“建议重试”。

验证记录：
```powershell
node --check src\server.js
node --check public\app.js
node --check desktop\main.cjs
```

接口验证：
- 使用临时用户数据目录制造导出路径异常，批量任务状态为 `failed`。
- 确认任务错误被归类为 `export_write` / `导出写入`，失败阶段为 `export` / `导出写入`，`retryable` 为 `true`。

### 批量报告筛选体验

继续补齐批量任务后续增强里的“批量报告筛选体验”，让大批量任务详情更容易定位商品和失败项。

已完成：
- 批量详情新增“商品筛选”“明细状态”“错误分类”三个控件。
- 商品筛选会匹配商品 ID、标题、店铺、类目、状态、错误分类、失败阶段、错误信息和输出文件名。
- 明细状态可筛选待处理、处理中、完成、失败和已取消。
- 错误分类会根据当前任务失败项动态生成选项，并显示当前匹配数量。
- 窄屏下筛选栏自动改为单列，避免挤压批量明细。

验证记录：
```powershell
node --check src\server.js
node --check public\app.js
node --check desktop\main.cjs
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

页面验证：
- 桌面版已重启，批量详情筛选栏可见。
- 浏览器检查确认 `batchDetailSearch`、`batchDetailStatus`、`batchDetailCategory` 均已渲染，状态选项和匹配计数正常。

### 归档任务管理增强

继续补齐批量任务后续增强里的“归档任务管理”，避免任务误归档后只能查看、不能恢复。

已完成：
- 新增 `POST /api/batch/jobs/:id/restore`，归档任务可恢复到常规列表。
- 归档时保存 `archiveMeta.previousStatus` 和 `archivedAt`；恢复时优先使用归档前状态。
- 旧归档任务没有归档元数据时，会按明细状态推断恢复为失败、已取消或已完成。
- 前端归档任务卡新增“恢复”按钮；从“已归档”筛选恢复后会自动切回“全部”列表，方便看到恢复结果。
- 验证脚本补充归档恢复回归。

验证记录：
```powershell
node --check src\server.js
node --check public\app.js
node --check scripts\verify-ui.mjs
node --check desktop\main.cjs
```

接口验证：
- 使用临时用户数据目录创建批量审核任务，执行取消 -> 归档 -> 恢复。
- 确认归档后默认列表隐藏，恢复后状态回到 `cancelled` 且默认列表重新可见。

## 2026-05-25

### 创意结果质量控制

围绕“创意结果质量控制”补齐生成后的质量闸门，让广告方案不只输出文案，还能说明是否可进入复核、哪里需要改写。

已完成：
- 服务端创意质量报告升级为 `ad-workbench.creative-quality`，新增总分、等级、状态标签、发布闸门、六个维度评分和改写简报。
- 质量维度包含卖点覆盖、结构完整、原创生产、证据链、合规闸门和表达可读。
- 低分或警告项会生成 `improvementTips` 和 `rewriteBrief`，用于提示必须补充的证据、原创生产要求、CTA 或素材替换动作。
- 前端“文案优化/广告方案输出”顶部新增“创意质量控制”面板，展示总分、等级、维度条、优先处理项和改写简报。
- 导出方案继续携带创意质量报告，投放建议摘要会引用质量分和下一步动作。

验证记录：
```powershell
node --check src\server.js
node --check public\app.js
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

页面验证：
- 本地页面点击“生成广告方案”后，质量面板正常显示。
- 验证结果显示质量面板可见，6 个维度条、优先处理项和改写简报均已渲染。

### 视觉分析结果继续细化

围绕“素材风险分析继续细化”补强视觉分析输出，让结果不只显示风险等级，还能说明素材地址、证据、复核重点和重拍动作。

已完成：
- 服务端视觉分析新增素材地址可访问性检查，返回 `assetAccess`，包含可访问状态、HTTP 状态、内容类型、大小摘要和处理建议。
- 视觉模型成功返回后新增 `localPrecheck` 和 `precheckComparison`，用于展示本地预检与视觉模型判断的差异。
- 视觉风险报告继续保留 `riskMatrix`、`evidenceRequired`、`reshootBrief` 和 `reviewFocus`，并补充重拍交付物和复核清单。
- 前端“素材洞察”视觉风险卡片新增素材可访问性、本地预检差异、风险矩阵、复核重点、证据要求和重拍/替换简报。
- 移动端/窄屏下视觉矩阵、差异行和重拍简报会自动改为单列，避免撑破面板。

验证记录：
```powershell
node --check src\server.js
node --check public\app.js
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

页面验证：
- 本地页面触发普通“分析素材”后，视觉风险卡片可正常渲染风险矩阵和重拍简报。
- 桌面版已重启，当前 `127.0.0.1:4173` 加载的是最新代码。

### AI 配置拆分和视觉模型独立配置

围绕“Key 能连接但视觉模型不匹配”的问题，把文案/Coding 模型和视觉模型从同一套配置中拆开。

已完成：
- 服务端 `data/ai-config.local.json` 兼容新增 `visualBaseUrl`、`visualModel` 和 `visualApiKey`，旧配置仍可继续读取。
- 视觉分析 `POST /api/analyze-visual-risk` 改用独立视觉配置，默认走 `https://dashscope.aliyuncs.com/compatible-mode/v1` 和 `qwen-vl-plus`，不再自动尝试账号模型列表里没有的 `qwen3.6-plus`。
- 前端“大模型设置”新增“视觉模型”区域，可单独填写视觉 Base URL、视觉模型、视觉 Key，并提供“测视觉”连接测试。
- 新增 `POST /api/ai-config/test-visual`，主模型测试和视觉模型测试分开返回诊断。
- 视觉模型下拉增加 `qwen-vl-plus`、`qwen-vl-max`、`qwen3-vl-plus`、`qwen3-vl-flash`。
- README、AGENTS、项目总结和交接文档已同步新的配置规则。

验证记录：
```powershell
node --check src\server.js
node --check public\app.js
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

页面验证：
- 桌面版已重启，`http://127.0.0.1:4173` 可见视觉模型配置区域。
- 浏览器检查确认 `visualAiBaseUrl`、`visualAiModel`、`visualAiApiKey`、`testVisualAiConfigBtn` 等控件均已渲染。

### 批量任务高并发限流、搜索和归档查看

围绕“大批量处理稳定性”补齐批量任务队列保护和检索能力。

已完成：
- 服务端批量任务新增三层限流：单任务最多 50 件商品、同时排队/运行任务最多 6 个、待处理商品最多 160 件，并限制每分钟最多创建 8 个批量任务。
- `GET /api/batch/jobs` 支持 `q`/`keyword` 搜索、`status` 状态筛选、`includeArchived=1`/`archived=1` 查看归档任务，并返回 `queue` 队列容量元数据。
- 前端批量任务面板新增“任务搜索”“状态”“含归档”控件和队列容量提示，可查看待处理件数、任务积压和创建剩余额度。
- 批量生成/审核按钮会根据已选商品数和队列容量自动禁用，避免一次提交过大任务或在队列拥堵时继续堆积。
- 归档任务默认不显示，勾选“含归档”或筛选“已归档”后可重新查找；已归档任务不再重复显示归档按钮。
- `scripts/verify-ui.mjs` 增加回归：超大批量被 400 拦截、归档任务可搜索、默认列表不显示归档任务、批量筛选控件正常渲染。

验证记录：
```powershell
node --check src\server.js
node --check public\app.js
node --check scripts\verify-ui.mjs
node --check edge-extension\popup.js
node --check desktop\main.cjs
node scripts\verify-edge-extension.mjs
node scripts\verify-ui.mjs http://127.0.0.1:4198
```

后续继续：
- 补更细的批量失败原因、任务归档管理和批量报告筛选体验。
- 继续用真实授权页面完善插件样本和质量报告字段完整度。

## 2026-05-23

### 授权凭证台账

继续推进合规闭环，把“授权凭证台账”从待办补成可用功能。

本轮完成：

- 新增本机私有台账文件 `data/authorization-credentials.local.json`，已加入 `.gitignore`，不提交。
- 新增授权凭证接口：`GET /api/authorization-credentials`、`POST /api/authorization-credentials`、`GET /api/authorization-credentials/export`。
- 前端“投放建议”新增“授权凭证”面板，可为当前商品登记商家后台导出、官方开放平台、页面截图、达人/商家授权、内部投放数据或授权文件摘要。
- 合规审核会自动匹配当前商品的授权凭证，匹配成功时显示“已关联授权凭证”，未匹配时继续提示补齐凭证台账。
- 台账只保存凭证名称、类型、平台/类目、关联商品、引用、审核人和时间等摘要，不保存截图/文件原文，也不保存 API Key、Cookie、Token 或登录态。
- `scripts/verify-ui.mjs` 新增授权凭证 API 回归：创建凭证、审核匹配、导出 JSON 和前端面板渲染。

验证记录：

```powershell
node --check src\server.js
node --check public\app.js
node --check scripts\verify-ui.mjs
node --check edge-extension\popup.js
node --check desktop\main.cjs
node scripts\verify-edge-extension.mjs
node scripts\verify-ui.mjs http://127.0.0.1:4196
```

验证结果：

- 临时新版服务端口 `4196` 的 UI/API 回归通过：商品卡 10 个，图片 14/14 加载成功，控制台无错误。
- 授权凭证 API 回归通过：可创建凭证、合规审核可匹配 `credentialMatches`、凭证台账可导出 `ad-workbench.authorization-credentials` JSON。
- 浏览器实测通过：打开“投放建议”后可见“授权凭证”面板；登记“浏览器验证后台导出”后显示“当前商品已关联 1 条凭证”，控制台无错误。
- 插件本地验证仍通过：识别 6/6 个测试商品，其中 2 个商品包含真实 `salesTrend`。

后续继续：

- 素材版权台账和品牌授权范围管理仍可继续补齐。
- 凭证附件上传、凭证搜索和凭证过期提醒可以作为下一轮增强。

### 历史销量导入、批量任务、规则分组和插件质量报告

按“历史销量 CSV/API 导入增强 -> 批量任务取消/重试/归档 -> 规则库版本化和平台/类目分组 -> 插件识别质量报告”的顺序完成一轮基础闭环。

已完成：

- 新增 `POST /api/import/sales-history`，支持把授权 CSV 或 API JSON 中的历史销量按 `id`、`productId`、`sku`、`title` 等字段合并到当前商品列表。
- 历史销量导入支持两类格式：商品行内 `salesTrend/salesHistory/dailySales/trend` 数组，以及 `productId,date,sales` 这种日销量明细表。
- 前端授权数据导入区新增“导入历史销量”按钮；不会用当前销量倒推趋势，只合并真实导入的历史字段。
- 批量任务新增动作接口：`POST /api/batch/jobs/:id/cancel`、`POST /api/batch/jobs/:id/retry`、`POST /api/batch/jobs/:id/archive`。
- 前端批量任务列表新增“重试”“归档”，任务详情对排队/运行中任务提供“取消任务”。
- 规则库保存和导入会自动递增版本，并记录 `revisionHistory`；审核留痕中的规则快照也保留版本和修订记录。
- 自定义敏感词/品牌词支持 `platforms` 和 `categories` 适用范围；审核时只命中适用于当前商品平台/类目的规则。
- 前端规则新增/编辑区域补充“平台范围”“类目范围”输入，支持用逗号分隔。
- Edge 插件导入结果新增 `qualityReport`，统计候选卡片数、识别商品数、字段完整度、缺失字段样本和改进建议。
- 前端读取插件数据后展示“插件识别质量”面板，方便判断标题、价格、销量、店铺、主图、素材、历史销量和来源链接的覆盖率。
- `scripts/verify-ui.mjs` 新增 API 回归：历史销量合并、规则版本与范围过滤、批量取消/重试/归档、插件质量报告。

验证记录：

```powershell
node --check src\server.js
node --check public\app.js
node --check scripts\verify-ui.mjs
node --check edge-extension\popup.js
node --check desktop\main.cjs
node scripts\verify-edge-extension.mjs
node scripts\verify-ui.mjs http://127.0.0.1:4194
```

验证结果：

- 临时新版服务端口 `4194` 的 UI/API 回归通过：商品卡 10 个，图片 14/14 加载成功，控制台无错误。
- 插件本地验证通过：识别 6/6 个测试商品，其中 2 个商品包含真实 `salesTrend`。
- 当前 4173 如仍是旧运行进程，需要重启本地服务或桌面版后才能使用新增接口和前端按钮。

后续继续：

- 历史销量导入可继续增加文件选择器和模板下载。
- 批量任务大批量限流、任务搜索和归档查看已在 2026-05-25 补齐，后续继续补更细的失败原因和处理报告。
- 规则范围后续可继续扩展到更细的品牌授权范围；规则差异预览和版本回滚已在 2026-06-09 补齐。
- 插件质量报告需要继续用真实授权页面沉淀失败样本，提高字段完整度。

### Edge 插件历史销量读取增强

针对“插件获取不到历史销量数据”的问题完成链路排查和合规增强。

结论：工作台导入端和前端趋势图已经支持 `salesTrend`、`salesHistory`、`dailySales`、`trend` 等真实历史字段；问题主要在 Edge 插件此前只读取当前页面 DOM 中的商品标题、价格、当前销量、店铺和素材信息，没有提取历史销量字段。

已完成：

- 在 `edge-extension/popup.js` 中新增 `salesTrend` 输出字段，插件导入商品时会把可识别的真实历史销量数组一起发送到工作台。
- 新增 `extractSalesTrend()` 解析逻辑，只读取当前商品卡片 DOM 中已渲染的趋势属性、趋势表或图表可访问标签。
- 支持识别 `data-sales-trend`、`data-sales-history`、`data-daily-sales`、`data-trend`、`data-volume-trend`、`data-chart-data` 等页面已有字段。
- 支持解析可见的日期销量文本、趋势图 `aria-label/title`、结构化 JSON 数组和对象数组。
- 保持合规边界：不后台抓取、不访问隐藏接口、不处理登录态、不绕过平台限制、不用当前销量倒推或模拟历史曲线。
- 更新 `scripts/fixtures/edge-extension-products.html`，为本地验证样本补充真实趋势字段。
- 更新 `scripts/verify-edge-extension.mjs`，新增至少一个商品必须包含真实 `salesTrend` 的断言。

验证记录：

```powershell
node --check edge-extension\popup.js
node --check scripts\verify-edge-extension.mjs
node --check src\server.js
node --check public\app.js
node scripts\verify-edge-extension.mjs
```

验证结果：本地 Edge 插件验证通过，仍识别 6/6 个测试商品；其中 2 个商品可读取真实 `salesTrend`，其余没有历史字段的商品保持空数组，不会生成模拟趋势。

后续提醒：

- 修改插件后需要到 `edge://extensions/` 中对“爆品工作台采集助手”执行一次“重新加载”，浏览器才会使用新版本插件。
- 如果真实电商页面没有渲染历史销量字段，工作台仍会显示“暂无历史销量数据”；这种情况需要使用商家后台导出、开放平台 API 或授权 CSV/HTML 中的历史销量字段来补充。

### Edge 插件兼容性第二轮调优

围绕“真实电商页面识别率调优”继续推进，在不突破合规边界的前提下增强当前页 DOM 商品卡识别能力。

已完成：

- 增强插件候选卡片发现：补充京东式 `item.jd.com` / `data-sku` / `data-ware-id`，拼多多式 `goods.html?goods_id=` / `data-goods-id`，小红书/内容电商式 `/goods/` / `data-product-id` / `data-name` 等信号。
- 增强标题提取：支持 `data-name`、`data-item-title`、`data-product-title`、`data-goods-title` 和更多标题/描述类节点，降低价格、销量、店铺文案污染标题的概率。
- 增强图片读取：支持 `data-lazyload`、`data-actualsrc`、`data-imgurl`、`data-cover`、`data-poster`、背景图和 CSS 变量背景图；过滤 `data:`、`file:`、`blob:`、`javascript:` 等不可用素材地址。
- 增强价格和销量读取：支持拆分价格节点、券后价、活动价、已拼、卖出、单已售、笔成交等表达。
- 插件商品快照保留 `mediaItems`，用于工作台素材缩略图预览切换。
- 扩展本地 fixture 到 6 类结构：淘宝式、抖音式、通用商品链接、京东式、拼多多式、小红书/内容电商式。
- 新增兼容性适配报告：`docs/edge-extension-compatibility-report.md`。

验证记录：

```powershell
node --check edge-extension\popup.js
node --check scripts\verify-edge-extension.mjs
node scripts\verify-edge-extension.mjs
```

验证结果：识别 6/6 个测试商品，均包含标题、价格、销量、店铺、主图和 `mediaItems`；广告位未被误识别。

后续继续：

- 用真实授权页面补充匿名化失败样本。
- 为 fixture 增加误识别样本区，例如店铺头图、直播入口、优惠券组件、专题广告卡。
- 按授权样本统计召回率、误识别率和字段完整率。

### 规则库导入导出和审核留痕

继续完善合规规则库，把规则迁移和审核证据归档补成可用功能。

已完成：

- 新增规则库导出接口 `GET /api/compliance-rules/export`，导出 JSON 规则包，包含自定义规则、禁用默认规则、摘要和生效规则，不包含 Key、Cookie、Token 或登录态。
- 新增规则库导入接口 `POST /api/compliance-rules/import`，支持 `merge` 合并导入和 `replace` 覆盖导入。
- 前端规则库工具栏新增“导入规则”“导出规则”，导入时可选择合并或覆盖。
- 新增本机审核记录文件 `data/compliance-audit-records.local.json`，已加入 `.gitignore`。
- 合规审核和批量审核都会写入审核留痕，记录商品摘要、审核分数、命中词、检查项、规则快照和素材证据摘要。
- 新增审核记录接口 `GET /api/compliance-audits` 和 `GET /api/compliance-audits/export`。
- 投放建议面板新增“审核留痕”区域，展示最近审核记录，并支持导出 JSON 归档。
- `scripts/verify-ui.mjs` 新增接口验证：规则导出、临时规则导入、审核命中、审核记录生成、审核记录导出。

验证记录：

```powershell
node --check src\server.js
node --check public\app.js
node --check scripts\verify-ui.mjs
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

验证结果：规则导出 schema 正常，临时规则可合并导入并命中审核；审核接口返回留痕记录，审核记录可导出。验证产生的临时规则已重置，临时审核记录已清理。

## 2026-05-21

### 今日目标

接着昨天未完成的“自定义敏感词和品牌规则”继续推进，把规则库做成可保存、可编辑、可参与合规审核的基础版，并把进度同步到项目文档。

### 已完成

- 新增本机规则库配置：`data/compliance-rules.local.json` 用于保存禁用的默认规则和用户自定义规则，已加入 `.gitignore`，不提交本机规则数据。
- 新增默认规则库：内置 14 条敏感/广告法风险词和 8 条品牌/素材风险规则，作为合规审核的基础规则。
- 新增规则库接口：`GET /api/compliance-rules` 返回默认规则、自定义规则和生效规则；`POST /api/compliance-rules` 保存启停状态和自定义规则。
- 合规审核已接入合并后的规则库：默认规则和自定义规则会按标准化词条合并，自定义同名规则可覆盖默认规则。
- 审核结果现在区分敏感词命中和品牌规则命中，并在 `audit.flaggedTerms` 中返回 `term`、`severity`、`replacement`、`note`、`kind`、`source`、`ruleId` 等字段。
- 前端左侧控制区新增“敏感词与品牌规则”编辑器：支持敏感词/品牌词切换、默认规则启停、自定义规则新增、保存、重置。
- 合规审核卡片新增“规则命中”列表，便于运营人员看到命中的词条、规则类型和是否来自自定义规则。
- UI 自动验证脚本已补充规则库检查：会确认默认规则渲染、规则库状态和页面无控制台错误。

### 验证记录

已运行并通过：

```powershell
node --check src\server.js
node --check public\app.js
node --check desktop\main.cjs
node --check scripts\verify-ui.mjs
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

补充验证：

- 通过接口临时新增 `测试禁词`，确认合规审核能命中自定义敏感词。
- 烟测完成后已将规则库重置为默认状态。
- 当前规则库摘要：默认敏感词 14 条，默认品牌规则 8 条，自定义规则 0 条，生效规则 22 条。
- UI 验证通过：商品卡 10 个，图片 17/17 加载成功，规则库状态显示 `生效 22`，控制台无错误。

### 仍待

- 规则库导入/导出，便于不同电脑或团队之间同步。
- 审核记录留痕：记录当次审核使用的规则版本、命中证据、审核人和时间。
- 按平台、类目、品牌授权范围分组管理规则，并支持规则说明模板。
- 批量任务继续补取消、重试、任务归档和大批量限流。
- 继续用真实授权页面调优 Edge 插件识别率。

### Edge 插件识别率调优

在“Edge 插件真实页面识别率调优”方向上完成第一轮基础优化：

- 插件发送地址优先使用 `http://127.0.0.1:4173`，失败后再回退 `http://localhost:4173`，避免 Windows 上 `localhost` 命中另一套服务配置。
- 商品卡识别从单纯扫描 `item/product/goods` 类名，升级为“商品链接/图片/数据属性作为锚点 -> 向上寻找卡片容器 -> 评分筛选”的流程。
- 新增识别信号：`data-item-id`、`data-goods-id`、`data-product-id`、`data-e2e`、`data-testid`、商品详情链接、懒加载图片、`srcset`、背景图、`aria-label`、`title`、图片 `alt`。
- 优化标题、店铺、价格、销量提取，减少价格/销量/店铺粘到标题里的情况，支持 `月售`、`人已买`、`件已售`、`累计销量` 等表达。
- 插件导入商品会带上来源提示，提醒后续发布前保留授权记录或后台截图。
- 新增 `scripts/verify-edge-extension.mjs` 和 `scripts/fixtures/edge-extension-products.html`，用本地模拟页面验证三类常见卡片结构，不需要访问真实平台页面。

验证记录：

```powershell
node --check edge-extension\popup.js
node --check scripts\verify-edge-extension.mjs
node scripts\verify-edge-extension.mjs
```

验证结果：识别出 3/3 个测试商品，标题、价格、销量、店铺和图片均正常，广告位未被误识别为商品。

### 文案优化区调整

- 将原来的 `广告方案` 输出模块迁移到“文案优化”标签页内，右侧独立输出卡片改为在创意工作区中切换显示。
- 生成广告方案后会自动切到“文案优化”，方便直接查看口播、字幕、版式和导出 JSON。
- 同步更新了页面验证脚本，新增对“文案优化”面板激活状态的检查。

### 素材洞察区调整

- 将原来的 `AI 洞察` 主面板合并进“素材洞察”标签页，避免创意工作区里出现两个洞察入口。
- “分析素材”和“视觉分析”完成后都会自动切到“素材洞察”，其中 `AI 洞察` 作为结果卡片展示。
- 同步更新 README、项目摘要、交接文档和 AGENTS 里的 UI 说明。

### 投放建议区调整

- 将原来的独立 `合规审核` 面板迁移到“投放建议”标签页内。
- 点击创意区的“合规审核”按钮会自动切到“投放建议”，审核结果、分数和命中明细集中展示。
- 左侧导航的“审核”入口也会切到投放建议面板。

### 右侧主工作区布局调整

- 新增 `workspace-main` 右侧主工作区容器，将商品预览、商品指标、创意工作区和批量任务放在同一个自适应堆叠区内。
- 创意工作区现在会紧跟商品预览/指标下方，批量任务会紧跟创意工作区下方，避免被左侧控制区和销量榜高度撑出大块空白。
- 页面验证脚本新增布局断言，确认预览到创意区、创意区到批量任务的间距保持在紧凑范围。

### 今日补记

- 将 `合规审核` 收进“投放建议”标签页，并保留从创意区按钮与左侧导航进入的路径。
- 将右侧主工作区改成自适应堆叠布局，创意工作区与批量任务会按顺序紧跟上方模块。
- 同步更新了 `README.md`、`docs/project-summary.md`、`docs/handoff.md`、`AGENTS.md` 和页面验证脚本，便于后续交接与回归检查。
- 已通过 `node --check public\\app.js`、`node --check scripts\\verify-ui.mjs`、`node --check desktop\\main.cjs` 和 `node scripts\\verify-ui.mjs http://127.0.0.1:4173`。

## 2026-05-20

### 今日目标

围绕“代码签名和安装体验”“批量生成/审核”“视觉模型分析素材风险”继续推进：先把 Windows 打包流程改成可接入证书的配置化构建，再补齐批量任务和视觉风险分析的基础闭环。

### 已完成

- 新增 `electron-builder.config.cjs`：作为 Windows 打包配置入口，复用 `package.json` 中的基础构建配置，并集中处理签名和安装器选项。
- 更新打包脚本：`npm.cmd run pack` 和 `npm.cmd run dist` 已切换到新的构建配置文件。
- 新增签名构建脚本：`npm.cmd run dist:signed` 会设置 `CODE_SIGNING_REQUIRED=1`，如果没有签名证书会提前失败并给出明确提示。
- 预留代码签名环境变量：支持 `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` 或 `CSC_LINK` / `CSC_KEY_PASSWORD`；也预留 `WIN_CSC_CERTIFICATE_SUBJECT_NAME` 和 `WIN_CSC_CERTIFICATE_SHA1` 给本机证书或 EV 证书场景。
- 优化安装器体验：安装包和卸载器使用统一应用图标，设置开始菜单分类、卸载显示名、运行完成后启动应用，并保留可选择安装目录的辅助安装模式。
- 新增 `build/installer.nsh`：为 NSIS 安装器补充欢迎页，并为卸载器补充中文卸载欢迎页。

### 验证记录

已运行并通过：

```powershell
node --check electron-builder.config.cjs
node --check desktop\main.cjs
node --check src\server.js
node --check public\app.js
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm.cmd run dist
```

构建结果：

- electron-builder 已从 `electron-builder.config.cjs` 加载配置。
- `release/爆品广告工作台 Setup 0.1.0.exe` 已重新生成。
- `release/win-unpacked/爆品广告工作台.exe` 已重新生成。
- `Get-AuthenticodeSignature` 显示当前安装包仍为 `NotSigned`，原因是本机尚未提供正式代码签名证书。
- 已验证 `npm.cmd run dist:signed` 在未提供证书时会提前报错，避免误以为产物已签名。

### 仍待

- 采购或提供 Windows 代码签名证书后，设置签名环境变量并运行 `npm.cmd run dist:signed`。
- 签名后使用 `Get-AuthenticodeSignature release\爆品广告工作台 Setup 0.1.0.exe` 确认状态为 `Valid`。
- 后续可继续补版本号策略、发布说明和自动更新。

### 批量任务追加

在“批量生成和批量审核”方向上完成基础版：

- 新增服务端批量任务队列：`POST /api/batch/jobs` 可创建批量生成或批量审核任务，`GET /api/batch/jobs` 可返回最近任务和状态。
- 批量生成流程复用单品能力，按“素材分析 -> 原创广告方案 -> 合规审核 -> 单品 JSON/汇总 JSON”执行。
- 批量审核支持两种来源：当前多选商品审核，以及对历史批量生成任务发起“方案复审”。
- 批量任务状态保存到本机 `data/batch-jobs.local.json`，导出写入 `output/batch-runs/<jobId>/`，包含每个商品文件和 `summary.json`。
- 前端新增商品卡多选、全选/清空、批量任务面板、任务历史、详情列表、复审方案按钮和状态轮询。
- `.gitignore` 已新增 `data/batch-jobs.local.json`，避免本机任务记录进入提交。

验证记录：

```powershell
node --check src\server.js
node --check public\app.js
node --check desktop\main.cjs
node scripts\verify-ui.mjs http://127.0.0.1:4284
```

补充验证：

- 使用临时用户数据目录启动测试服务，创建 2 个商品的批量审核任务，任务完成且 2/2 成功，生成 `summary.json`。
- 使用浏览器验证工作台：全选 10 个商品后批量审核 10/10 完成；批量生成 10/10 完成；从历史生成任务发起“方案复审”后 10/10 完成。

### 视觉模型分析素材风险

在“视觉模型分析素材风险”方向上完成基础版：

- 新增 `POST /api/analyze-visual-risk`，可对图片和视频素材做视觉复核，返回水印、字幕、主体、场景、镜头切换、品牌 logo、画面文字、风险等级和证据。
- `POST /api/analyze-media` 继续作为文本分析主流程，默认只做文本分析和本地视觉预检；视觉模型通过独立入口按需触发，避免常规分析变慢。
- 前端素材洞察区新增“视觉分析”按钮和视觉风险卡片，展示风险等级、可见证据、处理建议和模型诊断。
- 投放建议区改为承载合规审核结果，支持从创意区和左侧导航直接进入。
- 合规审核已联动视觉结果，水印、品牌标识、画面文字和视觉模型失败诊断会进入审核提示。
- 视觉模型调用失败时会返回可操作诊断，例如模型不支持视觉输入、Base URL/网络不可达、素材 URL 无法访问。

验证记录：

```powershell
node --check src\server.js
node --check public\app.js
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

补充验证：

- 直接调用 `POST http://127.0.0.1:4173/api/analyze-visual-risk`，确认返回 `watermark`、`subtitle`、`subject`、`scene`、`shotChange`、`brandLogo`、`onScreenText` 等结构化字段。
- 页面验证通过：商品卡 10 个，图片 17/17 加载成功，控制台无错误，截图输出到 `output-screenshot.png`。
- 当前本机 AI 视觉调用仍返回“无法连接到模型服务”诊断，但前端会保留本地视觉预检和明确错误提示。

### 桌面启动记录

- 已通过 `npm.cmd run desktop` 启动开发桌面版，主进程为 `electron.exe`，PID `6940`。
- 桌面版使用 `C:\Users\123\AppData\Roaming\爆品广告工作台` 作为用户数据目录，并加载 `http://127.0.0.1:4173`。
- 启动前确认 4173 端口已有本项目服务监听，桌面版复用健康服务，没有改回不确定的 `localhost`。

## 2026-05-19

### 今日目标

围绕桌面版“爆品广告工作台”的可用性收尾：修复 AI 连接配置问题、优化工作台 UI、接入正式图标、纠正销量趋势的数据真实性、修复创意区文字错位，并重新打包验证桌面版。

### 已完成

- 梳理并确认项目边界：项目继续保持“授权数据 + 原创广告方案 + 合规审核”的定位，不扩展为未授权爬虫或素材搬运工具。
- 修复桌面端 AI 连接路径问题：桌面版固定绑定并加载 `http://127.0.0.1:4173`，避免 Windows 上 `localhost` / `::1` 命中另一套开发服务配置。
- 确认阿里百炼 Key 组合：`sk-sp` 套餐专属 Key 需要搭配 `https://coding.dashscope.aliyuncs.com/v1` 和 `qwen3-coder-plus`；普通 DashScope 兼容地址不适合该 Key。
- 完善 AI 配置记忆：页面可保存 Base URL、模型、超时和 Key，本地只显示 Key 尾号，完整 Key 保存在本机私有配置中。
- 参考用户提供的工作台截图重构 UI：形成左侧窄导航、顶部状态栏、数据源控制区、销量榜、商品预览、指标面板、创意生成、AI 洞察、合规审核和广告方案输出的桌面运营布局。
- 新增首次启动向导：覆盖配置 AI Key、安装 Edge 插件、导入授权商品、生成并审核四步流程。
- 新增顶部快捷按钮：“新手向导”“导出目录”“插件目录”；目录打开 API 只允许固定目录，不接受任意路径。
- 接入用户提供的正式图标：用于前端品牌图标、favicon、Electron 窗口图标和 Windows 打包图标。
- 修正“销量趋势”逻辑：只在商品数据真实提供 `salesTrend`、`salesHistory`、`dailySales` 或 `trend` 字段时绘图；没有历史字段时显示“暂无历史销量数据 / 无历史”，不再用模拟曲线冒充真实趋势。
- 修复创意区文字错位：当工作台宽度变窄时，`AI 洞察`不再与“分析素材 / 生成广告方案 / 合规审核”按钮挤压重叠，创意生成和 AI 洞察会按面板宽度自动上下排列。
- 重新打包并启动桌面版，当前 `release/` 产物已包含上述修复。

### 关键改动文件

- `src/server.js`：本地服务、AI 配置、目录打开 API、商品趋势字段归一化。
- `public/index.html`：工作台结构、首次启动向导、顶部快捷入口。
- `public/styles.css`：桌面工作台视觉样式、响应式布局、创意区错位修复。
- `public/app.js`：前端状态、AI 设置、真实销量趋势渲染、向导和目录按钮逻辑。
- `desktop/main.cjs`：Electron 桌面壳、固定 `127.0.0.1:4173`、正式图标、用户数据目录。
- `public/assets/app-icon.png`、`desktop/assets/icon.ico`、`build/icon.ico`：正式图标资源。
- `docs/project-summary.md`、`docs/handoff.md`、`AGENTS.md`：项目总结、交接信息和长期开发规则。

### 验证记录

已运行并通过：

```powershell
node --check src\server.js
node --check public\app.js
node --check desktop\main.cjs
node scripts\verify-ui.mjs http://127.0.0.1:4173
```

创意区错位修复额外验证：

- 在 1280px 宽度下测量打包版 `http://127.0.0.1:4173`。
- `ops-grid` 已切换为单列。
- `tool-row` 为可换行 flex 布局。
- `AI 洞察`面板位于创意生成面板下方，不再覆盖按钮行。

打包验证：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm.cmd run dist
```

产物：

- `release/爆品广告工作台 Setup 0.1.0.exe`
- `release/win-unpacked/爆品广告工作台.exe`

### 注意事项

- 聊天中曾暴露过阿里百炼 Key，仍建议作废并重新生成，再在工作台内保存新 Key。
- `data/ai-config.local.json` 和 Electron 用户数据目录中的 AI 配置可能包含真实 Key，不要提交或打印。
- 当前安装包未签名，Windows 仍可能提示未知发布者。
- `release/` 是构建产物目录，后续改 UI、图标或桌面壳后需要重新运行 `npm.cmd run dist`。

### 下一步建议

1. 作废旧 Key 并换新保存。
2. 补代码签名和安装体验。
3. 继续优化素材版权台账的附件上传体验、到期提醒筛选和品牌授权范围差异预览。
4. 规则库后续增强：版本快照对比、回滚前差异预览和品牌授权范围模板体验。
5. 用真实授权页面继续调优 Edge 插件识别率。
