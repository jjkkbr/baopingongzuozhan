const WORKBENCH_URLS = [
  'http://127.0.0.1:4173',
  'http://localhost:4173'
];

const els = {
  captureBtn: document.querySelector('#captureBtn'),
  resultBox: document.querySelector('#resultBox')
};

els.captureBtn.addEventListener('click', captureCurrentPage);

async function captureCurrentPage() {
  setBusy(true);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('未找到当前标签页。');

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectProductsFromPage
    });

    const products = result?.products || [];
    if (!products.length) {
      showMessage('没有识别到商品卡片。\n请先滚动页面让商品加载出来，或打开搜索结果/榜单/店铺商品页后再试。', 'warn');
      return;
    }

    const { data } = await sendProductsToWorkbench({
      products,
      sourceUrl: result.sourceUrl,
      pageTitle: result.pageTitle,
      platform: detectPlatform(result.sourceUrl)
    });

    showMessage(`已发送 ${data.count} 个商品到工作台。\n回到爆品工作台点击“读取插件数据”。`, 'ok');
  } catch (error) {
    showMessage(error instanceof Error ? error.message : String(error), 'warn');
  } finally {
    setBusy(false);
  }
}

function setBusy(busy) {
  els.captureBtn.disabled = busy;
  els.captureBtn.textContent = busy ? '发送中...' : '发送到工作台';
}

function showMessage(message, type) {
  els.resultBox.textContent = message;
  els.resultBox.className = `result ${type || ''}`;
}

function detectPlatform(url) {
  if (/taobao|tmall/i.test(url)) return 'taobao';
  if (/douyin|jinritemai|douyinec/i.test(url)) return 'douyin';
  if (/jd\.com|360buy/i.test(url)) return 'jd';
  if (/pinduoduo|yangkeduo/i.test(url)) return 'pdd';
  if (/xiaohongshu|xhslink/i.test(url)) return 'xiaohongshu';
  if (/1688\.com|alibaba/i.test(url)) return '1688';
  if (/kuaishou|kwai/i.test(url)) return 'kuaishou';
  return 'edge';
}

async function sendProductsToWorkbench(payload) {
  let lastError = null;
  for (const baseUrl of WORKBENCH_URLS) {
    try {
      const response = await fetch(`${baseUrl}/api/import/extension-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) return { data, baseUrl };
      lastError = new Error(data.message || data.error || `工作台返回 ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError || new Error('无法连接到本地工作台，请确认工作台已启动。');
}

async function collectProductsFromPage() {
  const sourceUrl = location.href;
  const pageTitle = document.title || '';
  await waitForPageSettle();
  const cards = findProductCards();
  const products = cards
    .map((card, index) => parseCard(card, index))
    .filter(Boolean);

  return {
    sourceUrl,
    pageTitle,
    diagnostics: {
      candidateCards: cards.length,
      title: pageTitle
    },
    products: dedupeProducts(products).slice(0, 80)
  };

  function waitForPageSettle() {
    return new Promise((resolve) => {
      const started = Date.now();
      let lastSize = document.body?.innerText?.length || 0;
      let stableTicks = 0;
      const tick = () => {
        const nextSize = document.body?.innerText?.length || 0;
        stableTicks = Math.abs(nextSize - lastSize) < 20 ? stableTicks + 1 : 0;
        lastSize = nextSize;
        if (stableTicks >= 2 || Date.now() - started > 520) {
          resolve();
          return;
        }
        setTimeout(tick, 120);
      };
      requestAnimationFrame(() => setTimeout(tick, 80));
    });
  }

  function findProductCards() {
    const seedSelectors = [
      '[data-item-id]',
      '[data-itemid]',
      '[data-nid]',
      '[data-id]',
      '[data-auction-id]',
      '[data-offer-id]',
      '[data-offerid]',
      '[data-product-id]',
      '[data-productid]',
      '[data-goods-id]',
      '[data-goodsid]',
      '[data-gid]',
      '[data-sku-id]',
      '[data-sku]',
      '[data-sku-code]',
      '[data-ware-id]',
      '[data-wareid]',
      '[data-spu-id]',
      '[data-spuid]',
      '[data-commodity-id]',
      '[data-commodityid]',
      '[data-e2e*="product" i]',
      '[data-e2e*="goods" i]',
      '[data-e2e*="commodity" i]',
      '[data-testid*="product" i]',
      '[data-testid*="goods" i]',
      '[data-testid*="commodity" i]',
      '[data-log*="product" i]',
      '[data-log*="goods" i]',
      '[data-log*="commodity" i]',
      '[data-track*="product" i]',
      '[data-track*="goods" i]',
      '[data-track*="commodity" i]',
      '[data-spm*="item" i]',
      '[data-spm*="goods" i]',
      '[data-spm*="offer" i]',
      '[aria-label*="商品"]',
      '[aria-label*="货品"]',
      '[title*="商品"]',
      '[title*="货品"]',
      'a[href*="item.htm"]',
      'a[href*="detail.htm"]',
      'a[href*="goods.html"]',
      'a[href*="offer/"]',
      'a[href*="detail.1688.com"]',
      'a[href*="itemId"]',
      'a[href*="item_id"]',
      'a[href*="goodsId"]',
      'a[href*="goods_id"]',
      'a[href*="gid="]',
      'a[href*="productId"]',
      'a[href*="product_id"]',
      'a[href*="skuId"]',
      'a[href*="sku_id"]',
      'a[href*="commodityId"]',
      'a[href*="commodity_id"]',
      'a[href*="item.jd.com"]',
      'a[href*="m.tb.cn"]',
      'a[href*="mobile.yangkeduo.com"]',
      'a[href*="www.kwaixiaodian.com"]',
      'a[href*="app.kwaixiaodian.com"]',
      'a[href*="youzan.com"]',
      'a[href*="/goods/"]',
      'a[href*="/product/"]',
      'a[href*="/item/"]',
      'a[href*="/sku/"]',
      'a[href*="/commodity/"]',
      '[class*="doubleCard" i]',
      '[class*="item-card" i]',
      '[class*="goods-card" i]',
      '[class*="product-card" i]',
      '[class*="commodity-card" i]',
      '[class*="offer-card" i]',
      '[class*="search-result" i]',
      '[class*="gl-i-wrap" i]',
      '[class*="card"]',
      '[class*="Card"]',
      '[class*="item"]',
      '[class*="Item"]',
      '[class*="product"]',
      '[class*="Product"]',
      '[class*="goods"]',
      '[class*="Goods"]',
      '[class*="offer"]',
      '[class*="Offer"]',
      '[class*="commodity"]',
      '[class*="Commodity"]',
      '[class*="sku"]',
      '[class*="Sku"]',
      'tr'
    ];

    const seeds = [];
    seedSelectors.forEach((selector) => {
      safeQueryAll(selector).forEach((node) => {
        if (node instanceof HTMLElement) seeds.push(findCardRoot(node));
      });
    });

    safeQueryAll('a[href]').forEach((anchor) => {
      if (anchor instanceof HTMLElement && isProductAnchor(anchor)) seeds.push(findCardRoot(anchor));
    });

    safeQueryAll('img, source, picture').forEach((node) => {
      if (node instanceof HTMLElement && isVisualProductSeed(node)) seeds.push(findCardRoot(node));
    });

    let cards = pickBestCards(seeds);
    if (cards.length) return cards;

    const fallbackSeeds = safeQueryAll('article, li, a, div, section')
      .slice(0, 2400)
      .filter((node) => node instanceof HTMLElement && scoreCard(node) >= 44);
    cards = pickBestCards(fallbackSeeds);
    return cards.slice(0, 120);
  }

  function safeQueryAll(selector) {
    try {
      return [...document.querySelectorAll(selector)];
    } catch {
      return [];
    }
  }

  function findCardRoot(seed) {
    let current = seed instanceof HTMLElement ? seed : seed?.parentElement;
    let best = current;
    let bestScore = current ? scoreCard(current) : 0;
    for (let depth = 0; current && current !== document.body && depth < 7; depth += 1) {
      const score = scoreCard(current);
      if (score > bestScore || (score === bestScore && area(current) < area(best))) {
        best = current;
        bestScore = score;
      }
      if (score >= 76 && isCardBoundary(current)) break;
      current = current.parentElement;
    }
    return best;
  }

  function pickBestCards(nodes) {
    const scored = uniqueElements(nodes)
      .filter((node) => node instanceof HTMLElement)
      .map((node) => ({ node, score: scoreCard(node), area: area(node) }))
      .filter((item) => item.score >= 44)
      .sort((a, b) => b.score - a.score || a.area - b.area);

    const selected = [];
    for (const item of scored) {
      if (selected.some((other) => isSameCard(other.node, item.node))) continue;
      selected.push(item);
      if (selected.length >= 120) break;
    }
    return selected.map((item) => item.node);
  }

  function scoreCard(node) {
    if (!(node instanceof HTMLElement)) return 0;
    const rect = node.getBoundingClientRect();
    if (rect.width < 80 || rect.height < 44) return 0;
    if (node.closest('header, footer, nav, aside')) return 0;
    if (isNonProductContainer(node)) return 0;

    const text = normalizeText(readVisibleText(node));

    const price = extractPriceFromCard(node, text);
    const sales = extractSales(text);
    const image = extractImage(node);
    const productLink = extractProductLink(node);
    const title = extractTitle(node, text.split('\n').map((line) => normalizeText(line)).filter(Boolean), text);
    const tagSignal = /item|product|goods|sku|offer|commodity|card|商品|货品|宝贝/i.test(
      `${node.className || ''} ${node.id || ''} ${node.getAttribute('data-e2e') || ''} ${node.getAttribute('data-testid') || ''}`
    );
    const productData = hasProductData(node);
    const linkCount = node.querySelectorAll('a[href]').length;
    const imageCount = node.querySelectorAll('img, picture, source').length;
    const commerceSignal = price || sales || image || productLink || productData || tagSignal;
    if ((text.length < 6 && !commerceSignal) || text.length > 2600) return 0;

    let score = 0;
    if (title) score += 22;
    if (price) score += 24;
    if (sales) score += 16;
    if (image) score += 12;
    if (productLink) score += 14;
    if (productData) score += 12;
    if (tagSignal) score += 8;
    if (rect.width >= 120 && rect.height >= 80) score += 6;
    if (/price|sale|sold|shop|store|mall|coupon|cart|offer|commodity|宝贝|商品|货品|销量|月销|已售|到手价|券后/i.test(`${node.className || ''} ${text}`)) score += 5;
    if (/直播|live|banner|ad-|advert|coupon|优惠券|会场|专题|活动入口/i.test(`${node.className || ''} ${node.id || ''}`)) score -= 18;
    if (linkCount > 4 || imageCount > 5) score -= 24;
    if (text.length > 900) score -= 18;
    if (rect.height > window.innerHeight * 0.8 && rect.width > window.innerWidth * 0.7) score -= 35;
    return score;
  }

  function isCardBoundary(node) {
    const role = node.getAttribute('role') || '';
    const classText = String(node.className || '');
    return /article|listitem|gridcell|link/i.test(role)
      || /item|product|goods|sku|offer|commodity|card|商品|货品|宝贝/i.test(classText)
      || node.tagName === 'TR'
      || hasProductData(node);
  }

  function isNonProductContainer(node) {
    const marker = normalizeText([
      node.className,
      node.id,
      node.getAttribute('role'),
      node.getAttribute('aria-label'),
      node.getAttribute('title')
    ].filter(Boolean).join(' '));
    if (!marker) return false;
    return /(?:banner|advert|ad-slot|promo|coupon|voucher|live|直播|广告|优惠券|会场|专题|入口)/i.test(marker)
      && !hasProductData(node)
      && !extractProductLink(node);
  }

  function isSameCard(a, b) {
    if (a === b) return true;
    const aLink = extractProductLink(a);
    const bLink = extractProductLink(b);
    if (aLink && bLink && aLink === bLink) return true;
    if (a.contains(b) || b.contains(a)) return true;
    return false;
  }

  function area(node) {
    if (!node) return Number.MAX_SAFE_INTEGER;
    const rect = node.getBoundingClientRect();
    return Math.max(1, Math.round(rect.width * rect.height));
  }

  function isProductAnchor(anchor) {
    const href = normalizeUrl(anchor.getAttribute('href') || '');
    const text = normalizeText(`${anchor.getAttribute('aria-label') || ''}\n${anchor.getAttribute('title') || ''}\n${anchor.innerText || anchor.textContent || ''}`);
    return isProductUrl(href)
      || hasProductData(anchor)
      || Boolean(anchor.querySelector('img') && (extractPrice(text) || extractSales(text) || text.length >= 8));
  }

  function isVisualProductSeed(node) {
    const imageUrl = resolveImageSource(node);
    if (!imageUrl) return false;
    const text = normalizeText(`${node.getAttribute('alt') || ''}\n${node.getAttribute('aria-label') || ''}\n${node.getAttribute('title') || ''}`);
    const parentText = normalizeText(node.parentElement?.innerText || node.parentElement?.textContent || '');
    return isTitleCandidate(text) || extractPrice(parentText) || extractSales(parentText) || Boolean(node.closest('a[href]'));
  }

  function parseCard(card, index) {
    const text = normalizeText(card.innerText || card.textContent || '');
    const lines = text.split('\n').map((line) => normalizeText(line)).filter(Boolean);
    const title = extractTitle(card, lines, text);
    if (!title) return null;
    const imageUrl = extractImage(card);
    const price = extractPriceFromCard(card, text);
    const sales = extractSales(text);
    const salesTrend = extractSalesTrend(card);
    const productLink = extractProductLink(card);
    const mediaItems = extractMediaItems(card, imageUrl);
    const confidence = [
      title,
      price,
      sales,
      salesTrend.length >= 2,
      imageUrl,
      productLink,
      hasProductData(card)
    ].filter(Boolean).length;
    if (confidence < 3) return null;

    return {
      id: extractId(card) || `edge-${index}`,
      platform: detectPagePlatform(sourceUrl),
      title,
      shop: extractShop(card, lines),
      price,
      sales,
      salesTrend,
      imageUrl,
      mediaType: 'image',
      mediaUrl: imageUrl,
      mediaItems,
      sellingPoints: extractSellingPoints(text),
      sourceNotice: 'Edge 插件读取当前已渲染页面内容；请保留授权记录或后台截图。',
      sourceUrl: productLink || sourceUrl,
      confidence
    };
  }

  function detectPagePlatform(url) {
    if (/taobao|tmall/i.test(url)) return 'taobao';
    if (/douyin|jinritemai|douyinec/i.test(url)) return 'douyin';
    if (/jd\.com|360buy/i.test(url)) return 'jd';
    if (/pinduoduo|yangkeduo/i.test(url)) return 'pdd';
    if (/xiaohongshu|xhslink/i.test(url)) return 'xiaohongshu';
    if (/1688\.com|alibaba/i.test(url)) return '1688';
    if (/kuaishou|kwai/i.test(url)) return 'kuaishou';
    return 'edge';
  }

  function extractId(card) {
    const direct = findFirstAttribute(card, [
      'data-item-id',
      'data-itemid',
      'data-nid',
      'data-id',
      'data-auction-id',
      'data-offer-id',
      'data-offerid',
      'data-product-id',
      'data-productid',
      'data-goods-id',
      'data-goodsid',
      'data-gid',
      'data-sku-id',
      'data-sku',
      'data-sku-code',
      'data-ware-id',
      'data-wareid',
      'data-spu-id',
      'data-spuid',
      'data-commodity-id',
      'data-commodityid'
    ]);
    if (direct) return direct;
    const href = extractProductLink(card);
    const match = href.match(/(?:id|itemId|item_id|goodsId|goods_id|gid|productId|product_id|skuId|sku_id|offerId|offer_id|commodityId|commodity_id)=([0-9A-Za-z_-]+)/i)
      || href.match(/\/(?:item|goods|product|sku|offer|commodity)\/([0-9A-Za-z_-]+)/i)
      || href.match(/item\.jd\.com\/([0-9A-Za-z_-]+)\.html/i)
      || href.match(/offer\/([0-9A-Za-z_-]+)\.html/i)
      || href.match(/(?:item|goods|product|sku|offer|commodity)[-_]?([0-9]{5,})/i);
    return match?.[1] || '';
  }

  function extractTitle(cardOrLines, maybeLines, maybeText) {
    const card = cardOrLines instanceof HTMLElement ? cardOrLines : null;
    const lines = card ? maybeLines : cardOrLines;
    const text = card ? maybeText : maybeLines;
    const signalIndex = lines.findIndex((line) => extractPrice(line) || extractSales(line));
    const candidates = [];

    if (card) {
      pushTitleCandidate(candidates, card.getAttribute('data-title'), -1, 'attribute');
      pushTitleCandidate(candidates, card.getAttribute('data-name'), -1, 'attribute');
      pushTitleCandidate(candidates, card.getAttribute('data-item-title'), -1, 'attribute');
      pushTitleCandidate(candidates, card.getAttribute('data-product-title'), -1, 'attribute');
      pushTitleCandidate(candidates, card.getAttribute('data-goods-title'), -1, 'attribute');
      pushTitleCandidate(candidates, card.getAttribute('data-offer-title'), -1, 'attribute');
      pushTitleCandidate(candidates, card.getAttribute('data-commodity-title'), -1, 'attribute');
      pushTitleCandidate(candidates, card.getAttribute('data-subject'), -1, 'attribute');
      pushTitleCandidate(candidates, card.getAttribute('aria-label'), -1, 'attribute');
      pushTitleCandidate(candidates, card.getAttribute('title'), -1, 'attribute');
      safeElementQueryAll(card, '[class*="title" i], [class*="name" i], [class*="desc" i], [class*="subject" i], [class*="goods-name" i], [class*="product-name" i], [class*="offer-name" i], [class*="commodity-name" i], [data-title], [data-name], [data-item-title], [data-product-title], [data-goods-title], [data-offer-title], [data-commodity-title], [data-subject], [aria-label], [title], a[href], img[alt]')
        .slice(0, 80)
        .forEach((node, index) => {
          pushTitleCandidate(candidates, node.getAttribute('data-title'), index, 'attribute');
          pushTitleCandidate(candidates, node.getAttribute('data-name'), index, 'attribute');
          pushTitleCandidate(candidates, node.getAttribute('data-item-title'), index, 'attribute');
          pushTitleCandidate(candidates, node.getAttribute('data-product-title'), index, 'attribute');
          pushTitleCandidate(candidates, node.getAttribute('data-goods-title'), index, 'attribute');
          pushTitleCandidate(candidates, node.getAttribute('data-offer-title'), index, 'attribute');
          pushTitleCandidate(candidates, node.getAttribute('data-commodity-title'), index, 'attribute');
          pushTitleCandidate(candidates, node.getAttribute('data-subject'), index, 'attribute');
          pushTitleCandidate(candidates, node.getAttribute('aria-label'), index, 'attribute');
          pushTitleCandidate(candidates, node.getAttribute('title'), index, 'attribute');
          pushTitleCandidate(candidates, node.getAttribute('alt'), index, 'attribute');
          pushTitleCandidate(candidates, node.innerText || node.textContent, index, 'node');
        });
    }

    lines.forEach((line, index) => {
      pushTitleCandidate(candidates, line, index, 'line');
    });

    const ranked = candidates
      .map((item) => ({
        ...item,
        line: cleanTitle(item.line)
      }))
      .filter((item) => isTitleCandidate(item.line))
      .sort((a, b) => scoreTitleLine(b.line, b.index, signalIndex, b.source) - scoreTitleLine(a.line, a.index, signalIndex, a.source));

    if (ranked[0]) return ranked[0].line.slice(0, 80);

    return text
      .replace(/(?:¥|￥)\s*\d+(?:\.\d+)?/g, ' ')
      .replace(/(?:月销|已售|销量|售出|付款|成交)\s*[\d,.]+(?:万|千|w|W|k|K)?/g, ' ')
      .trim()
      .slice(0, 80);
  }

  function pushTitleCandidate(candidates, value, index, source) {
    const line = normalizeText(value || '');
    if (!line) return;
    candidates.push({ line, index, source });
  }

  function cleanTitle(value) {
    return normalizeText(value)
      .replace(/(?:¥|￥)\s*[0-9,]+(?:\s*\.\s*[0-9]{1,2})?/g, ' ')
      .replace(/(?:券后|到手价|价格|折后价|促销价|现价|活动价)[:：\s]*[0-9,]+(?:\s*\.\s*[0-9]{1,2})?/g, ' ')
      .replace(/(?:月销|月售|已售|销量|累计销量|售出|付款|成交|热销|已拼|已抢|卖出|浏览|评价|评论|回购|采购)\s*[\d,.]+(?:万|千|w|W|k|K|\+)?/g, ' ')
      .replace(/[\d,.]+(?:万|千|w|W|k|K)?\+?\s*(?:人付款|人已买|件已售|已售|销量|成交|人想买|人加购|人已拼|条评价|评论|浏览|次采购|人回购)/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function isTitleCandidate(line) {
    if (!line || line.length < 4 || line.length > 100) return false;
    if (/^(¥|￥)?\d+(?:\.\d+)?(?:元|起)?$/.test(line)) return false;
    if (/^(收藏|找相似|进店|客服|直播|广告|更多|详情|评价|评论|销量|付款|成交|包邮|退换|发货|加入购物车|看相似|去购买|领券|优惠券)$/.test(line)) return false;
    if (/(月销|月售|已售|销量|售出|付款|成交|评价|评论|券后|到手价|现价|包邮|满减|退换|发货|人已买|件已售|人回购|采购)/.test(line)) return false;
    if (/^(官方|自营|旗舰店|专营店|专卖店|店铺)$/.test(line)) return false;
    return /[\u4e00-\u9fa5A-Za-z]{4,}/.test(line);
  }

  function scoreTitleLine(line, index, signalIndex, source = 'line') {
    let score = Math.min(line.length, 60);
    if (source === 'attribute') score += 34;
    if (source === 'node') score += 8;
    if (signalIndex >= 0 && index < signalIndex) score += 26;
    if (signalIndex >= 0 && index > signalIndex) score -= 18;
    if (index === 0) score += 14;
    if (/爆款|新品|同款|家用|女|男|儿童|户外|厨房|收纳|护肤|食品|数码|服饰|鞋|包/.test(line)) score += 5;
    if (/旗舰店|专营店|专卖店|官方店|企业店|工厂店|生活馆|研究所|店铺|店$/.test(line)) score -= 20;
    if (/包邮|券后|满减|发货|退换|评价|评论|收藏|找相似/.test(line)) score -= 12;
    if (/[\u4e00-\u9fa5]/.test(line)) score += 10;
    return score;
  }

  function extractShop(cardOrLines, maybeLines) {
    const card = cardOrLines instanceof HTMLElement ? cardOrLines : null;
    const lines = card ? maybeLines : cardOrLines;
    if (card) {
      const shopNode = safeElementQueryAll(card, '[class*="shop" i], [class*="store" i], [class*="seller" i], [class*="merchant" i], [data-shop], [data-store], [data-seller]')
        .map((node) => cleanShop(node.getAttribute('data-shop') || node.getAttribute('data-store') || node.getAttribute('data-seller') || node.innerText || node.textContent || ''))
        .find(Boolean);
      if (shopNode) return shopNode;
    }

    const joined = lines.join('\n');
    const attributeShop = joined.match(/(?:店铺|商家|卖家|店名)[:：]\s*([^\n]{2,32})/);
    if (attributeShop) return cleanShop(attributeShop[1]);
    const labeled = lines.find((line) => /(?:店铺|商家|卖家)[:：]/.test(line));
    if (labeled) return cleanShop(labeled.replace(/^.*?(?:店铺|商家|卖家)[:：]\s*/, ''));
    for (const line of lines) {
      const match = line.match(/([\u4e00-\u9fa5A-Za-z0-9·_-]{2,32}(?:旗舰店|专营店|专卖店|官方店|企业店|工厂店|生活馆|研究所|店))/);
      if (match) return cleanShop(match[1]);
    }
    return '页面内商家';
  }

  function cleanShop(value) {
    const text = normalizeText(value)
      .replace(/(?:¥|￥)\s*[0-9,]+(?:\s*\.\s*[0-9]{1,2})?/g, ' ')
      .replace(/(?:券后|到手价|价格|折后价|促销价|现价|活动价)[:：\s]*[0-9,]+(?:\s*\.\s*[0-9]{1,2})?/g, ' ')
      .replace(/(?:月销|月售|已售|销量|售出|付款|成交|热销|已拼|卖出|回购|采购)\s*[\d,.]+(?:万|千|w|W|k|K|\+)?/g, ' ')
      .replace(/[\d,.]+(?:万|千|w|W|k|K)?\+?\s*(?:人付款|人已买|件已售|已售|销量|成交|人想买|人加购|人已拼|次采购|人回购)/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const match = text.match(/([\u4e00-\u9fa5A-Za-z0-9·_-]{2,32}(?:旗舰店|专营店|专卖店|官方店|企业店|工厂店|生活馆|研究所|店))/);
    return (match?.[1] || text).slice(0, 32);
  }

  function extractImage(card) {
    const candidates = [];
    if (card.matches?.('img, source, picture')) candidates.push(resolveImageSource(card));
    safeElementQueryAll(card, 'img, source, picture, video, [style*="background"], [data-src], [data-original], [data-lazy-src], [data-img], [data-image], [data-image-url], [data-img-url], [data-cover], [data-cover-url], [data-poster], [data-thumb], [data-thumbnail], [data-pic], [data-pic-url]')
      .slice(0, 20)
      .forEach((node) => candidates.push(resolveImageSource(node)));
    return candidates.map(normalizeUrl).find((url) => url && !url.startsWith('data:')) || '';
  }

  function extractMediaItems(card, primaryUrl) {
    const candidates = [];
    safeElementQueryAll(card, 'img, source, picture, video, [style*="background"], [data-src], [data-original], [data-lazy-src], [data-img], [data-image], [data-image-url], [data-img-url], [data-cover], [data-cover-url], [data-poster], [data-thumb], [data-thumbnail], [data-pic], [data-pic-url]')
      .slice(0, 24)
      .forEach((node) => {
        const url = normalizeUrl(resolveImageSource(node));
        if (!url || url.startsWith('data:') || candidates.some((item) => item.url === url)) return;
        candidates.push({
          url,
          type: /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url) ? 'video' : 'image',
          label: node.getAttribute?.('alt') || node.getAttribute?.('title') || `页面素材 ${candidates.length + 1}`
        });
      });
    if (primaryUrl && !candidates.some((item) => item.url === primaryUrl)) {
      candidates.unshift({ url: primaryUrl, type: 'image', label: '商品主图' });
    }
    return candidates.slice(0, 8);
  }

  function resolveImageSource(node) {
    if (!(node instanceof HTMLElement)) return '';
    const attrs = [
      'currentSrc',
      'src',
      'data-src',
      'data-original',
      'data-lazy-src',
      'data-ks-lazyload',
      'data-lazyload',
      'data-actualsrc',
      'data-imgurl',
      'data-img',
      'data-image',
      'data-image-url',
      'data-img-url',
      'data-cover',
      'data-cover-url',
      'data-poster',
      'data-thumb',
      'data-thumbnail',
      'data-pic',
      'data-pic-url',
      'poster'
    ];
    for (const attr of attrs) {
      const raw = attr === 'currentSrc' ? node.currentSrc : node.getAttribute(attr);
      if (raw) return firstSrcFromSet(raw);
    }
    const srcset = node.getAttribute('srcset') || node.getAttribute('data-srcset');
    if (srcset) return firstSrcFromSet(srcset);
    const background = [
      node.style?.backgroundImage,
      node.style?.background,
      node.getAttribute('style')
    ].filter(Boolean).join(' ');
    const match = background.match(/url\(["']?([^"')]+)["']?\)/i)
      || background.match(/--[^:]+:\s*url\(["']?([^"')]+)["']?\)/i)
      || background.match(/https?:\/\/[^"')\s]+/i)
      || background.match(/\/\/[^"')\s]+/i);
    return match?.[1] || '';
  }

  function firstSrcFromSet(value) {
    return String(value || '').split(',').map((part) => part.trim().split(/\s+/)[0]).find(Boolean) || '';
  }

  function extractPrice(text) {
    const priceText = String(text || '').replace(/\s+/g, ' ');
    const patterns = [
      /(?:¥|￥)\s*([0-9][0-9,]*)(?:\s*\.\s*([0-9]{1,2}))?/g,
      /(?:券后价?|到手价|价格|售价|折后价|促销价|现价|活动价)[:：\s]*([0-9][0-9,]*)(?:\s*\.\s*([0-9]{1,2}))?/g
    ];
    for (const pattern of patterns) {
      const matches = [...priceText.matchAll(pattern)]
        .map((match) => Number(`${String(match[1]).replace(/,/g, '')}${match[2] ? `.${match[2]}` : ''}`))
        .filter((value) => value > 0 && value < 100000);
      if (matches.length) return Math.min(...matches);
    }
    return 0;
  }

  function extractPriceFromCard(card, text) {
    const priceNodes = card instanceof HTMLElement
      ? safeElementQueryAll(card, '[class*="price" i], [class*="Price" i], [class*="amount" i], [class*="money" i], [class*="yen" i], [class*="promotion" i], [data-price], [data-price-cent], [data-promotion-price], [aria-label*="价"], [title*="价"]')
      : [];
    const attrPrices = priceNodes
      .slice(0, 12)
      .flatMap((node) => [
        parsePlainPrice(node.getAttribute('data-price')),
        parsePlainPrice(node.getAttribute('data-promotion-price')),
        parsePlainPrice(node.getAttribute('data-price-cent'), 100)
      ])
      .filter((value) => value > 0 && value < 100000);
    if (attrPrices.length) return Math.min(...attrPrices);
    const nodeText = priceNodes
      .slice(0, 12)
      .map((node) => [
        node.getAttribute('data-price'),
        node.getAttribute('data-price-cent') ? String(Number(node.getAttribute('data-price-cent')) / 100) : '',
        node.getAttribute('data-promotion-price'),
        node.getAttribute('aria-label'),
        node.getAttribute('title'),
        node.innerText || node.textContent
      ].filter(Boolean).join(' '))
      .join(' ');
    return extractPrice(`${nodeText}\n${text}`);
  }

  function parsePlainPrice(value, divisor = 1) {
    const number = Number(String(value || '').replace(/[,+]/g, ''));
    if (!Number.isFinite(number) || number <= 0) return 0;
    return number / divisor;
  }

  function extractSales(text) {
    const patterns = [
      /(?:月销|月售|已售|销量|累计销量|售出|付款|成交|热销|已拼|已抢|卖出)\s*([0-9,.]+)\s*(万|w|W|千|k|K)?\+?/g,
      /(?:回购|采购|订购)\s*([0-9,.]+)\s*(万|w|W|千|k|K)?\+?/g,
      /([0-9,.]+)\s*(万|w|W|千|k|K)?\+?\s*(?:人付款|人已买|件已售|已售|销量|成交|人想买|人加购|人已拼|单已售|笔成交|次采购|人回购)/g
    ];
    const values = [];
    for (const pattern of patterns) {
      for (const match of String(text || '').matchAll(pattern)) {
        values.push(parseCommerceNumber(match[1], match[2]));
      }
    }
    return Math.max(0, ...values.filter(Number.isFinite));
  }

  function extractSalesTrend(card) {
    if (!(card instanceof HTMLElement)) return [];
    const candidates = [];
    const trendAttrs = [
      'data-sales-trend',
      'data-sales-history',
      'data-daily-sales',
      'data-trend',
      'data-volume-trend',
      'data-sale-trend',
      'data-history-sales',
      'data-chart-data',
      'data-values',
      'data-series',
      'data-statistics',
      'data-sold-history'
    ];

    collectTrendAttributes(card, trendAttrs, candidates);
    const selector = [
      trendAttrs.map((name) => `[${name}]`).join(', '),
      '[class*="trend" i]',
      '[class*="history" i]',
      '[class*="chart" i]',
      '[class*="daily" i]',
      '[class*="sales" i]',
      '[class*="sale" i]',
      '[class*="volume" i]',
      '[id*="trend" i]',
      '[id*="history" i]',
      '[id*="chart" i]',
      '[id*="daily" i]',
      '[aria-label*="trend" i]',
      '[aria-label*="history" i]',
      '[aria-label*="sales" i]',
      '[title*="trend" i]',
      '[title*="history" i]',
      '[title*="sales" i]'
    ].filter(Boolean).join(', ');

    safeElementQueryAll(card, selector).slice(0, 80).forEach((node) => {
      collectTrendAttributes(node, trendAttrs, candidates);
      const text = normalizeText([
        node.getAttribute('aria-label'),
        node.getAttribute('title'),
        node.innerText || node.textContent
      ].filter(Boolean).join('\n'));
      if (looksLikeTrendText(node, text)) candidates.push(text);
    });

    for (const candidate of candidates) {
      const values = parseTrendValues(candidate);
      if (values.length >= 2) return values.slice(-30);
    }
    return [];
  }

  function collectTrendAttributes(node, names, candidates) {
    if (!(node instanceof HTMLElement)) return;
    names.forEach((name) => {
      const value = node.getAttribute(name);
      if (value) candidates.push(value);
    });
  }

  function looksLikeTrendText(node, text) {
    if (!text) return false;
    const hint = normalizeText([
      node.getAttribute('class'),
      node.getAttribute('id'),
      node.getAttribute('aria-label'),
      node.getAttribute('title'),
      text.slice(0, 80)
    ].filter(Boolean).join(' '));
    return /(trend|history|chart|daily|sales|sale|volume|series|statistics|sold)/i.test(hint)
      || /[\u8d8b\u52bf\u5386\u53f2\u65e5\u9500\u9500\u91cf\u6210\u4ea4]/.test(hint);
  }

  function parseTrendValues(value) {
    const raw = normalizeText(value);
    if (!raw) return [];

    const structured = parseStructuredTrend(raw);
    if (structured.length >= 2) return structured;

    const dateValues = [];
    const datePattern = /(?:20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\b\d{1,2}[-/.]\d{1,2}\b)[^\d]{0,16}([0-9][0-9,.]*)(?:\s*(\u4e07|w|W|\u5343|k|K))?/g;
    for (const match of raw.matchAll(datePattern)) {
      dateValues.push(parseCommerceNumber(match[1], match[2]));
    }
    const cleanDateValues = cleanTrendValues(dateValues);
    if (cleanDateValues.length >= 2) return cleanDateValues;

    const keyValues = [];
    const keyPattern = /(?:sales?|sold|volume|qty|count|value|\u9500\u91cf|\u65e5\u9500|\u6210\u4ea4|\u5df2\u552e)[^\d]{0,12}([0-9][0-9,.]*)(?:\s*(\u4e07|w|W|\u5343|k|K))?/g;
    for (const match of raw.matchAll(keyPattern)) {
      keyValues.push(parseCommerceNumber(match[1], match[2]));
    }
    const cleanKeyValues = cleanTrendValues(keyValues);
    if (cleanKeyValues.length >= 2) return cleanKeyValues;

    const cleaned = raw
      .replace(/20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}/g, ' ')
      .replace(/\b\d{1,2}[-/.]\d{1,2}\b/g, ' ')
      .replace(/\b\d{1,2}:\d{2}\b/g, ' ')
      .replace(/(?:\u8fd1|last)\s*\d+\s*(?:\u65e5|\u5929|days?)/ig, ' ');
    const listValues = [];
    const numberPattern = /([0-9][0-9,.]*)(?:\s*(\u4e07|w|W|\u5343|k|K))?/g;
    for (const match of cleaned.matchAll(numberPattern)) {
      listValues.push(parseCommerceNumber(match[1], match[2]));
    }
    return cleanTrendValues(listValues);
  }

  function parseStructuredTrend(value) {
    const compact = value.trim();
    if (!/^[\[{]/.test(compact)) return [];
    try {
      const parsed = JSON.parse(compact);
      return cleanTrendValues(readTrendFromStructuredValue(parsed));
    } catch {
      return [];
    }
  }

  function readTrendFromStructuredValue(value) {
    if (Array.isArray(value)) {
      return value.flatMap((item) => readTrendFromStructuredValue(item));
    }
    if (typeof value === 'number') return [value];
    if (typeof value === 'string') {
      const parsed = parseCommerceNumber(value);
      return parsed ? [parsed] : [];
    }
    if (value && typeof value === 'object') {
      const keys = ['sales', 'sale', 'sold', 'volume', 'qty', 'count', 'value', 'amount', '成交', '销量', '已售', '日销'];
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          return readTrendFromStructuredValue(value[key]);
        }
      }
      return Object.values(value).flatMap((item) => readTrendFromStructuredValue(item));
    }
    return [];
  }

  function cleanTrendValues(values) {
    return values
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item >= 0 && item < 1000000000)
      .slice(-30);
  }

  function parseCommerceNumber(value, unit = '') {
    const number = Number(String(value || '').replace(/[,+]/g, ''));
    if (!Number.isFinite(number)) return 0;
    if (/万|w/i.test(unit)) return Math.round(number * 10000);
    if (/千|k/i.test(unit)) return Math.round(number * 1000);
    return Math.round(number);
  }

  function extractSellingPoints(text) {
    const points = [];
    if (/包邮/.test(text)) points.push('包邮权益');
    if (/券|优惠|满减|立减|到手价/.test(text)) points.push('价格优惠');
    if (/月销|已售|付款|成交/.test(text)) points.push('销量背书');
    if (/现货|发货|次日达|送达|顺丰|急速达/.test(text)) points.push('履约明确');
    if (/官方|旗舰店|正品|品牌/.test(text)) points.push('品牌/店铺线索');
    if (/新品|上新|热销|爆款/.test(text)) points.push('页面热度信号');
    return points.slice(0, 4);
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\u200b-\u200f\ufeff]/g, '')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function readVisibleText(node) {
    return node instanceof HTMLElement ? node.innerText || node.textContent || '' : '';
  }

  function extractProductLink(card) {
    const links = [];
    if (card.matches?.('a[href]')) links.push(card);
    safeElementQueryAll(card, 'a[href]').slice(0, 24).forEach((link) => links.push(link));
    const best = links
      .map((link) => normalizeUrl(link.getAttribute('href') || ''))
      .filter(Boolean)
      .sort((a, b) => Number(isProductUrl(b)) - Number(isProductUrl(a)))[0];
    return best || '';
  }

  function isProductUrl(url) {
    return /(?:item\.htm|detail\.htm|goods\.html|item\.jd\.com|m\.tb\.cn|mobile\.yangkeduo\.com|haohuo\.jinritemai|detail\.1688\.com|kwaixiaodian|youzan|itemId|item_id|goodsId|goods_id|gid=|productId|product_id|skuId|sku_id|wareId|ware_id|spuId|spu_id|offerId|offer_id|commodityId|commodity_id|\/item\/|\/goods\/|\/product\/|\/sku\/|\/offer\/|\/commodity\/)/i.test(url);
  }

  function normalizeUrl(raw) {
    const value = String(raw || '').trim();
    if (!value || value.startsWith('data:') || /^(javascript|file|blob):/i.test(value)) return '';
    try {
      if (value.startsWith('//')) return `https:${value}`;
      if (/^https?:\/\//i.test(value)) return value.replace(/^http:/i, 'https:');
      return new URL(value, location.href).href.replace(/^http:/i, 'https:');
    } catch {
      return '';
    }
  }

  function hasProductData(node) {
    return Boolean(findFirstAttribute(node, [
      'data-item-id',
      'data-itemid',
      'data-nid',
      'data-auction-id',
      'data-offer-id',
      'data-offerid',
      'data-product-id',
      'data-productid',
      'data-goods-id',
      'data-goodsid',
      'data-gid',
      'data-sku-id',
      'data-sku',
      'data-sku-code',
      'data-ware-id',
      'data-wareid',
      'data-spu-id',
      'data-spuid',
      'data-commodity-id',
      'data-commodityid'
    ]));
  }

  function findFirstAttribute(node, names) {
    if (!(node instanceof HTMLElement)) return '';
    for (const name of names) {
      const value = node.getAttribute(name);
      if (value) return value;
    }
    const child = safeElementQueryAll(node, names.map((name) => `[${name}]`).join(', '))[0];
    if (child instanceof HTMLElement) {
      for (const name of names) {
        const value = child.getAttribute(name);
        if (value) return value;
      }
    }
    return '';
  }

  function safeElementQueryAll(root, selector) {
    try {
      return [...root.querySelectorAll(selector)];
    } catch {
      return [];
    }
  }

  function uniqueElements(items) {
    return [...new Set(items.filter(Boolean))];
  }

  function dedupeProducts(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = `${item.title}|${item.price}|${item.shop}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
