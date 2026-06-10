# 爆品广告工作台 MVP

这是一个合规优先的本地原型，用来验证“抓取/导入热卖商品 -> 分析推广素材结构 -> 生成原创广告方案”的产品闭环。

## 可行性结论

技术上可行，但不能以绕过平台限制、爬取未授权页面、搬运竞品素材的方式实现。可上线的路径应当是：

1. 商品榜单来自官方开放平台、商家后台导出、达人/商家授权数据或内部投放数据。
2. 视频和图片只做结构化分析，例如开场钩子、镜头节奏、卖点排列、价格锚点。
3. 生成结果必须是原创脚本、原创海报提示词、原创拍摄分镜，不能逐帧复刻或直接复用他人素材。

## 已实现

- 本地 Node.js 服务，无第三方依赖。
- 样例商品销量榜，支持平台、关键词和数量筛选。
- CSV 商品导入，按销量排序。
- 历史销量 CSV/API 导入，支持把授权历史字段合并到当前商品趋势图。
- 授权文本/HTML 导入：可粘贴商家后台、授权选品表或你有权使用的商品列表内容，解析标题、价格、销量和店铺。
- Edge 插件采集助手：从当前浏览器中已渲染的授权商品页面读取商品信息，并发送到本地工作台。
- 淘宝开放平台 `taobao.tbk.dg.material.optional` 适配入口和签名逻辑。
- 抖音/抖店授权数据适配入口。
- 图片/视频推广结构分析。
- 短视频脚本和海报图方案生成。
- 自动合规审核，识别数据授权、素材版权、极限词、功效承诺和销量背书风险。
- 合规规则库，支持默认规则启停、自定义规则、导入导出、导入差异预览、版本快照回滚、品牌授权状态、品牌授权范围、平台/类目范围和审核留痕。
- 授权凭证台账，支持为当前商品登记后台导出、页面截图、开放平台返回或授权文件摘要，并在合规审核中自动匹配。
- 素材版权台账，支持登记图片、视频、音乐、字体、肖像、Logo 和产品拍摄授权摘要，并在合规审核和导出证据包中自动匹配。
- 批量任务，支持批量生成、批量审核、历史方案复审、取消、重试、归档和报告包导出。
- 专业方案和批量报告包导出到 `output/`。

## 从 GitHub 拉取后启动

首次在新机器上运行：

```powershell
git clone https://github.com/jjkkbr/baopingongzuozhan.git
cd baopingongzuozhan
npm install
npm.cmd start
```

打开：

```text
http://127.0.0.1:4173
```

运行桌面版：

```powershell
npm.cmd run desktop
```

如果 PowerShell 阻止 `npm.ps1`，优先使用 `npm.cmd`。AI Key 请在工作台左侧“大模型设置”里保存，或只放在本机环境变量中；不要写入代码、README、前端文件或可提交配置。之前在聊天里暴露过的 Key 应先到服务商后台作废，再重新生成新 Key。

## 启动

```powershell
node src/server.js
```

打开：

```text
http://localhost:4173
```

## 桌面软件

开发运行桌面版：

```powershell
npm run desktop
```

构建免安装目录版：

```powershell
npm run pack
```

构建 Windows 安装包：

```powershell
npm run dist
```

构建要求代码签名的 Windows 安装包：

```powershell
$env:WIN_CSC_LINK="C:\path\to\certificate.pfx"
$env:WIN_CSC_KEY_PASSWORD="your_certificate_password"
npm.cmd run dist:signed
```

如果没有提供签名证书，`dist:signed` 会提前失败；普通 `dist` 仍可生成未签名测试包。

当前安装包输出路径：

```text
release/爆品广告工作台 Setup 0.1.0.exe
```

免安装版可执行文件：

```text
release/win-unpacked/爆品广告工作台.exe
```

桌面版会自动启动内置本地服务并打开工作台窗口。AI 配置、导出文件等运行时数据会保存到系统用户数据目录，不写入安装目录。

## 发布前安全检查

上传或发布前先确认仓库只包含源码、文档和样例数据，不包含本机私有配置、运行日志、导出包或安装包。

```powershell
git status --short --ignored
git ls-files | Select-String -Pattern "data/.*\.local\.json|^\.env$|^output/|^release/|^dist/|^node_modules/|^\.edge-"
```

上面的第二条命令正常情况下不应输出任何已跟踪文件。再扫描常见密钥形态：

```powershell
rg -n --hidden -S `
  -e 'sk-[A-Za-z0-9_-]{16,}' `
  -e 'sk-sp-[A-Za-z0-9_-]+' `
  -e 'ghp_[0-9A-Za-z_]{20,}' `
  -e 'github_pat_[0-9A-Za-z_]{20,}' `
  -e 'BEGIN (RSA|OPENSSH|PRIVATE) KEY' `
  -g '!node_modules/**' `
  -g '!output/**' `
  -g '!release/**' `
  -g '!dist/**' `
  -g '!.git/**' `
  -g '!.edge*/**' `
  -g '!data/*.local.json' `
  -g '!*.log' `
  .
```

如需发布桌面安装包，先跑基础检查：

```powershell
node --check src\server.js
node --check public\app.js
node --check desktop\main.cjs
node --check edge-extension\popup.js
node --check scripts\verify-edge-extension.mjs
node scripts\verify-edge-extension.mjs
```

本地私有文件已经被 `.gitignore` 排除，包括 `data/*.local.json`、`.env`、`output/`、`release/`、日志文件和 Edge 临时目录。不要用 `git add -f` 强行提交这些文件。

## AI 大模型分析

“分析素材”会先运行本地规则分析，并自动切到“素材洞察”；如果配置了 OpenAI 兼容接口，还会在素材洞察里追加 AI 洞察，包括目标人群、购买动机、原创创意角度、差异化表达、合规风险和发布前证据清单。

可以直接在工作台左侧“大模型设置”里填写：

- Base URL：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- 模型：`qwen-plus`
- API Key：你的百炼 API Key

如果使用阿里百炼 Coding Plan / 套餐专属 `sk-sp` Key，请在“接口预设”里选择“阿里百炼 Coding 专属”：

- Base URL：`https://coding.dashscope.aliyuncs.com/v1`
- 模型：`qwen3-coder-plus`
- API Key：`sk-sp...` 套餐专属 Key

视觉分析已拆成独立配置。可以在“大模型设置”的“视觉模型”区单独填写：

- 视觉 Base URL：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- 视觉模型：`qwen-vl-plus`、`qwen-vl-max`、`qwen3-vl-plus` 或 `qwen3-vl-flash`
- 视觉 API Key：留空时共用上方 Key；如上方使用 `sk-sp` Coding Key，建议单独填写支持视觉模型的普通百炼 Key。

视觉分析结果会在“素材洞察”里展示素材地址可访问性、素材清单、模型候选、风险证据卡、风险矩阵、本地预检与视觉模型差异、证据要求、复核重点和重拍/替换简报。视频素材会额外生成“抽帧计划”和“证据截图留档”清单，帮助审核人按首帧、卖点、使用过程、转场和末帧逐项复核。该能力只用于授权素材的风险预检和人工复核辅助，不用于搬运、复刻或规避平台审核。

生成广告方案后，“文案优化”会显示创意结果质量控制面板，包含质量分、等级、发布闸门、卖点覆盖、结构完整、原创生产、证据链、合规闸门、表达可读等维度，以及优先处理项和改写简报。质量报告会随专业方案导出一起保存，方便人工复核。

点击“导出方案”会在 `output/ad-plans/<时间-商品名>/` 生成专业交付包：

- `plan.json`：完整结构化广告方案，包含商品、创意、质量控制、素材风险、视觉证据工作包、合规审核、制作包和证据包。
- `plan.md`：便于运营、设计和审核人员阅读的方案书。
- `review-checklist.csv`：创意质量、素材风险、合规审核和证据留存清单。
- `manifest.json`：导出包文件清单和摘要。

普通百炼 Key 和套餐专属 Key 不能随意混用 Base URL。若出现 `Incorrect API key provided` 或 `invalid access token or token expired`，优先检查 Key 类型、Base URL 和模型是否匹配。

点击“保存 AI 设置”后，工作台会记住主模型 Base URL、模型、超时、Key，以及视觉模型 Base URL、模型和可选视觉 Key；下次打开会自动恢复，不需要重复输入。完整 Key 只保存在本机 `data/ai-config.local.json`，页面只显示尾号；该文件已加入 `.gitignore`。

也可以继续用环境变量启动。DashScope OpenAI 兼容接口示例：

```powershell
$env:AI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
$env:AI_MODEL="qwen-plus"
$env:AI_API_KEY="your_api_key"
$env:AI_VISUAL_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
$env:AI_VISUAL_MODEL="qwen-vl-plus"
$env:AI_VISUAL_API_KEY="your_visual_api_key"
node src/server.js
```

也兼容常见变量名：

```powershell
$env:OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
$env:OPENAI_API_KEY="your_api_key"
```

如果你的套餐页面提供了专属 Base URL，也可以把 `AI_BASE_URL` 改成对应地址。

不要把 API Key 写入代码、README 或前端文件；建议只放在本机环境变量或启动脚本的私有配置中。

## CSV 字段

推荐表头：

```csv
title,platform,category,shop,price,sales,commissionRate,imageUrl,mediaType,mediaUrl,sellingPoints,audience
```

`sellingPoints` 可用 `|`、`、`、`,`、`;` 分隔。

## 历史销量导入

“授权数据导入”区域的“导入历史销量”按钮用于补充真实历史趋势。可以粘贴 CSV，也可以粘贴开放平台或商家后台导出的 JSON。

支持两类格式：

```csv
productId,date,sales
demo-001,2026-05-20,120
demo-001,2026-05-21,156
```

也支持商品行内趋势字段，例如 `salesTrend`、`salesHistory`、`dailySales`、`trend`。系统会按 `id`、`productId`、`sku`、`title` 等字段匹配当前商品。没有真实历史字段时，销量趋势仍会显示暂无历史销量数据，不会用当前销量模拟曲线。

## 无接口时的授权导入

如果暂时无法获得淘宝开放平台接口，不建议绕过平台限制抓取未授权页面。可以使用页面左侧的“解析文本/HTML”：

1. 打开你有权访问或有授权使用的商品列表、商家后台导出页或选品表。
2. 复制商品卡片区域的文本或 HTML 片段，内容最好包含标题、价格、月销/已售和店铺。
3. 粘贴到“授权数据导入”文本框，点击“解析文本/HTML”。

该功能只解析你粘贴的内容，不会自动访问淘宝 URL，不处理登录态，也不绕过反爬、风控或平台限制。发布前仍需留存授权记录、后台截图、复制时间和原始数据来源。

## 合规规则库和审核留痕

左侧“敏感词与品牌规则”支持启停默认规则、新增自定义规则、平台/类目范围、品牌词授权状态、品牌授权范围、版本记录和快照回滚，并可导入/导出 JSON 规则包。导入前会先生成差异预览，展示新增、覆盖、平台/类目变化、授权状态变化、品牌授权范围变化、覆盖移除和默认规则禁用变化；导出的规则包只包含规则配置，不包含 API Key、Cookie、Token 或登录态。

规则库保存、导入、重置和回滚前会自动生成最近 12 个轻量快照，只保存规则状态摘要、自定义规则和默认规则禁用状态，用于误操作恢复。品牌词可标记为“需复核、已授权、待复核、不可用”，并维护授权品牌、授权渠道、地区、活动、有效期和凭证引用等范围摘要。合规审核会按授权状态和范围匹配情况给出不同提示，已授权也仍需人工核对授权范围和证据留存。

投放建议里的合规审核会自动写入本机审核留痕，记录商品摘要、审核分数、命中词、检查项、规则快照和素材证据摘要。审核记录可在“审核留痕”区域查看最近记录，也可以导出 JSON 供人工复核归档。

## 授权凭证台账

“投放建议”里的“授权凭证”区域可以为当前商品登记凭证摘要，例如商家后台导出、官方开放平台返回、页面截图、达人/商家授权、内部投放数据或授权文件。合规审核会自动匹配当前商品的台账记录，有匹配时显示“已关联授权凭证”。

台账只保存凭证名称、类型、平台/类目、关联商品、引用、审核人和时间等摘要信息，不上传截图或文件，也不会保存 API Key、Cookie、Token 或登录态。台账可导出 JSON 归档。

## 素材版权台账

“投放建议”里的“素材版权”区域可以为当前商品登记素材授权摘要，覆盖图片、视频、音乐、字体、肖像、Logo、产品拍摄和其他素材。每条记录包含素材名称、来源、授权范围、平台/类目、关联商品、引用、附件引用、品牌授权范围、渠道/地域/活动范围、到期时间、审核人和时间。

合规审核会自动匹配当前商品的素材版权台账，有匹配时展示“已关联素材版权台账”；如果记录已过期、即将到期、品牌授权待复核/有限授权/不可使用，或登记品牌与当前商品不明显匹配，会提示人工复核。专业方案导出的证据包也会携带匹配到的素材版权摘要和范围提醒。

台账只保存摘要和引用，不保存原始图片、视频、音乐、字体文件或授权系统内容，也不会保存 API Key、Cookie、Token 或登录态。台账可导出 JSON 归档。

本机私有文件：

- `data/compliance-rules.local.json`：规则库启停状态和自定义规则。
- `data/compliance-audit-records.local.json`：合规审核留痕。
- `data/authorization-credentials.local.json`：授权凭证台账。
- `data/material-rights.local.json`：素材版权台账。

这些文件已加入 `.gitignore`，不要提交到仓库。规则库、凭证台账、素材版权台账和审核留痕只用于风险提示、人工复核和证据归档，不能用于规避平台审核、版权审核或广告法要求。

## Edge 插件采集助手

当页面是动态渲染、复制 URL 或静态 HTML 识别不到商品时，可以使用本地 Edge 插件读取当前页面已经渲染出的 DOM 商品卡片。

安装：

1. 打开 Edge 的 `edge://extensions/`。
2. 开启“开发人员模式”。
3. 点击“加载解压缩的扩展”。
4. 选择 `edge-extension/` 目录。

使用：

1. 启动工作台并打开 `http://localhost:4173`。
2. 在 Edge 打开你有权访问的商品列表页，等待商品加载出来。
3. 点击扩展“爆品工作台采集助手”，再点击“发送到工作台”。
4. 回到工作台左侧点击“读取插件数据”。

插件只读取当前页面已渲染内容，不处理登录态，不绕过平台限制，不做后台爬取。请只在你有权访问、复制或使用的数据源上使用。

读取插件数据后，工作台会展示“插件识别质量”报告，包含候选卡片数、识别商品数、识别率、标题/价格/销量/店铺/图片/历史销量等字段完整度、缺失字段样本和改进建议。报告只用于定位当前页面 DOM 识别问题，不会后台补抓隐藏字段。

当前插件识别样本已覆盖淘宝/天猫、抖音/内容电商、通用商品链接、京东、拼多多、小红书/内容电商、1688 供货卡、快手/小店商品卡、商家后台表格行和紧凑货架卡，并会排除广告位、直播入口、优惠券组件等非商品反例。真实平台页面仍会持续改版，遇到漏识别时请先匿名化授权页面片段，再补进 `scripts/fixtures/edge-extension-products.html` 做回归。

更新流程：如果你改了 `edge-extension/` 里的代码，回到 `edge://extensions/` 找到“爆品工作台采集助手”，点一次“重新加载”，浏览器就会读到新版本；如果你用的是打包版安装目录里的插件资源，就需要把新版本一起更新到安装包或安装目录里再重载。插件更新后建议先在授权页面跑一遍，再回到工作台确认“读取插件数据”是否正常。

## 批量任务

商品卡多选后可以批量生成或批量审核。历史批量生成任务支持“复审方案”，任务详情支持取消排队/运行中任务，任务列表支持重试失败或取消项，也可以把非活跃任务归档；归档任务在“含归档”或“已归档”筛选下可恢复到常规列表。批量任务状态保存在本机私有文件 `data/batch-jobs.local.json` 或桌面版用户数据目录，导出结果写入 `output/batch-runs/<jobId>/`。

批量导出已升级为报告包：目录内会保留逐商品 JSON，同时生成 `summary.json` 结构化汇总、`batch-report.md` 可读复盘报告、`batch-summary.csv` 表格总表和 `manifest.json` 文件清单。批量详情会展示这些输出路径，方便运营筛选、审核复盘和后续制作交接。

批量失败项会记录错误分类、失败阶段、错误代码和是否建议重试；前端详情、`summary.json`、`batch-report.md` 和 `batch-summary.csv` 都会展示这些字段，便于区分队列限制、AI 配置、模型权限、网络、平台接口、输入数据、合规审核和导出写入问题。批量详情还支持按商品/错误关键词、明细状态和错误分类筛选。

批量队列已补充高并发保护：单个任务最多 50 个商品，同时排队/运行任务最多 6 个，待处理商品最多 160 件，且每分钟最多创建 8 个批量任务。`GET /api/batch/jobs` 支持 `q`/`keyword` 搜索、`status` 状态筛选、`includeArchived=1` 查看归档任务，并返回 `queue` 队列容量元数据；前端批量面板提供任务搜索、状态筛选、“含归档”开关和队列容量提示。

## 真实数据接入

淘宝：

```powershell
$env:TAOBAO_APP_KEY="your_app_key"
$env:TAOBAO_APP_SECRET="your_app_secret"
$env:TAOBAO_ADZONE_ID="your_adzone_id"
node src/server.js
```

抖音/抖店：

```powershell
$env:DOUYIN_ACCESS_TOKEN="authorized_access_token"
node src/server.js
```

当前抖音适配器保留了授权入口，需要根据最终获批的抖音开放平台或抖店开放平台接口字段补齐映射。

## 后续开发建议

- 接入对象存储，用于保存自有素材和生成素材。
- 完善视觉模型的视频输入、证据展示和模型候选。
- 继续优化 LLM 生成质量，按品牌调性生成更多版本脚本、口播和分镜。
- 继续增强批量任务失败原因、归档任务管理和批量报告筛选体验。
- 继续完善素材版权台账的附件引用上传体验、到期提醒筛选和品牌授权范围差异预览。
- 继续增强规则库版本快照对比、回滚前差异预览和品牌授权范围模板体验。
- 增加平台发布链路，但只发布自有或授权内容。
