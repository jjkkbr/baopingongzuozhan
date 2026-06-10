import { spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9433 + Math.floor(Math.random() * 1000);
const rootDir = resolve(import.meta.dirname, '..');
const profileDir = resolve(rootDir, `.edge-extension-verify-${Date.now()}`);
const fixtureUrl = pathToFileURL(resolve(rootDir, 'scripts/fixtures/edge-extension-products.html')).href;
const popupPath = resolve(rootDir, 'edge-extension/popup.js');

await mkdir(profileDir, { recursive: true });

const edge = spawn(edgePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDir}`,
  'about:blank'
], {
  stdio: 'ignore',
  windowsHide: true
});

try {
  await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`).catch(() => null);
    return Boolean(response?.ok);
  }, 12000);

  const target = await createTarget(fixtureUrl);
  const client = await connectCdp(target.webSocketDebuggerUrl);
  await client.send('Runtime.enable');
  await client.send('Page.enable');

  const loadPromise = waitForEvent(client, 'Page.loadEventFired', 12000).catch(() => null);
  await client.send('Page.navigate', { url: fixtureUrl });
  await loadPromise;

  const popupSource = await readFile(popupPath, 'utf8');
  const collectSource = extractCollectFunction(popupSource);
  const result = await client.evaluate(`(${collectSource})()`);
  await client.close();

  const products = Array.isArray(result?.products) ? result.products : [];
  const titles = products.map((product) => product.title);
  const failures = [];

  if (products.length !== 10) failures.push(`Expected 10 products, got ${products.length}.`);
  if (!titles.some((title) => title.includes('高速吹风机'))) failures.push('Missing Taobao-like card.');
  if (!titles.some((title) => title.includes('厨房多功能切菜器'))) failures.push('Missing Douyin-like card.');
  if (!titles.some((title) => title.includes('便携旅行收纳包'))) failures.push('Missing generic product-link card.');
  if (!titles.some((title) => title.includes('无线蓝牙降噪耳机'))) failures.push('Missing JD-like card.');
  if (!titles.some((title) => title.includes('家用加厚抽屉式收纳箱'))) failures.push('Missing PDD-like card.');
  if (!titles.some((title) => title.includes('春夏通勤防晒轻薄外套'))) failures.push('Missing content-commerce card.');
  if (!titles.some((title) => title.includes('硅胶折叠水杯'))) failures.push('Missing 1688 offer card.');
  if (!titles.some((title) => title.includes('儿童防滑训练筷'))) failures.push('Missing Kuaishou commodity card.');
  if (!titles.some((title) => title.includes('小型桌面加湿器'))) failures.push('Missing merchant table row.');
  if (!titles.some((title) => title.includes('猫咪自动饮水机'))) failures.push('Missing compact Tmall card.');
  if (titles.some((title) => title.includes('广告位'))) failures.push('Banner was incorrectly parsed as a product.');
  if (titles.some((title) => title.includes('直播入口'))) failures.push('Live entry was incorrectly parsed as a product.');
  if (titles.some((title) => title.includes('优惠券'))) failures.push('Coupon component was incorrectly parsed as a product.');
  if (products.some((product) => !product.price || !product.sales)) failures.push('Every fixture product should include price and sales.');
  if (products.some((product) => !product.imageUrl)) failures.push('Every fixture product should include an image URL.');
  if (products.some((product) => !Array.isArray(product.mediaItems) || !product.mediaItems.length)) failures.push('Every fixture product should include mediaItems.');
  const trendProducts = products.filter((product) => Array.isArray(product.salesTrend) && product.salesTrend.length >= 3);
  if (trendProducts.length < 4) {
    failures.push(`At least four fixture products should include real salesTrend from visible DOM data, got ${trendProducts.length}.`);
  }

  if (failures.length) {
    throw new Error(`${failures.join(' ')} Products: ${JSON.stringify(products)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    productCount: products.length,
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      price: product.price,
      sales: product.sales,
      salesTrend: product.salesTrend,
      shop: product.shop,
      hasImage: Boolean(product.imageUrl),
      confidence: product.confidence
    }))
  }, null, 2));
} finally {
  edge.kill();
  setTimeout(() => rm(profileDir, { recursive: true, force: true }).catch(() => null), 500);
}

function extractCollectFunction(source) {
  const start = source.indexOf('async function collectProductsFromPage');
  if (start < 0) throw new Error('Cannot find collectProductsFromPage in popup.js.');
  return source.slice(start).trim();
}

async function createTarget(url) {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, {
    method: 'PUT'
  });
  if (!response.ok) {
    throw new Error(`Cannot create browser target: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function connectCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  const pending = new Map();
  const listeners = new Map();
  let id = 0;

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve: done, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else done(message.result || {});
      return;
    }
    const callbacks = listeners.get(message.method) || [];
    callbacks.forEach((callback) => callback(message.params || {}));
  });

  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', rejectOpen, { once: true });
  });

  return {
    send(method, params = {}) {
      id += 1;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolveSend, rejectSend) => {
        pending.set(id, { resolve: resolveSend, reject: rejectSend });
      });
    },
    evaluate(expression) {
      return this.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true
      }).then((result) => result.result?.value);
    },
    on(method, callback) {
      listeners.set(method, [...(listeners.get(method) || []), callback]);
    },
    close() {
      socket.close();
    }
  };
}

function waitForEvent(client, method, timeoutMs) {
  return new Promise((resolveEvent, rejectEvent) => {
    const timer = setTimeout(() => rejectEvent(new Error(`Timed out waiting for ${method}`)), timeoutMs);
    client.on(method, (params) => {
      clearTimeout(timer);
      resolveEvent(params);
    });
  });
}

async function waitFor(check, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 120));
  }
  throw new Error('Timed out waiting for condition');
}
