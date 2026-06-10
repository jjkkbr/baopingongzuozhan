# Edge 插件真实电商页面兼容性适配报告

更新日期：2026-05-29

## 合规边界

本轮调优只增强 Edge 插件对当前页面已渲染 DOM 的识别能力，不新增后台请求、自动翻页、登录态处理、验证码绕过、风控绕过或批量抓取能力。插件仍要求用户只在有权访问、复制或使用的商品页面、后台导出页或授权页面中使用，并保留授权记录和页面截图。

## 本轮适配范围

### 已增强的页面结构

- 淘宝/天猫类：`data-item-id`、`item.htm`、懒加载主图、标题类名和月销字段。
- 抖音/内容电商类：`data-e2e="goods-card"`、`goodsId`、背景图、到手价和“人已买”销量。
- 通用商品链接类：`/product/`、`/sku/`、`srcset`、`aria-label`、通用价格和累计销量。
- 京东类：`item.jd.com/<sku>.html`、`data-sku`、`data-ware-id`、`gl-i-wrap`、拆分价格节点和累计销量。
- 拼多多类：`goods.html?goods_id=`、`data-goods-id`、CSS 变量背景图、券后价和“已拼”销量。
- 小红书/内容种草商品卡类：`/goods/`、`data-product-id`、`data-name`、`data-cover`、活动价和“人已买”销量。
- 1688/供货卡类：`detail.1688.com/offer/`、`data-offer-id`、`data-offer-title`、`data-image-url`、拿货价和近 30 天成交。
- 快手/内容电商小店类：`kwaixiaodian`、`/commodity/`、`data-commodity-id`、`data-commodity-title`、`data-price-cent`、`aria-label` 销量和结构化趋势。
- 商家后台表格类：`tr` 商品行、`data-sku-code`、`data-product-title`、`data-thumb`、`data-price`、`title` 历史销量和 `data-seller`。
- 紧凑货架卡类：`data-auction-id`、`data-subject`、`data-pic-url`、`data-promotion-price`、付款人数和店铺字段。

### 已增强的识别信号

- 商品锚点：`data-item-id`、`data-auction-id`、`data-offer-id`、`data-goods-id`、`data-product-id`、`data-commodity-id`、`data-sku`、`data-sku-code`、`data-ware-id`、`data-spu-id`。
- 商品链接：`item.htm`、`detail.htm`、`goods.html`、`item.jd.com`、`mobile.yangkeduo.com`、`haohuo.jinritemai`、`detail.1688.com`、`kwaixiaodian`、`youzan`、`/item/`、`/goods/`、`/product/`、`/sku/`、`/offer/`、`/commodity/`。
- 卡片容器：`doubleCard`、`item-card`、`goods-card`、`product-card`、`commodity-card`、`offer-card`、`search-result`、`gl-i-wrap`、`card/item/product/goods/offer/commodity/sku` 和后台表格 `tr`。
- 标题来源：`data-title`、`data-name`、`data-item-title`、`data-product-title`、`data-goods-title`、`data-offer-title`、`data-commodity-title`、`data-subject`、`aria-label`、`title`、图片 `alt` 和标题/名称类节点。
- 图片来源：`src`、`currentSrc`、`srcset`、`data-src`、`data-original`、`data-lazy-src`、`data-ks-lazyload`、`data-lazyload`、`data-actualsrc`、`data-imgurl`、`data-image-url`、`data-img-url`、`data-cover`、`data-cover-url`、`data-thumb`、`data-thumbnail`、`data-pic`、`data-pic-url`、`data-poster`、背景图和 CSS 变量背景图。
- 价格来源：普通价格文本、售价、拿货价、券后价、到手价、活动价、促销价、`data-price`、`data-promotion-price`、`data-price-cent` 和 `price/amount/money` 节点中的拆分价格。
- 销量来源：月销、月售、已售、累计销量、付款、成交、已拼、已抢、卖出、采购、回购、人已买、件已售、单已售、笔成交、次采购等。
- 误识别抑制：继续排除广告位、直播入口、优惠券组件、会场入口、专题卡等非商品容器。

## 输出字段

插件发送给工作台的商品快照包括：

- `id`
- `platform`
- `title`
- `shop`
- `price`
- `sales`
- `imageUrl`
- `mediaType`
- `mediaUrl`
- `mediaItems`
- `sellingPoints`
- `sourceNotice`
- `sourceUrl`
- `confidence`

其中 `mediaItems` 用于支持工作台素材预览缩略图切换，最多保留 8 个当前页面可见素材 URL，并过滤 `data:`、`file:`、`blob:`、`javascript:` 等不可用或非页面授权素材地址。

## 本地验证结果

验证命令：

```powershell
node --check edge-extension\popup.js
node --check scripts\verify-edge-extension.mjs
node scripts\verify-edge-extension.mjs
```

验证结果：

- 语法检查通过。
- 本地 fixture 页面共 10 个商品样本，识别 10/10。
- 覆盖淘宝式、抖音式、通用商品链接、京东式、拼多多式、小红书/内容电商式、1688 供货卡、快手/小店商品卡、商家后台表格行和紧凑货架卡。
- 每个样本均识别到标题、价格、销量、店铺、主图和 `mediaItems`。
- 非商品广告位、直播入口和优惠券组件未被误识别。
- 4 个样本可从当前 DOM 的 `data-*`、`title` 或结构化趋势字段中读取真实 `salesTrend`。

## 已知限制

- 插件不会也不能访问未渲染在当前页面 DOM 中的数据；虚拟滚动列表需要用户先滚动让卡片出现在页面中。
- 插件不会自动翻页，不会进入详情页补充字段。
- 图片 URL 若由站点脚本延迟解密、canvas 绘制或接口懒加载但未落入 DOM 属性/样式中，仍可能无法读取。
- 真实平台页面会持续改版，本地 fixture 只能覆盖已沉淀的授权样本结构，后续需要继续把失败样本匿名化后补入 `scripts/fixtures/edge-extension-products.html`。
- 销量字段只读取页面可见文案，若平台隐藏真实销量或仅展示热度/指数，插件不会推断或模拟销量。

## 后续建议

1. 用真实授权页面继续测试搜索结果页、店铺商品页、达人橱窗页、商家后台商品列表页。
2. 每发现一次漏识别或误识别，先匿名化 HTML 片段，再补入 `scripts/fixtures/edge-extension-products.html`。
3. 继续扩展“误识别样本区”，覆盖店铺头图、客服卡、品牌会场、达人视频卡和纯内容笔记。
4. 后续如需要进一步量化识别率，可在授权样本中增加 `data-expected-title` 标注，统计召回率、误识别率和字段完整率。
