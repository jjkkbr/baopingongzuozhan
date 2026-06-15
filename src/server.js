import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');
const storageRoot = process.env.AD_WORKBENCH_USER_DATA_DIR
  ? resolve(process.env.AD_WORKBENCH_USER_DATA_DIR)
  : rootDir;
const publicDir = join(rootDir, 'public');
const dataDir = join(storageRoot, 'data');
const outputDir = join(storageRoot, 'output');
const extensionDir = process.env.AD_WORKBENCH_EXTENSION_DIR
  ? resolve(process.env.AD_WORKBENCH_EXTENSION_DIR)
  : join(rootDir, 'edge-extension');
const sampleDataPath = join(rootDir, 'data', 'products.sample.json');
const aiConfigPath = join(dataDir, 'ai-config.local.json');
const batchJobsPath = join(dataDir, 'batch-jobs.local.json');
const complianceRulesPath = join(dataDir, 'compliance-rules.local.json');
const complianceAuditRecordsPath = join(dataDir, 'compliance-audit-records.local.json');
const authorizationCredentialsPath = join(dataDir, 'authorization-credentials.local.json');
const materialRightsPath = join(dataDir, 'material-rights.local.json');
const defaultComplianceRules = {
  sensitiveTerms: [
    { id: 'sensitive-01', term: '最强', severity: 'high', replacement: '更适合日常使用', note: '绝对化表述' },
    { id: 'sensitive-02', term: '最优', severity: 'high', replacement: '更合适的选择', note: '绝对化表述' },
    { id: 'sensitive-03', term: '第一', severity: 'high', replacement: '更多人选择', note: '排序类表达' },
    { id: 'sensitive-04', term: '顶级', severity: 'high', replacement: '高规格', note: '极限词' },
    { id: 'sensitive-05', term: '国家级', severity: 'high', replacement: '符合相关标准', note: '需证据支撑' },
    { id: 'sensitive-06', term: '全网最优', severity: 'high', replacement: '限时方案', note: '绝对化表述' },
    { id: 'sensitive-07', term: '100%', severity: 'high', replacement: '尽量提升', note: '百分比承诺' },
    { id: 'sensitive-08', term: '百分百', severity: 'high', replacement: '尽量提升', note: '百分比承诺' },
    { id: 'sensitive-09', term: '永久', severity: 'medium', replacement: '长期使用', note: '时间承诺' },
    { id: 'sensitive-10', term: '保证', severity: 'medium', replacement: '帮助提升', note: '结果承诺' },
    { id: 'sensitive-11', term: '根治', severity: 'high', replacement: '帮助缓解', note: '医疗化表述' },
    { id: 'sensitive-12', term: '治愈', severity: 'high', replacement: '帮助改善', note: '医疗化表述' },
    { id: 'sensitive-13', term: '疗效', severity: 'high', replacement: '使用感受', note: '医疗化表述' },
    { id: 'sensitive-14', term: '无副作用', severity: 'high', replacement: '温和配方', note: '强结果承诺' }
  ],
  brandRules: [
    { id: 'brand-01', term: '品牌logo', severity: 'medium', replacement: '授权素材', note: '检查品牌露出' },
    { id: 'brand-02', term: '第三方标志', severity: 'high', replacement: '自有素材', note: '避免未授权标识' },
    { id: 'brand-03', term: '店铺标识', severity: 'medium', replacement: '授权渠道', note: '核对店铺露出' },
    { id: 'brand-04', term: '平台水印', severity: 'high', replacement: '干净素材', note: '去除平台角标' },
    { id: 'brand-05', term: '品牌露出', severity: 'medium', replacement: '授权展示', note: '确认授权范围' },
    { id: 'brand-06', term: '同款', severity: 'medium', replacement: '相似风格', note: '避免未经授权暗示' },
    { id: 'brand-07', term: '联名', severity: 'medium', replacement: '合作款', note: '确认合作关系' },
    { id: 'brand-08', term: '大牌', severity: 'medium', replacement: '高质感', note: '避免模糊指代' }
  ]
};
const port = Number(process.env.PORT || 4173);
const DEFAULT_BATCH_LIST_LIMIT = 10;
const MAX_BATCH_HISTORY = 80;
const MAX_BATCH_LIST_LIMIT = 50;
const MAX_BATCH_PRODUCTS_PER_JOB = 50;
const MAX_BATCH_PENDING_JOBS = 6;
const MAX_BATCH_PENDING_ITEMS = 160;
const MAX_BATCH_CREATE_PER_MINUTE = 8;
const MAX_ACTIVE_BATCH_JOBS = 2;
const MAX_BATCH_ITEM_CONCURRENCY = 2;
const MAX_AUDIT_RECORDS = 200;
const MAX_AUTHORIZATION_CREDENTIALS = 300;
const MAX_MATERIAL_RIGHTS = 300;
const defaultAiConfig = {
  apiKey: '',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen-plus',
  visualApiKey: '',
  visualBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  visualModel: 'qwen-vl-plus',
  timeoutMs: 20000
};
let savedAiConfig = await readSavedAiConfig();
let savedComplianceRules = await readSavedComplianceRules();
let complianceAuditRecords = await readComplianceAuditRecords();
let authorizationCredentials = await readAuthorizationCredentials();
let materialRightsRecords = await readMaterialRightsRecords();
let aiConfig = buildAiConfig(savedAiConfig);
let latestExtensionImport = {
  products: [],
  count: 0,
  sourceUrl: '',
  receivedAt: '',
  diagnostics: {},
  qualityReport: {},
  warnings: []
};
let batchJobs = await readSavedBatchJobs();
let batchActiveCount = 0;
let batchSchedulerQueued = false;
let batchCreateTimestamps = [];
let batchPersistChain = Promise.resolve();
let complianceAuditPersistChain = Promise.resolve();
let authorizationCredentialPersistChain = Promise.resolve();
let materialRightPersistChain = Promise.resolve();
if (batchJobs.some((job) => job.status === 'queued')) scheduleBatchProcessing();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4'
};

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: http: https:",
  "media-src 'self' data: blob: http: https:",
  "connect-src 'self'",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "frame-src 'none'"
].join('; ');

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), fullscreen=(self)'
};

const platformNames = {
  taobao: '淘宝',
  douyin: '抖音',
  csv: '导入数据',
  sample: '样例数据'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'OPTIONS') {
      sendOptions(res);
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    const status = Number(error?.status || error?.statusCode || 500);
    sendJson(res, Number.isFinite(status) && status >= 400 && status < 600 ? status : 500, {
      error: error?.code || 'SERVER_ERROR',
      message: error instanceof Error ? error.message : String(error),
      hint: error?.hint || ''
    });
  }
});

export async function startServer(options = {}) {
  const listenPort = Number(options.port ?? port);
  const host = options.host || '';
  const urlHost = host || 'localhost';
  if (server.listening) {
    const address = server.address();
    const activePort = typeof address === 'object' && address ? address.port : listenPort;
    return { server, port: activePort, url: `http://${urlHost}:${activePort}` };
  }

  await new Promise((resolveListen, rejectListen) => {
    const onError = (error) => {
      server.off('listening', onListening);
      rejectListen(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolveListen();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    if (host) server.listen(listenPort, host);
    else server.listen(listenPort);
  });

  const address = server.address();
  const activePort = typeof address === 'object' && address ? address.port : listenPort;
  return { server, port: activePort, url: `http://${urlHost}:${activePort}` };
}

function isDirectRun() {
  return process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

if (isDirectRun()) {
  const { url } = await startServer();
  console.log(`Ad Replica Studio running at ${url}`);
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      version: '0.1.0',
      compliance: [
        'Only use official APIs, merchant-owned exports, or explicit authorization.',
        'Generate original ad concepts; do not clone protected creative assets.'
      ]
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/ai-config') {
    sendJson(res, 200, publicAiConfig());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/ai-config') {
    const body = await readJsonBody(req);
    const updated = updateSavedAiConfig(body);
    await mkdir(dataDir, { recursive: true });
    await writeFile(aiConfigPath, JSON.stringify(updated, null, 2), 'utf8');
    savedAiConfig = updated;
    aiConfig = buildAiConfig(savedAiConfig);
    sendJson(res, 200, publicAiConfig());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/ai-config/test') {
    const result = await testAiConnection('primary');
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/ai-config/test-visual') {
    const result = await testAiConnection('visual');
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/compliance-rules') {
    sendJson(res, 200, publicComplianceRules());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/compliance-rules/export') {
    const exported = buildComplianceRulesExport();
    sendJsonDownload(res, 200, exported, `compliance-rules-${formatDateStamp()}.json`);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/compliance-rules') {
    const body = await readJsonBody(req);
    const updated = updateSavedComplianceRules(body);
    await mkdir(dataDir, { recursive: true });
    await writeFile(complianceRulesPath, JSON.stringify(updated, null, 2), 'utf8');
    savedComplianceRules = updated;
    sendJson(res, 200, publicComplianceRules());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/compliance-rules/preview-import') {
    const body = await readJsonBody(req);
    const mode = body.mode === 'replace' ? 'replace' : 'merge';
    sendJson(res, 200, previewComplianceRulesImport(body.rules || body, { mode }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/compliance-rules/import') {
    const body = await readJsonBody(req);
    const mode = body.mode === 'replace' ? 'replace' : 'merge';
    const updated = importSavedComplianceRules(body.rules || body, { mode });
    await mkdir(dataDir, { recursive: true });
    await writeFile(complianceRulesPath, JSON.stringify(updated, null, 2), 'utf8');
    savedComplianceRules = updated;
    sendJson(res, 200, {
      ...publicComplianceRules(),
      importMode: mode
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/compliance-rules/rollback') {
    const body = await readJsonBody(req);
    const updated = rollbackComplianceRules(body.version || body.snapshotVersion || body.id);
    await mkdir(dataDir, { recursive: true });
    await writeFile(complianceRulesPath, JSON.stringify(updated, null, 2), 'utf8');
    savedComplianceRules = updated;
    sendJson(res, 200, publicComplianceRules());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/compliance-audits') {
    const limit = clamp(Number(url.searchParams.get('limit') || 20), 1, 100);
    sendJson(res, 200, publicComplianceAuditRecords(limit));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/compliance-audits/export') {
    const exported = buildComplianceAuditRecordsExport();
    sendJsonDownload(res, 200, exported, `compliance-audit-records-${formatDateStamp()}.json`);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/authorization-credentials') {
    const limit = clamp(Number(url.searchParams.get('limit') || 20), 1, 100);
    sendJson(res, 200, publicAuthorizationCredentials(limit));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/authorization-credentials') {
    const body = await readJsonBody(req);
    const credential = await appendAuthorizationCredential(body);
    sendJson(res, 200, {
      credential,
      ...publicAuthorizationCredentials(20)
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/authorization-credentials/export') {
    const exported = buildAuthorizationCredentialsExport();
    sendJsonDownload(res, 200, exported, `authorization-credentials-${formatDateStamp()}.json`);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/material-rights') {
    const limit = clamp(Number(url.searchParams.get('limit') || 20), 1, 100);
    sendJson(res, 200, publicMaterialRightsRecords(limit));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/material-rights') {
    const body = await readJsonBody(req);
    const record = await appendMaterialRightRecord(body);
    sendJson(res, 200, {
      record,
      ...publicMaterialRightsRecords(20)
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/material-rights/export') {
    const exported = buildMaterialRightsExport();
    sendJsonDownload(res, 200, exported, `material-rights-${formatDateStamp()}.json`);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/open/output-dir') {
    const result = await openWorkbenchDirectory('output');
    sendJson(res, result.ok ? 200 : 500, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/open/extension-dir') {
    const result = await openWorkbenchDirectory('extension');
    sendJson(res, result.ok ? 200 : 500, result);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/products') {
    const products = await getProductsFromQuery(url);
    sendJson(res, 200, {
      products,
      source: url.searchParams.get('source') || 'sample',
      generatedAt: new Date().toISOString()
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/import/csv') {
    const body = await readJsonBody(req);
    const products = parseCsvProducts(String(body.csv || ''));
    sendJson(res, 200, {
      products,
      count: products.length
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/import/sales-history') {
    const body = await readJsonBody(req);
    const result = importSalesHistory(body);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/import/authorized-text') {
    const body = await readJsonBody(req);
    const result = parseAuthorizedTextProducts(String(body.content || body.text || body.html || ''), {
      platform: body.platform || 'taobao',
      category: body.category || '淘宝导入商品',
      audience: body.audience || '淘宝高购买意图用户'
    });
    sendJson(res, 200, {
      products: result.products,
      count: result.products.length,
      warnings: result.warnings
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/import/extension-products') {
    const body = await readJsonBody(req);
    const imported = Array.isArray(body.products) ? body.products : [];
    const products = imported
      .map((item, index) => normalizeProduct({
        id: item.id || `edge-${stableId(`${item.title || item.name || index}-${item.price || ''}-${item.shop || ''}`)}`,
        platform: item.platform || body.platform || 'taobao',
        title: item.title || item.name,
        category: item.category || body.category || 'Edge 插件导入商品',
        shop: item.shop || item.store || '页面内商家',
        price: item.price,
        sales: item.sales || item.volume,
        commissionRate: item.commissionRate || 0,
        imageUrl: item.imageUrl || item.image || '',
        mediaType: item.mediaType || inferMediaType(item.mediaUrl || item.imageUrl || item.image || ''),
        mediaUrl: item.mediaUrl || item.imageUrl || item.image || '',
        sellingPoints: Array.isArray(item.sellingPoints) ? item.sellingPoints : extractSellingPointsFromText(`${item.title || ''} ${item.badges || ''}`),
        audience: item.audience || '当前页面高购买意图用户',
        sourceNotice: item.sourceNotice || '',
        salesTrend: item.salesTrend || item.salesHistory || item.dailySales || item.trend
      }))
      .filter((product) => product.title && product.title !== '未命名商品')
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 80)
      .map((product, index) => ({
        ...product,
        rank: index + 1,
        score: scoreProduct(product)
      }));
    latestExtensionImport = {
      products,
      count: products.length,
      sourceUrl: body.sourceUrl || '',
      receivedAt: new Date().toISOString(),
      diagnostics: body.diagnostics || {},
      qualityReport: buildExtensionQualityReport(products, {
        sourceUrl: body.sourceUrl || '',
        pageTitle: body.pageTitle || '',
        diagnostics: body.diagnostics || {}
      }),
      warnings: [
        '已接收 Edge 插件从当前浏览器页面读取的商品信息。',
        '请确认该页面内容来自你有权访问、复制或使用的数据源，并保留授权或后台截图。'
      ]
    };
    sendJson(res, 200, {
      ...latestExtensionImport
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/extension/latest') {
    sendJson(res, 200, latestExtensionImport);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/batch/jobs') {
    const limit = clamp(Number(url.searchParams.get('limit') || DEFAULT_BATCH_LIST_LIMIT), 1, MAX_BATCH_LIST_LIMIT);
    const includeArchived = url.searchParams.get('includeArchived') === '1' || url.searchParams.get('archived') === '1';
    const status = String(url.searchParams.get('status') || 'all');
    const query = String(url.searchParams.get('q') || url.searchParams.get('keyword') || '');
    const jobs = listBatchJobs({ includeArchived, status, query });
    sendJson(res, 200, {
      jobs: jobs.slice(0, limit),
      total: jobs.length,
      activeCount: batchActiveCount,
      queue: buildBatchQueueState(),
      generatedAt: new Date().toISOString()
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/batch/jobs') {
    const body = await readJsonBody(req);
    const job = await createBatchJob(body);
    sendJson(res, 200, { job, queue: buildBatchQueueState() });
    return;
  }

  const batchActionMatch = url.pathname.match(/^\/api\/batch\/jobs\/([^/]+)\/(cancel|retry|archive|restore)$/);
  if (req.method === 'POST' && batchActionMatch) {
    const [, id, action] = batchActionMatch;
    const body = await readJsonBody(req);
    const result = await runBatchJobAction(decodeURIComponent(id), action, body);
    sendJson(res, 200, { ...result, queue: buildBatchQueueState() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/analyze-media') {
    const body = await readJsonBody(req);
    const product = normalizeProduct(body.product || body);
    const analysis = await analyzeMediaWithAi(product, body.options || {});
    sendJson(res, 200, { analysis });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/analyze-visual-risk') {
    const body = await readJsonBody(req);
    const product = normalizeProduct(body.product || body);
    const visualRisk = await analyzeVisualRiskWithAi(product, body.options || {});
    const analysis = {
      ...analyzeMedia(product),
      visualRisk
    };
    sendJson(res, 200, { analysis, visualRisk });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/generate-ad') {
    const body = await readJsonBody(req);
    const product = normalizeProduct(body.product || {});
    const mediaAnalysis = body.mediaAnalysis || analyzeMedia(product);
    const ad = attachAdQuality(product, mediaAnalysis, generateAdConcept(product, mediaAnalysis, body.options || {}));
    sendJson(res, 200, { ad, quality: ad.quality || null });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/audit-compliance') {
    const body = await readJsonBody(req);
    const product = normalizeProduct(body.product || {});
    const mediaAnalysis = body.mediaAnalysis || analyzeMedia(product);
    const audit = auditCompliance(product, mediaAnalysis, body.ad || null, {
      source: body.source || product.platform,
      credentials: findAuthorizationCredentialsForProduct(product, body.source || product.platform),
      materialRights: findMaterialRightsForProduct(product, body.source || product.platform)
    });
    const record = await appendComplianceAuditRecord({
      product,
      mediaAnalysis,
      ad: body.ad || null,
      audit,
      source: body.source || product.platform,
      operator: body.operator || ''
    });
    sendJson(res, 200, { audit, record });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/export-plan') {
    const body = await readJsonBody(req);
    const exported = buildProfessionalPlanExport(body);
    const productTitle = safeFileName(exported.product?.title || 'ad-plan', 'ad-plan');
    const exportBundle = await writeProfessionalPlanBundle(exported, productTitle);
    sendJson(res, 200, {
      ...exportBundle,
      schema: exported.schema,
      summary: exported.delivery?.summary || ''
    });
    return;
  }

  sendJson(res, 404, {
    error: 'NOT_FOUND',
    message: `No route for ${req.method} ${url.pathname}`
  });
}

async function getProductsFromQuery(url) {
  const source = url.searchParams.get('source') || 'sample';
  const platform = url.searchParams.get('platform') || 'all';
  const limit = clamp(Number(url.searchParams.get('limit') || 10), 1, 50);
  const keyword = (url.searchParams.get('keyword') || '').trim();
  let products;

  if (source === 'taobao') {
    products = await fetchTaobaoProducts({ keyword, limit });
  } else if (source === 'douyin') {
    products = await fetchDouyinProducts({ keyword, limit });
  } else {
    products = await readSampleProducts();
  }

  return products
    .filter((product) => platform === 'all' || product.platform === platform)
    .filter((product) => !keyword || `${product.title} ${product.category} ${product.shop}`.includes(keyword))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit)
    .map((product, index) => ({
      ...product,
      rank: index + 1,
      score: scoreProduct(product)
    }));
}

async function readSavedBatchJobs() {
  try {
    const content = await readFile(batchJobsPath, 'utf8');
    const parsed = JSON.parse(content);
    const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : [];
    return jobs
      .map((job) => normalizeBatchJobRecord(job))
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, MAX_BATCH_HISTORY);
  } catch {
    return [];
  }
}

function listBatchJobs({ includeArchived = false, status = 'all', query = '' } = {}) {
  const normalizedStatus = String(status || 'all').toLowerCase();
  const effectiveIncludeArchived = includeArchived || normalizedStatus === 'archived';
  const normalizedQuery = normalizeBatchSearchQuery(query);
  return batchJobs
    .filter((job) => effectiveIncludeArchived || job.status !== 'archived')
    .filter((job) => normalizedStatus === 'all' || job.status === normalizedStatus)
    .filter((job) => !normalizedQuery || batchJobSearchText(job).includes(normalizedQuery))
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function normalizeBatchSearchQuery(value) {
  return String(value || '').normalize('NFKC').toLowerCase().trim();
}

function batchJobSearchText(job = {}) {
  const parts = [
    job.id,
    job.title,
    job.mode,
    job.sourceType,
    job.sourceJobId,
    job.sourceJobTitle,
    job.source,
    job.status,
    job.note,
    job.error?.message,
    job.error?.hint,
    job.output?.summaryFile,
    job.output?.reportFile,
    job.output?.tableFile,
    job.output?.manifestFile,
    job.output?.directory
  ];
  for (const item of job.items || []) {
    const product = item.product || {};
    parts.push(
      item.id,
      item.status,
      item.error?.message,
      product.id,
      product.title,
      product.shop,
      product.category,
      product.platform,
      product.sourceUrl,
      product.url
    );
  }
  return normalizeBatchSearchQuery(parts.filter(Boolean).join(' '));
}

function activeOrQueuedBatchJobs() {
  return batchJobs.filter((job) => job.status === 'queued' || job.status === 'running');
}

function countPendingBatchItems() {
  return activeOrQueuedBatchJobs().reduce((sum, job) => {
    const items = Array.isArray(job.items) ? job.items : [];
    return sum + items.filter((item) => item.status === 'queued' || item.status === 'running').length;
  }, 0);
}

function pruneBatchCreateTimestamps(nowMs = Date.now()) {
  const windowStart = nowMs - 60 * 1000;
  batchCreateTimestamps = batchCreateTimestamps.filter((timestamp) => timestamp > windowStart);
  return batchCreateTimestamps;
}

function buildBatchQueueState() {
  const activeJobs = activeOrQueuedBatchJobs();
  const queuedJobs = activeJobs.filter((job) => job.status === 'queued');
  const runningJobs = activeJobs.filter((job) => job.status === 'running');
  const pendingItems = countPendingBatchItems();
  const createTimestamps = pruneBatchCreateTimestamps();
  return {
    activeCount: batchActiveCount,
    runningJobs: runningJobs.length,
    queuedJobs: queuedJobs.length,
    pendingJobs: activeJobs.length,
    pendingItems,
    maxActiveJobs: MAX_ACTIVE_BATCH_JOBS,
    maxItemConcurrency: MAX_BATCH_ITEM_CONCURRENCY,
    maxPendingJobs: MAX_BATCH_PENDING_JOBS,
    maxPendingItems: MAX_BATCH_PENDING_ITEMS,
    maxItemsPerJob: MAX_BATCH_PRODUCTS_PER_JOB,
    maxCreatePerMinute: MAX_BATCH_CREATE_PER_MINUTE,
    createRemaining: Math.max(0, MAX_BATCH_CREATE_PER_MINUTE - createTimestamps.length),
    listLimit: MAX_BATCH_LIST_LIMIT,
    historyLimit: MAX_BATCH_HISTORY
  };
}

function assertBatchProductsWithinLimit(count) {
  if (count <= MAX_BATCH_PRODUCTS_PER_JOB) return;
  throw createHttpError(
    400,
    `单个批量任务最多支持 ${MAX_BATCH_PRODUCTS_PER_JOB} 个商品，请拆分后再提交。`,
    'BATCH_TOO_MANY_ITEMS',
    '一次提交过多商品容易造成 AI 调用拥堵，建议按平台、类目或选品批次拆成多个任务。'
  );
}

function assertBatchQueueCapacity(items = []) {
  const activeJobs = activeOrQueuedBatchJobs();
  const pendingItems = countPendingBatchItems();
  if (activeJobs.length >= MAX_BATCH_PENDING_JOBS) {
    throw createHttpError(
      429,
      '当前批量队列积压较多，请等待任务完成、取消或归档后再提交。',
      'BATCH_QUEUE_FULL',
      `当前排队/运行任务 ${activeJobs.length}/${MAX_BATCH_PENDING_JOBS}。`
    );
  }
  if (pendingItems + items.length > MAX_BATCH_PENDING_ITEMS) {
    throw createHttpError(
      429,
      '当前待处理商品过多，请等待任务完成后再提交。',
      'BATCH_PENDING_ITEMS_FULL',
      `当前待处理 ${pendingItems}/${MAX_BATCH_PENDING_ITEMS} 件，本次准备新增 ${items.length} 件。`
    );
  }
}

function assertBatchCreateRateLimit() {
  const nowMs = Date.now();
  const timestamps = pruneBatchCreateTimestamps(nowMs);
  if (timestamps.length >= MAX_BATCH_CREATE_PER_MINUTE) {
    throw createHttpError(
      429,
      '批量任务创建过于频繁，请稍后再试。',
      'BATCH_CREATE_RATE_LIMIT',
      `最近 1 分钟最多创建 ${MAX_BATCH_CREATE_PER_MINUTE} 个批量任务。`
    );
  }
  timestamps.push(nowMs);
}

function findBatchJob(id) {
  return batchJobs.find((job) => job.id === id) || null;
}

function normalizeBatchJobRecord(input = {}) {
  const createdAt = String(input.createdAt || new Date().toISOString());
  const items = Array.isArray(input.items)
    ? input.items.map((item) => normalizeBatchJobItem(item)).filter(Boolean)
    : [];
  const normalizedStatus = normalizeBatchJobStatus(input.status);
  return {
    id: String(input.id || makeBatchJobId()),
    title: String(input.title || buildBatchJobTitle(input.mode, items.length, input.sourceJobTitle || '')),
    mode: input.mode === 'audit' ? 'audit' : 'generate',
    sourceType: input.sourceType === 'batch-job' ? 'batch-job' : 'products',
    sourceJobId: String(input.sourceJobId || ''),
    sourceJobTitle: String(input.sourceJobTitle || ''),
    source: String(input.source || ''),
    options: normalizeBatchOptions(input.options),
    status: normalizedStatus === 'running' ? 'queued' : normalizedStatus,
    createdAt,
    startedAt: String(input.startedAt || ''),
    completedAt: String(input.completedAt || ''),
    updatedAt: String(input.updatedAt || input.completedAt || createdAt),
    error: normalizeBatchError(input.error),
    items,
    counts: normalizeBatchCounts(input.counts, items),
    output: normalizeBatchJobOutput(input.output),
    note: String(input.note || '')
  };
}

function normalizeBatchJobItem(input = {}) {
  const product = normalizeProduct(input.product || input);
  const status = normalizeBatchItemStatus(input.status);
  const isQueued = status === 'queued';
  return {
    id: String(input.id || product.id),
    product,
    status,
    createdAt: String(input.createdAt || new Date().toISOString()),
    startedAt: isQueued ? '' : String(input.startedAt || ''),
    completedAt: isQueued ? '' : String(input.completedAt || ''),
    sourceAnalysis: input.sourceAnalysis || null,
    sourceAd: input.sourceAd || null,
    sourceAudit: input.sourceAudit || null,
    analysis: input.analysis || null,
    ad: input.ad || null,
    audit: input.audit || null,
    error: normalizeBatchError(input.error),
    output: normalizeBatchItemOutput(input.output)
  };
}

function normalizeBatchJobStatus(value) {
  return ['queued', 'running', 'completed', 'failed', 'cancelled', 'archived'].includes(value) ? value : 'queued';
}

function normalizeBatchItemStatus(value) {
  return ['queued', 'running', 'completed', 'failed', 'cancelled'].includes(value) ? value : 'queued';
}

function normalizeBatchOptions(input = {}) {
  return {
    format: input.format === 'poster' ? 'poster' : 'short_video',
    tone: ['direct', 'urgent', 'premium'].includes(input.tone) ? input.tone : 'direct',
    duration: clamp(Number(input.duration || 20), 5, 120)
  };
}

function normalizeBatchCounts(input = {}, items = []) {
  const counts = {
    total: items.length,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0
  };
  for (const item of items) {
    const status = normalizeBatchItemStatus(item.status);
    counts[status] = (counts[status] || 0) + 1;
  }
  if (input && typeof input === 'object') {
    counts.total = Number(input.total || counts.total || 0);
  }
  return counts;
}

function normalizeBatchJobOutput(input = {}) {
  return {
    directory: String(input.directory || ''),
    summaryFile: String(input.summaryFile || ''),
    reportFile: String(input.reportFile || ''),
    tableFile: String(input.tableFile || ''),
    manifestFile: String(input.manifestFile || ''),
    itemFiles: Array.isArray(input.itemFiles)
      ? input.itemFiles.map((item) => ({
          index: Number(item.index || 0),
          title: String(item.title || ''),
          filename: String(item.filename || ''),
          filepath: String(item.filepath || '')
        })).filter((item) => item.filename || item.filepath)
      : []
  };
}

function normalizeBatchItemOutput(input = {}) {
  return {
    filename: String(input.filename || ''),
    filepath: String(input.filepath || '')
  };
}

function normalizeBatchError(input, fallbackStage = '') {
  if (!input) return null;
  const status = Number(input.status || input.statusCode || input.response?.status || 0);
  const code = String(input.code || input.errorCode || '').trim();
  const stage = String(input.stage || input.batchStage || fallbackStage || '').trim();
  const retryable = input.retryable;
  let message;
  let hint;
  if (typeof input === 'string') {
    message = input;
    hint = '';
  } else {
    message = String(input.message || input.error || input.reason || '任务处理失败');
    hint = String(input.hint || '');
  }
  const category = classifyBatchError({ message, hint, code, status, stage });
  return {
    message,
    hint,
    code,
    category,
    categoryLabel: batchErrorCategoryLabel(category),
    stage,
    stageLabel: batchStageLabel(stage),
    retryable: typeof retryable === 'boolean' ? retryable : isBatchErrorRetryable({ category, code, status })
  };
}

function normalizeBatchErrorForStage(input, stage = '') {
  return normalizeBatchError(input, stage);
}

function markBatchErrorStage(error, stage = '') {
  if (error && typeof error === 'object') {
    error.batchStage = error.batchStage || stage;
  }
  return error;
}

function classifyBatchError({ message = '', hint = '', code = '', status = 0, stage = '' } = {}) {
  const text = `${message} ${hint} ${code} ${stage}`.toLowerCase();
  if (String(code).startsWith('BATCH_') || status === 429 || /queue|rate limit|too many|队列|频繁|上限|最多|待处理/.test(text)) {
    return 'queue_limit';
  }
  if (/enoent|eacces|eperm|permission denied|write|mkdir|disk|output|file|directory|导出|写入|目录|文件|磁盘/.test(text)) {
    return 'export_write';
  }
  if (/enotfound|getaddrinfo|econnrefused|etimedout|fetch failed|timeout|aborted|network|dns|proxy|无法连接|网络|代理/.test(text)) {
    return 'network';
  }
  if (status === 401 || status === 403 || /api[_ -]?key|apikey|unauthorized|authentication|auth|invalid key|未配置.*key|密钥|不被.*base url/.test(text)) {
    return 'ai_config';
  }
  if (/model|模型|not found|does not exist|unsupported|permission|quota|insufficient|开通|权限|额度|不支持/.test(text)) {
    return 'model_permission';
  }
  if (/taobao|douyin|开放平台|platform api|http 5|http 4|api failed/.test(text)) {
    return 'platform_api';
  }
  if (/empty|invalid|parse|json|csv|字段|商品|至少一个|未找到可复审|输入|导入/.test(text)) {
    return 'input_data';
  }
  if (/compliance|audit|rule|credential|合规|审核|规则|敏感词|授权凭证/.test(text)) {
    return 'compliance';
  }
  return 'system';
}

function batchErrorCategoryLabel(category) {
  const labels = {
    queue_limit: '队列限制',
    export_write: '导出写入',
    network: '网络连接',
    ai_config: 'AI 配置',
    model_permission: '模型权限',
    platform_api: '平台接口',
    input_data: '输入数据',
    compliance: '合规审核',
    system: '系统异常'
  };
  return labels[category] || labels.system;
}

function batchStageLabel(stage) {
  const labels = {
    job: '任务调度',
    analysis: '素材分析',
    creative: '创意生成',
    audit: '合规审核',
    audit_record: '审核留痕',
    export: '导出写入'
  };
  return labels[stage] || '';
}

function isBatchErrorRetryable({ category, code, status } = {}) {
  if (String(code || '').startsWith('BATCH_')) return true;
  if (status === 429 || status >= 500) return true;
  return ['queue_limit', 'network', 'platform_api', 'export_write', 'system'].includes(category);
}

function makeBatchJobId() {
  return `batch-${Date.now()}-${stableId(`${Date.now()}-${Math.random()}-${batchJobs.length}`)}`;
}

function buildBatchJobTitle(mode, total, sourceJobTitle = '') {
  const label = mode === 'audit'
    ? sourceJobTitle
      ? '方案复审'
      : '批量审核'
    : '批量生成';
  return `${label} · ${total}件`;
}

async function createBatchJob(body = {}) {
  const mode = body.mode === 'audit' ? 'audit' : 'generate';
  const sourceJobId = String(body.sourceJobId || '').trim();
  const sourceJob = sourceJobId ? findBatchJob(sourceJobId) : null;
  const now = new Date().toISOString();
  if (sourceJobId && !sourceJob) {
    throw createHttpError(404, '未找到可复审的批量任务。', 'BATCH_SOURCE_NOT_FOUND');
  }
  if (sourceJobId && !sourceJob) {
    throw new Error('未找到可复审的批量任务。');
  }
  const sourceItems = sourceJob
    ? (sourceJob.items || []).map((item) => ({
        product: normalizeProduct(item.product || item),
        analysis: item.analysis || item.sourceAnalysis || null,
        ad: item.ad || item.sourceAd || null,
        audit: item.audit || item.sourceAudit || null
      }))
    : (Array.isArray(body.products) ? body.products : [])
      .map((item) => ({ product: normalizeProduct(item) }));

  const items = sourceItems.map((sourceItem) => ({
    id: sourceItem.product.id,
    product: sourceItem.product,
    status: 'queued',
    createdAt: now,
    startedAt: '',
    completedAt: '',
    sourceAnalysis: sourceItem.analysis || null,
    sourceAd: sourceItem.ad || null,
    sourceAudit: sourceItem.audit || null,
    analysis: null,
    ad: null,
    audit: null,
    error: null,
    output: normalizeBatchItemOutput()
  }));

  if (!items.length) {
    throw createHttpError(400, '请先选择至少一个商品。', 'BATCH_EMPTY_PRODUCTS');
  }
  assertBatchProductsWithinLimit(items.length);
  assertBatchQueueCapacity(items);
  assertBatchCreateRateLimit();

  if (!items.length) {
    throw new Error('请先选择至少一个商品。');
  }

  const job = normalizeBatchJobRecord({
    id: makeBatchJobId(),
    title: buildBatchJobTitle(mode, items.length, sourceJob?.title || ''),
    mode,
    sourceType: sourceJob ? 'batch-job' : 'products',
    sourceJobId,
    sourceJobTitle: sourceJob?.title || '',
    source: String(body.source || sourceJob?.source || items[0]?.product?.platform || 'sample'),
    options: body.options || {},
    status: 'queued',
    createdAt: now,
    startedAt: '',
    completedAt: '',
    updatedAt: now,
    items,
    counts: normalizeBatchCounts({}, items),
    output: {
      directory: '',
      summaryFile: '',
      reportFile: '',
      tableFile: '',
      manifestFile: '',
      itemFiles: []
    }
  });

  batchJobs = [job, ...batchJobs.filter((item) => item.id !== job.id)];
  await persistBatchJobs();
  scheduleBatchProcessing();
  return job;
}

async function runBatchJobAction(id, action, body = {}) {
  const job = findBatchJob(id);
  if (!job) throw new Error('未找到批量任务。');
  if (action === 'cancel') {
    return cancelBatchJob(job);
  }
  if (action === 'retry') {
    const retryJob = await retryBatchJob(job, body);
    return { job: retryJob, sourceJob: job };
  }
  if (action === 'archive') {
    return archiveBatchJob(job);
  }
  if (action === 'restore') {
    return restoreBatchJob(job);
  }
  throw new Error('不支持的批量任务操作。');
}

async function cancelBatchJob(job) {
  const now = new Date().toISOString();
  if (job.status === 'queued') {
    job.status = 'cancelled';
    job.completedAt = now;
  } else if (job.status === 'running') {
    job.cancelRequested = true;
    job.status = 'cancelled';
    job.completedAt = now;
  }
  job.updatedAt = now;
  job.items.forEach((item) => {
    if (item.status === 'queued') {
      item.status = 'cancelled';
      item.completedAt = now;
    }
  });
  job.counts = normalizeBatchCounts({}, job.items);
  await writeBatchSummary(job).catch(() => {});
  await persistBatchJobs();
  scheduleBatchProcessing();
  return { job };
}

async function retryBatchJob(job, body = {}) {
  const retryableItems = (job.items || [])
    .filter((item) => ['failed', 'cancelled'].includes(item.status))
    .map((item) => ({
      ...item.product,
      sourceAnalysis: item.analysis || item.sourceAnalysis || null,
      sourceAd: item.ad || item.sourceAd || null,
      sourceAudit: item.audit || item.sourceAudit || null
    }));
  const products = retryableItems.length
    ? retryableItems
    : (job.items || []).map((item) => item.product).filter(Boolean);
  if (!products.length) {
    throw createHttpError(400, '该任务没有可重试的商品。', 'BATCH_NO_RETRY_PRODUCTS');
  }
  if (!products.length) throw new Error('该任务没有可重试的商品。');
  return createBatchJob({
    mode: body.mode || job.mode,
    source: body.source || job.source,
    products,
    options: body.options || job.options || {}
  });
}

async function archiveBatchJob(job) {
  if (job.status === 'running' || job.status === 'queued') {
    await cancelBatchJob(job);
  }
  const previousStatus = job.status === 'archived'
    ? (job.archiveMeta?.previousStatus || inferRestoredBatchStatus(job))
    : job.status;
  job.status = 'archived';
  job.updatedAt = new Date().toISOString();
  job.archiveMeta = {
    previousStatus,
    archivedAt: job.updatedAt
  };
  job.note = compact([String(job.note || '').replace(/\s*\/?\s*archived\s*/g, '').trim(), 'archived']).join(' / ');
  await persistBatchJobs();
  return { job };
}

async function restoreBatchJob(job) {
  if (job.status !== 'archived') {
    return { job };
  }
  const restoredStatus = normalizeBatchJobStatus(job.archiveMeta?.previousStatus || inferRestoredBatchStatus(job));
  job.status = restoredStatus === 'archived' ? inferRestoredBatchStatus(job) : restoredStatus;
  job.updatedAt = new Date().toISOString();
  job.archiveMeta = {
    ...(job.archiveMeta || {}),
    restoredAt: job.updatedAt
  };
  job.note = String(job.note || '').replace(/\s*\/?\s*archived\s*/g, '').trim();
  await persistBatchJobs();
  return { job };
}

function inferRestoredBatchStatus(job) {
  const items = Array.isArray(job.items) ? job.items : [];
  if (items.some((item) => item.status === 'failed')) return 'failed';
  if (items.some((item) => item.status === 'cancelled')) return 'cancelled';
  if (items.length && items.every((item) => item.status === 'completed')) return 'completed';
  return 'completed';
}

function scheduleBatchProcessing() {
  if (batchSchedulerQueued) return;
  batchSchedulerQueued = true;
  queueMicrotask(() => {
    batchSchedulerQueued = false;
    void runBatchScheduler();
  });
}

async function runBatchScheduler() {
  while (batchActiveCount < MAX_ACTIVE_BATCH_JOBS) {
    const job = batchJobs
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .find((item) => item.status === 'queued');
    if (!job) return;
    startBatchJob(job);
  }
}

function startBatchJob(job) {
  if (job.status !== 'queued') return;
  batchActiveCount += 1;
  const startedAt = new Date().toISOString();
  job.status = 'running';
  job.startedAt = job.startedAt || startedAt;
  job.updatedAt = startedAt;
  job.error = null;
  void (async () => {
    try {
      await persistBatchJobs();
      await processBatchJob(job);
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      job.updatedAt = job.completedAt;
      job.error = normalizeBatchErrorForStage(error, 'job') || {
        message: error instanceof Error ? error.message : String(error),
        hint: ''
      };
      await writeBatchSummary(job).catch(() => {});
    } finally {
      batchActiveCount = Math.max(0, batchActiveCount - 1);
      job.counts = normalizeBatchCounts({}, job.items);
      await persistBatchJobs();
      scheduleBatchProcessing();
    }
  })().catch((error) => {
    console.error('Batch job runner failed', error);
  });
}

async function processBatchJob(job) {
  const outputDirectory = join(outputDir, 'batch-runs', job.id);
  try {
    await mkdir(outputDirectory, { recursive: true });
  } catch (error) {
    throw markBatchErrorStage(error, 'export');
  }
  job.output = {
    directory: outputDirectory,
    summaryFile: join(outputDirectory, 'summary.json'),
    reportFile: join(outputDirectory, 'batch-report.md'),
    tableFile: join(outputDirectory, 'batch-summary.csv'),
    manifestFile: join(outputDirectory, 'manifest.json'),
    itemFiles: []
  };
  job.updatedAt = new Date().toISOString();
  await persistBatchJobs();

  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(MAX_BATCH_ITEM_CONCURRENCY, job.items.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      if (job.status === 'cancelled' || job.cancelRequested) return;
      const index = nextIndex;
      nextIndex += 1;
      if (index >= job.items.length) return;
      await processBatchItem(job, job.items[index], index);
    }
  });

  await Promise.all(workers);
  if (job.status === 'archived') {
    job.archiveMeta = {
      ...(job.archiveMeta || {}),
      previousStatus: job.archiveMeta?.previousStatus || (job.cancelRequested ? 'cancelled' : inferRestoredBatchStatus(job))
    };
  } else if (job.cancelRequested || job.status === 'cancelled') {
    job.status = 'cancelled';
  } else {
    job.status = 'completed';
  }
  job.completedAt = new Date().toISOString();
  job.updatedAt = job.completedAt;
  job.counts = normalizeBatchCounts({}, job.items);
  try {
    await writeBatchSummary(job);
  } catch (error) {
    throw markBatchErrorStage(error, 'export');
  }
}

async function processBatchItem(job, item, index) {
  if (job.status === 'cancelled' || job.cancelRequested || item.status === 'cancelled') {
    item.status = 'cancelled';
    item.completedAt = new Date().toISOString();
    job.counts = normalizeBatchCounts({}, job.items);
    await persistBatchJobs();
    return;
  }
  const startedAt = new Date().toISOString();
  item.status = 'running';
  item.startedAt = item.startedAt || startedAt;
  item.error = null;
  job.updatedAt = startedAt;
  await persistBatchJobs();

  let currentStage = 'analysis';
  try {
    currentStage = 'analysis';
    const analysis = item.sourceAnalysis && job.sourceType === 'batch-job'
      ? item.sourceAnalysis
      : await analyzeMediaWithAi(item.product, job.options);
    item.analysis = analysis;

    currentStage = 'creative';
    if (job.mode === 'generate') {
      item.ad = attachAdQuality(item.product, analysis, generateAdConcept(item.product, analysis, job.options));
    } else if (job.sourceType === 'batch-job') {
      item.ad = item.sourceAd || item.ad || null;
    } else {
      item.ad = null;
    }

    currentStage = 'audit';
    item.audit = auditCompliance(item.product, analysis, item.ad, {
      source: job.source || item.product.platform,
      credentials: findAuthorizationCredentialsForProduct(item.product, job.source || item.product.platform),
      materialRights: findMaterialRightsForProduct(item.product, job.source || item.product.platform)
    });
    currentStage = 'audit_record';
    await appendComplianceAuditRecord({
      product: item.product,
      mediaAnalysis: analysis,
      ad: item.ad,
      audit: item.audit,
      source: job.source || item.product.platform,
      operator: `batch:${job.id}`
    });
    item.status = 'completed';
  } catch (error) {
    item.status = 'failed';
    item.error = normalizeBatchErrorForStage(error, currentStage) || {
      message: error instanceof Error ? error.message : String(error),
      hint: ''
    };
  }

  item.completedAt = new Date().toISOString();
  try {
    const outputFile = buildBatchItemOutput(job, item, index);
    item.output = outputFile;
    await writeJsonFile(outputFile.filepath, buildBatchItemPayload(job, item, index));
    job.output.itemFiles[index] = {
      index: index + 1,
      title: item.product.title,
      filename: outputFile.filename,
      filepath: outputFile.filepath
    };
  } catch (error) {
    item.status = 'failed';
    item.completedAt = new Date().toISOString();
    item.error = normalizeBatchErrorForStage(error, 'export') || {
      message: error instanceof Error ? error.message : String(error),
      hint: ''
    };
  }
  job.counts = normalizeBatchCounts({}, job.items);
  job.updatedAt = item.completedAt;
  await writeBatchSummary(job);
  await persistBatchJobs();
}

function buildBatchItemOutput(job, item, index) {
  const prefix = String(index + 1).padStart(2, '0');
  const title = safeFileName(item.product.title, `item-${index + 1}`);
  const filename = `${prefix}-${title}.json`;
  return {
    filename,
    filepath: join(job.output.directory, filename)
  };
}

function buildBatchItemPayload(job, item, index) {
  const batch = {
    batch: {
      id: job.id,
      title: job.title,
      mode: job.mode,
      sourceType: job.sourceType,
      sourceJobId: job.sourceJobId,
      sourceJobTitle: job.sourceJobTitle,
      source: job.source,
      index: index + 1,
      total: job.items.length,
      exportedAt: new Date().toISOString()
    }
  };
  if (!item.error && item.ad) {
    return {
      ...buildProfessionalPlanExport({
        product: item.product,
        analysis: item.analysis,
        ad: item.ad,
        audit: item.audit,
        source: job.source || item.product.platform,
        exportedAt: batch.batch.exportedAt
      }),
      batch: batch.batch
    };
  }
  return {
    schema: 'ad-workbench.batch-item',
    version: 1,
    ...batch,
    product: item.product,
    analysis: item.analysis,
    ad: item.ad,
    audit: item.audit,
    error: item.error
  };
}

async function writeBatchSummary(job) {
  if (!job.output?.summaryFile) return;
  const summaryPayload = buildBatchSummaryPayload(job);
  await writeJsonFile(job.output.summaryFile, summaryPayload);
  if (job.output.reportFile) {
    await writeTextFile(job.output.reportFile, buildBatchReportMarkdown(job, summaryPayload));
  }
  if (job.output.tableFile) {
    await writeTextFile(job.output.tableFile, buildBatchSummaryCsv(job));
  }
  if (job.output.manifestFile) {
    await writeJsonFile(job.output.manifestFile, buildBatchManifest(job, summaryPayload));
  }
}

function buildBatchSummaryPayload(job) {
  const itemFiles = Array.isArray(job.output?.itemFiles)
    ? job.output.itemFiles.filter(Boolean).sort((a, b) => Number(a.index || 0) - Number(b.index || 0))
    : [];
  return {
    batch: {
      id: job.id,
      title: job.title,
      mode: job.mode,
      sourceType: job.sourceType,
      sourceJobId: job.sourceJobId,
      sourceJobTitle: job.sourceJobTitle,
      source: job.source,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      updatedAt: job.updatedAt,
      counts: job.counts,
      output: {
        ...job.output,
        itemFiles
      }
    },
    items: job.items.map((item, index) => ({
      index: index + 1,
      id: item.id,
      title: item.product.title,
      status: item.status,
      score: batchProductScore(item.product),
      output: item.output,
      error: item.error ? buildBatchErrorSnapshot(item.error) : null,
      ad: item.ad
        ? {
            format: item.ad.format,
            title: item.ad.title,
            headline: item.ad.headline || '',
            cta: item.ad.cta || '',
            quality: buildBatchCreativeQualitySnapshot(item.ad.quality)
          }
        : null,
      audit: item.audit
        ? buildBatchAuditSnapshot(item.audit)
        : null
    }))
  };
}

function buildBatchErrorSnapshot(error = {}) {
  const normalized = normalizeBatchError(error) || {};
  return {
    message: normalized.message || '',
    hint: normalized.hint || '',
    code: normalized.code || '',
    category: normalized.category || 'system',
    categoryLabel: normalized.categoryLabel || batchErrorCategoryLabel(normalized.category),
    stage: normalized.stage || '',
    stageLabel: normalized.stageLabel || batchStageLabel(normalized.stage),
    retryable: Boolean(normalized.retryable)
  };
}

function buildBatchCreativeQualitySnapshot(quality) {
  if (!quality) return null;
  return {
    score: quality.score,
    grade: quality.grade || '',
    level: quality.level || '',
    status: quality.status || '',
    statusLabel: quality.statusLabel || '',
    gate: quality.publishReadiness?.gate || '',
    summary: quality.summary || ''
  };
}

function buildBatchAuditSnapshot(audit) {
  if (!audit) return null;
  return {
    score: audit.score,
    level: audit.level,
    summary: audit.summary,
    checkCounts: {
      total: Array.isArray(audit.checks) ? audit.checks.length : 0,
      failed: Array.isArray(audit.checks) ? audit.checks.filter((item) => item.status === 'fail').length : 0,
      warning: Array.isArray(audit.checks) ? audit.checks.filter((item) => item.status === 'warn').length : 0
    },
    hitCounts: {
      sensitiveTerms: Array.isArray(audit.sensitiveHits) ? audit.sensitiveHits.length : 0,
      brandRules: Array.isArray(audit.brandHits) ? audit.brandHits.length : 0
    }
  };
}

function buildBatchReportMarkdown(job, summaryPayload = buildBatchSummaryPayload(job)) {
  const metrics = buildBatchReportMetrics(job);
  const counts = summaryPayload.batch?.counts || job.counts || {};
  const fileRows = buildBatchOutputFileList(job).map((file) => [
    file.label,
    file.filename,
    file.kind
  ]);
  const itemRows = job.items.map((item, index) => {
    const quality = item.ad?.quality || {};
    const audit = item.audit || {};
    return [
      index + 1,
      item.product?.title || '',
      batchStatusLabel(item.status),
      batchProductScore(item.product),
      quality.score ?? '',
      compact([quality.grade, batchGateLabel(quality.publishReadiness?.gate)]).join(' / '),
      audit.score ?? '',
      audit.level ? riskLevelLabel(audit.level) : '',
      item.output?.filename || '',
      item.error?.categoryLabel || '',
      item.error?.stageLabel || '',
      item.error?.retryable ? '是' : item.error ? '否' : '',
      item.error?.message || ''
    ];
  });
  const failedItems = job.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.status === 'failed' || item.error);
  const nextActions = buildBatchNextActions(job, metrics);
  const lines = [
    `# ${markdownText(job.title || '批量任务报告')}`,
    '',
    '## 任务概览',
    '',
    `- 任务 ID：${markdownText(job.id)}`,
    `- 任务类型：${markdownText(batchModeLabelForReport(job.mode))}`,
    `- 任务状态：${markdownText(batchStatusLabel(job.status))}`,
    `- 数据来源：${markdownText(batchSourceLabelForReport(job))}`,
    `- 创建时间：${markdownText(job.createdAt || '')}`,
    `- 开始时间：${markdownText(job.startedAt || '')}`,
    `- 完成时间：${markdownText(job.completedAt || '')}`,
    `- 输出目录：${markdownText(job.output?.directory || '')}`,
    '',
    '## 结果概览',
    '',
    ...markdownTable(
      ['总数', '已完成', '失败', '已取消', '排队中', '运行中', '创意均分', '合规均分'],
      [[
        counts.total ?? job.items.length,
        counts.completed ?? 0,
        counts.failed ?? 0,
        counts.cancelled ?? 0,
        counts.queued ?? 0,
        counts.running ?? 0,
        metrics.creativeAverage === null ? '--' : metrics.creativeAverage,
        metrics.auditAverage === null ? '--' : metrics.auditAverage
      ]]
    ),
    '',
    ...markdownTable(['文件', '文件名', '类型'], fileRows),
    '',
    '## 商品明细',
    '',
    ...markdownTable(
      ['序号', '商品', '状态', '商品分', '创意分', '创意等级/闸门', '合规分', '合规等级', '输出文件', '错误分类', '失败阶段', '建议重试', '错误'],
      itemRows
    ),
    '',
    ...markdownList(
      '失败或需处理项',
      failedItems.map(({ item, index }) => `#${index + 1} ${item.product?.title || item.id}：${compact([
        item.error?.categoryLabel,
        item.error?.stageLabel,
        item.error?.retryable ? '建议重试' : '',
        item.error?.message || '需要人工复核'
      ]).join(' / ')}`)
    ),
    ...markdownList('下一步建议', nextActions),
    '',
    '> 本批量报告包仅用于授权商品的原创广告方案交付、人工复核和本机归档；不包含 API Key、Cookie、Token、登录态或原始授权文件内容。'
  ].flat();
  return lines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

function buildBatchSummaryCsv(job) {
  const rows = [
    [
      'index',
      'id',
      'title',
      'platform',
      'category',
      'shop',
      'status',
      'productScore',
      'creativeScore',
      'creativeGrade',
      'creativeGate',
      'auditScore',
      'auditLevel',
      'headline',
      'cta',
      'outputFile',
      'errorCategory',
      'errorCategoryLabel',
      'errorStage',
      'errorStageLabel',
      'retryable',
      'errorCode',
      'error',
      'hint'
    ]
  ];
  job.items.forEach((item, index) => {
    const quality = item.ad?.quality || {};
    const audit = item.audit || {};
    rows.push([
      index + 1,
      item.id || item.product?.id || '',
      item.product?.title || '',
      item.product?.platform || '',
      item.product?.category || '',
      item.product?.shop || '',
      item.status,
      batchProductScore(item.product),
      quality.score ?? '',
      quality.grade || '',
      quality.publishReadiness?.gate || '',
      audit.score ?? '',
      audit.level || '',
      item.ad?.headline || item.ad?.title || '',
      item.ad?.cta || '',
      item.output?.filename || '',
      item.error?.category || '',
      item.error?.categoryLabel || '',
      item.error?.stage || '',
      item.error?.stageLabel || '',
      item.error ? String(Boolean(item.error.retryable)) : '',
      item.error?.code || '',
      item.error?.message || '',
      item.error?.hint || ''
    ]);
  });
  return rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

function buildBatchManifest(job, summaryPayload = buildBatchSummaryPayload(job)) {
  const files = buildBatchOutputFileList(job).map((file) => ({
    ...file,
    filepath: file.filepath
  }));
  return {
    schema: 'ad-workbench.batch-export-bundle',
    version: 1,
    generatedAt: new Date().toISOString(),
    batch: {
      id: job.id,
      title: job.title,
      mode: job.mode,
      status: job.status,
      sourceType: job.sourceType,
      sourceJobId: job.sourceJobId,
      sourceJobTitle: job.sourceJobTitle,
      source: job.source,
      counts: summaryPayload.batch?.counts || job.counts
    },
    directory: job.output?.directory || '',
    files,
    note: '批量报告包仅用于授权商品的原创广告方案交付和人工复核，不包含 API Key、Cookie、Token、登录态或原始授权文件内容。'
  };
}

function buildBatchOutputFileList(job) {
  const output = job.output || {};
  const files = [
    { kind: 'summary-json', label: '结构化汇总', filepath: output.summaryFile },
    { kind: 'report-markdown', label: '批量报告', filepath: output.reportFile },
    { kind: 'summary-csv', label: '批量总表', filepath: output.tableFile },
    { kind: 'manifest-json', label: '文件清单', filepath: output.manifestFile },
    ...(Array.isArray(output.itemFiles) ? output.itemFiles.filter(Boolean).map((item) => ({
      kind: 'item-json',
      label: `商品 ${item.index || ''}`.trim(),
      filepath: item.filepath,
      index: item.index,
      title: item.title || ''
    })) : [])
  ].filter((file) => file.filepath);
  return files.map((file) => ({
    ...file,
    filename: file.filename || String(file.filepath).split(/[\\/]/).pop()
  }));
}

function batchProductScore(product = {}) {
  const existing = Number(product?.score);
  if (Number.isFinite(existing)) return existing;
  const computed = scoreProduct(normalizeProduct(product || {}));
  return Number.isFinite(computed) ? computed : 0;
}

function buildBatchReportMetrics(job) {
  const creativeScores = job.items
    .map((item) => Number(item.ad?.quality?.score))
    .filter(Number.isFinite);
  const auditScores = job.items
    .map((item) => Number(item.audit?.score))
    .filter(Number.isFinite);
  return {
    creativeAverage: creativeScores.length ? Math.round(creativeScores.reduce((sum, score) => sum + score, 0) / creativeScores.length) : null,
    auditAverage: auditScores.length ? Math.round(auditScores.reduce((sum, score) => sum + score, 0) / auditScores.length) : null,
    blockedCreative: job.items.filter((item) => item.ad?.quality?.publishReadiness?.gate === 'blocked').length,
    reviewCreative: job.items.filter((item) => item.ad?.quality?.publishReadiness?.gate === 'review').length,
    highAuditRisk: job.items.filter((item) => item.audit?.level === 'high').length,
    failed: job.items.filter((item) => item.status === 'failed' || item.error).length
  };
}

function buildBatchNextActions(job, metrics) {
  return compact([
    metrics.failed ? `优先处理 ${metrics.failed} 个失败项，查看错误原因后重试或单独复核。` : '',
    metrics.blockedCreative ? `${metrics.blockedCreative} 个商品创意发布闸门为 blocked，需要重写或替换素材后再导出。` : '',
    metrics.reviewCreative ? `${metrics.reviewCreative} 个商品创意需要人工复核，重点检查证据链、CTA 和原创素材要求。` : '',
    metrics.highAuditRisk ? `${metrics.highAuditRisk} 个商品合规风险为高，发布前必须处理敏感词、品牌授权或素材风险。` : '',
    job.status === 'completed' ? '把 batch-summary.csv 交给运营筛选，把 batch-report.md 交给审核复盘，逐商品 JSON 进入后续制作。' : '任务仍在处理中，等待状态完成后再做最终交付。'
  ]);
}

function batchModeLabelForReport(mode) {
  return mode === 'audit' ? '批量审核' : '批量生成';
}

function batchSourceLabelForReport(job = {}) {
  if (job.sourceType === 'batch-job') {
    return compact(['历史批量任务复审', job.sourceJobTitle || job.sourceJobId]).join(' / ');
  }
  return compact(['当前授权商品快照', job.source]).join(' / ');
}

function batchStatusLabel(status) {
  const labels = {
    queued: '排队中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
    archived: '已归档'
  };
  return labels[status] || status || '';
}

function batchGateLabel(gate) {
  const labels = {
    ready: '可进入复核',
    review: '需要复核',
    blocked: '需要重做'
  };
  return labels[gate] || gate || '';
}

function riskLevelLabel(level) {
  const labels = {
    low: '低',
    medium: '中',
    high: '高'
  };
  return labels[level] || level || '';
}

async function persistBatchJobs() {
  batchPersistChain = batchPersistChain.then(async () => {
    await mkdir(dataDir, { recursive: true });
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      jobs: batchJobs
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, MAX_BATCH_HISTORY)
    };
    await writeFile(batchJobsPath, JSON.stringify(payload, null, 2), 'utf8');
  }).catch((error) => {
    console.error('Failed to persist batch jobs', error);
  });
  return batchPersistChain;
}

async function writeJsonFile(filepath, payload) {
  await mkdir(dirname(filepath), { recursive: true });
  await writeFile(filepath, JSON.stringify(payload, null, 2), 'utf8');
}

async function writeTextFile(filepath, content) {
  await mkdir(dirname(filepath), { recursive: true });
  await writeFile(filepath, String(content || ''), 'utf8');
}

function safeFileName(value, fallback = 'item') {
  const text = String(value || fallback)
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');
  return text.slice(0, 80) || fallback;
}

function dateStampForFile(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('') + '-' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
}

async function readSavedAiConfig() {
  try {
    const content = await readFile(aiConfigPath, 'utf8');
    return sanitizeAiConfig(JSON.parse(content));
  } catch {
    return {};
  }
}

async function readSavedComplianceRules() {
  try {
    const content = await readFile(complianceRulesPath, 'utf8');
    return sanitizeSavedComplianceRules(JSON.parse(content));
  } catch {
    return emptyComplianceRulesState();
  }
}

async function readComplianceAuditRecords() {
  try {
    const content = await readFile(complianceAuditRecordsPath, 'utf8');
    const parsed = JSON.parse(content);
    const records = Array.isArray(parsed.records) ? parsed.records : Array.isArray(parsed) ? parsed : [];
    return records
      .map((record) => normalizeComplianceAuditRecord(record))
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, MAX_AUDIT_RECORDS);
  } catch {
    return [];
  }
}

async function readAuthorizationCredentials() {
  try {
    const content = await readFile(authorizationCredentialsPath, 'utf8');
    const parsed = JSON.parse(content);
    const credentials = Array.isArray(parsed.credentials) ? parsed.credentials : Array.isArray(parsed) ? parsed : [];
    return credentials
      .map((credential) => normalizeAuthorizationCredential(credential))
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, MAX_AUTHORIZATION_CREDENTIALS);
  } catch {
    return [];
  }
}

async function readMaterialRightsRecords() {
  try {
    const content = await readFile(materialRightsPath, 'utf8');
    const parsed = JSON.parse(content);
    const records = Array.isArray(parsed.records) ? parsed.records : Array.isArray(parsed) ? parsed : [];
    return records
      .map((record) => normalizeMaterialRightRecord(record))
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, MAX_MATERIAL_RIGHTS);
  } catch {
    return [];
  }
}

function buildAiConfig(saved = {}) {
  const sharedApiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.DASHSCOPE_API_KEY || saved.apiKey || defaultAiConfig.apiKey;
  return {
    apiKey: sharedApiKey,
    baseUrl: normalizeBaseUrl(process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || saved.baseUrl || defaultAiConfig.baseUrl),
    model: String(process.env.AI_MODEL || saved.model || defaultAiConfig.model),
    visualApiKey: process.env.AI_VISUAL_API_KEY || process.env.DASHSCOPE_VISUAL_API_KEY || saved.visualApiKey || '',
    visualBaseUrl: normalizeBaseUrl(process.env.AI_VISUAL_BASE_URL || saved.visualBaseUrl || defaultAiConfig.visualBaseUrl),
    visualModel: String(process.env.AI_VISUAL_MODEL || saved.visualModel || defaultAiConfig.visualModel),
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || saved.timeoutMs || defaultAiConfig.timeoutMs)
  };
}

function updateSavedAiConfig(body) {
  const next = sanitizeAiConfig({
    ...savedAiConfig,
    baseUrl: body.baseUrl,
    model: body.model,
    visualBaseUrl: body.visualBaseUrl,
    visualModel: body.visualModel,
    timeoutMs: body.timeoutMs
  });
  if (body.clearApiKey) {
    next.apiKey = '';
  } else if (String(body.apiKey || '').trim()) {
    next.apiKey = String(body.apiKey).trim();
  }
  if (body.clearVisualApiKey) {
    next.visualApiKey = '';
  } else if (String(body.visualApiKey || '').trim()) {
    next.visualApiKey = String(body.visualApiKey).trim();
  }
  return next;
}

function sanitizeAiConfig(input = {}) {
  return {
    apiKey: String(input.apiKey || '').trim(),
    baseUrl: normalizeBaseUrl(input.baseUrl || defaultAiConfig.baseUrl),
    model: String(input.model || defaultAiConfig.model).trim() || defaultAiConfig.model,
    visualApiKey: String(input.visualApiKey || '').trim(),
    visualBaseUrl: normalizeBaseUrl(input.visualBaseUrl || defaultAiConfig.visualBaseUrl),
    visualModel: String(input.visualModel || defaultAiConfig.visualModel).trim() || defaultAiConfig.visualModel,
    timeoutMs: clamp(Number(input.timeoutMs || defaultAiConfig.timeoutMs), 5000, 120000)
  };
}

function emptyComplianceRulesState() {
  return {
    version: 1,
    updatedAt: '',
    disabledDefaultRuleIds: [],
    revisionHistory: [],
    snapshots: [],
    customRules: {
      sensitiveTerms: [],
      brandRules: []
    }
  };
}

function sanitizeSavedComplianceRules(input = {}) {
  const current = input && typeof input === 'object' ? input : {};
  const customRules = current.customRules && typeof current.customRules === 'object'
    ? current.customRules
    : current;
  return {
    version: Number(current.version || 1),
    updatedAt: String(current.updatedAt || ''),
    disabledDefaultRuleIds: sanitizeDisabledComplianceRuleIds(current.disabledDefaultRuleIds || []),
    revisionHistory: sanitizeComplianceRuleRevisionHistory(current.revisionHistory || []),
    snapshots: sanitizeComplianceRuleSnapshots(current.snapshots || current.snapshotHistory || []),
    customRules: {
      sensitiveTerms: sanitizeComplianceRuleList(customRules.sensitiveTerms || current.sensitiveTerms || [], 'sensitiveTerms', 'custom'),
      brandRules: sanitizeComplianceRuleList(customRules.brandRules || current.brandRules || [], 'brandRules', 'custom')
    }
  };
}

function sanitizeDisabledComplianceRuleIds(value) {
  const validIds = new Set([
    ...defaultComplianceRules.sensitiveTerms.map((rule) => rule.id),
    ...defaultComplianceRules.brandRules.map((rule) => rule.id)
  ]);
  return Array.from(new Set(toTextList(value)))
    .filter((item) => validIds.has(item));
}

function sanitizeComplianceRuleRevisionHistory(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => ({
      version: Number(item.version || 1),
      action: String(item.action || 'update'),
      at: String(item.at || item.updatedAt || ''),
      note: String(item.note || '')
    }))
    .filter((item) => item.at)
    .slice(-20);
}

function sanitizeComplianceRuleSnapshots(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => {
      const state = sanitizeComplianceRuleSnapshotState(item.state || item);
      return {
        version: Number(item.version || state.version || 1),
        at: String(item.at || item.updatedAt || state.updatedAt || ''),
        note: String(item.note || ''),
        state
      };
    })
    .filter((item) => item.at && item.version)
    .slice(-12);
}

function sanitizeComplianceRuleSnapshotState(input = {}) {
  const current = input && typeof input === 'object' ? input : {};
  const customRules = current.customRules && typeof current.customRules === 'object'
    ? current.customRules
    : current;
  return {
    version: Number(current.version || 1),
    updatedAt: String(current.updatedAt || ''),
    disabledDefaultRuleIds: sanitizeDisabledComplianceRuleIds(current.disabledDefaultRuleIds || []),
    customRules: {
      sensitiveTerms: sanitizeComplianceRuleList(customRules.sensitiveTerms || current.sensitiveTerms || [], 'sensitiveTerms', 'custom'),
      brandRules: sanitizeComplianceRuleList(customRules.brandRules || current.brandRules || [], 'brandRules', 'custom')
    }
  };
}

function complianceRulesSnapshotState(state = {}) {
  const normalized = sanitizeComplianceRuleSnapshotState(state);
  return {
    version: normalized.version,
    updatedAt: normalized.updatedAt,
    disabledDefaultRuleIds: normalized.disabledDefaultRuleIds,
    customRules: normalized.customRules
  };
}

function sanitizeComplianceRuleList(value, kind, source) {
  const list = Array.isArray(value) ? value : [];
  const deduped = new Map();
  for (const item of list) {
    const rule = sanitizeComplianceRule(item, kind, source);
    if (!rule) continue;
    deduped.set(normalizeComplianceRuleKey(rule.term), rule);
  }
  return Array.from(deduped.values());
}

function sanitizeComplianceRule(input = {}, kind = 'sensitiveTerms', source = 'custom') {
  const term = String(input.term || input.keyword || input.word || '').trim();
  if (!term) return null;
  const severity = ['low', 'medium', 'high'].includes(String(input.severity || '').toLowerCase())
    ? String(input.severity).toLowerCase()
    : 'medium';
  return {
    id: String(input.id || `${kind}-${stableId(`${term}-${input.note || ''}-${input.replacement || ''}-${source}`)}`),
    kind,
    source,
    term,
    severity,
    replacement: String(input.replacement || '').trim(),
    note: String(input.note || '').trim(),
    brandAuthorizationStatus: kind === 'brandRules'
      ? normalizeBrandRuleAuthorizationStatus(input.brandAuthorizationStatus || input.authorizationStatus || input.authStatus || input.brandStatus)
      : '',
    brandScope: kind === 'brandRules'
      ? sanitizeComplianceBrandScope(input.brandScope || input.authorizationScope || input.authScope || input)
      : emptyComplianceBrandScope(),
    platforms: sanitizeRuleScopeList(input.platforms || input.platform || input.platformScope),
    categories: sanitizeRuleScopeList(input.categories || input.category || input.categoryScope),
    enabled: input.enabled !== false
  };
}

function emptyComplianceBrandScope() {
  return {
    brands: [],
    platforms: [],
    categories: [],
    channels: [],
    regions: [],
    campaign: '',
    startsAt: '',
    expiresAt: '',
    reference: '',
    reviewer: '',
    note: ''
  };
}

function sanitizeComplianceBrandScope(input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input)
    ? input
    : { brands: input };
  return {
    brands: toTextList(source.brands || source.brandNames || source.brand || source.authorizedBrands).slice(0, 20),
    platforms: sanitizeRuleScopeList(source.platforms || source.platform || source.platformScope || source.authorizedPlatforms),
    categories: sanitizeRuleScopeList(source.categories || source.category || source.categoryScope || source.authorizedCategories),
    channels: sanitizeRuleScopeList(source.channels || source.channelScope || source.channel || source.authorizedChannels),
    regions: sanitizeRuleScopeList(source.regions || source.regionScope || source.region || source.authorizedRegions),
    campaign: sanitizeCredentialNote(source.campaign || source.campaignScope || source.activity || source.activityScope || '').slice(0, 120),
    startsAt: normalizeOptionalDateTime(source.startsAt || source.validFrom || source.effectiveAt || ''),
    expiresAt: normalizeOptionalDateTime(source.expiresAt || source.validUntil || source.expiredAt || ''),
    reference: sanitizeCredentialReference(source.reference || source.credentialRef || source.authorizationRef || source.fileRef || ''),
    reviewer: sanitizeCredentialNote(source.reviewer || source.owner || source.confirmedBy || '').slice(0, 60),
    note: sanitizeCredentialNote(source.note || source.description || source.scopeNote || '').slice(0, 180)
  };
}

function complianceBrandScopeSummary(scope = {}) {
  const normalized = sanitizeComplianceBrandScope(scope);
  return compact([
    normalized.brands.length ? `品牌：${normalized.brands.join('、')}` : '',
    normalized.platforms.length ? `平台：${normalized.platforms.join('、')}` : '',
    normalized.categories.length ? `类目：${normalized.categories.join('、')}` : '',
    normalized.channels.length ? `渠道：${normalized.channels.join('、')}` : '',
    normalized.regions.length ? `地区：${normalized.regions.join('、')}` : '',
    normalized.campaign ? `活动：${normalized.campaign}` : '',
    normalized.expiresAt ? `有效期至：${formatScopeDate(normalized.expiresAt)}` : '',
    normalized.reference ? `凭证：${normalized.reference}` : ''
  ]).join('；');
}

function complianceBrandScopeWarnings(rule = {}, product = {}) {
  const scope = sanitizeComplianceBrandScope(rule.brandScope || {});
  const warnings = [];
  const productPlatform = normalizeComparable(product.platform || '');
  const productCategory = normalizeComparable(product.category || '');
  const productTitle = normalizeComparable(product.title || product.name || '');
  const productShop = normalizeComparable(product.shop || product.store || '');
  if (scope.platforms.length && productPlatform && !scope.platforms.map(normalizeComparable).includes(productPlatform)) {
    warnings.push(`当前平台不在品牌授权平台范围内：${scope.platforms.join('、')}`);
  }
  if (scope.categories.length && productCategory && !scope.categories.some((item) => productCategory.includes(normalizeComparable(item)))) {
    warnings.push(`当前类目不在品牌授权类目范围内：${scope.categories.join('、')}`);
  }
  if (scope.brands.length) {
    const matchedBrand = scope.brands.some((brand) => {
      const key = normalizeComparable(brand);
      return key && (productTitle.includes(key) || productShop.includes(key));
    });
    if (!matchedBrand) warnings.push(`登记品牌未明显匹配当前商品或店铺：${scope.brands.join('、')}`);
  }
  if (scope.expiresAt) {
    const expiresAt = new Date(scope.expiresAt).getTime();
    if (Number.isNaN(expiresAt)) {
      warnings.push('品牌授权有效期格式需要人工确认。');
    } else {
      const daysLeft = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) warnings.push('品牌授权已过期。');
      else if (daysLeft <= 30) warnings.push(`品牌授权 ${daysLeft} 天后到期。`);
    }
  }
  return warnings;
}

function formatScopeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toISOString().slice(0, 10);
}

function normalizeBrandRuleAuthorizationStatus(value) {
  const key = String(value || '').trim().toLowerCase();
  const aliases = {
    authorized: 'authorized',
    approved: 'authorized',
    allow: 'authorized',
    allowed: 'authorized',
    pending: 'pending_review',
    review: 'pending_review',
    pending_review: 'pending_review',
    forbidden: 'forbidden',
    blocked: 'forbidden',
    deny: 'forbidden',
    denied: 'forbidden',
    risk: 'risk',
    risk_only: 'risk',
    normal: 'risk'
  };
  return aliases[key] || 'risk';
}

function sanitizeRuleScopeList(value) {
  return toTextList(value)
    .map((item) => item.toLowerCase())
    .filter((item) => item && item !== 'all')
    .slice(0, 20);
}

function normalizeComplianceRuleKey(value) {
  return normalizeComparable(value);
}

function normalizeComparable(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '');
}

function mergeComplianceRules(saved = savedComplianceRules) {
  const normalized = sanitizeSavedComplianceRules(saved);
  const disabled = new Set(normalized.disabledDefaultRuleIds);
  return {
    sensitiveTerms: mergeComplianceRuleList('sensitiveTerms', normalized.customRules.sensitiveTerms, disabled),
    brandRules: mergeComplianceRuleList('brandRules', normalized.customRules.brandRules, disabled)
  };
}

function mergeComplianceRuleList(kind, customRules, disabledDefaultIds) {
  const merged = new Map();
  const defaults = defaultComplianceRules[kind] || [];
  for (const rule of defaults) {
    if (disabledDefaultIds.has(rule.id)) continue;
    const normalized = sanitizeComplianceRule(rule, kind, 'default');
    if (!normalized) continue;
    merged.set(normalizeComplianceRuleKey(normalized.term), normalized);
  }
  for (const rule of customRules || []) {
    const normalized = sanitizeComplianceRule(rule, kind, 'custom');
    if (!normalized) continue;
    merged.set(normalizeComplianceRuleKey(normalized.term), normalized);
  }
  return Array.from(merged.values()).filter((rule) => rule.enabled !== false);
}

function publicComplianceRules() {
  const normalized = sanitizeSavedComplianceRules(savedComplianceRules);
  const merged = mergeComplianceRules(normalized);
  const defaultSensitiveCount = defaultComplianceRules.sensitiveTerms.length;
  const defaultBrandCount = defaultComplianceRules.brandRules.length;
  const customSensitiveCount = normalized.customRules.sensitiveTerms.length;
  const customBrandCount = normalized.customRules.brandRules.length;
  const activeSensitiveCount = merged.sensitiveTerms.length;
  const activeBrandCount = merged.brandRules.length;
  return {
    version: normalized.version,
    updatedAt: normalized.updatedAt,
    defaults: defaultComplianceRules,
    disabledDefaultRuleIds: normalized.disabledDefaultRuleIds,
    customRules: normalized.customRules,
    summary: {
      defaultSensitiveCount,
      defaultBrandCount,
      customSensitiveCount,
      customBrandCount,
      activeSensitiveCount,
      activeBrandCount,
      activeCount: activeSensitiveCount + activeBrandCount,
      disabledDefaultCount: normalized.disabledDefaultRuleIds.length
    },
    revisionHistory: normalized.revisionHistory,
    snapshots: normalized.snapshots.map((item) => ({
      version: item.version,
      at: item.at,
      note: item.note,
      summary: summarizeComplianceRuleState(item.state)
    }))
  };
}

function updateSavedComplianceRules(body = {}) {
  if (body.reset) {
    return withComplianceRuleRevision({
      ...emptyComplianceRulesState(),
      snapshots: appendComplianceRuleSnapshot(savedComplianceRules, '重置前快照')
    }, 'reset', '恢复默认规则');
  }
  const current = sanitizeSavedComplianceRules(savedComplianceRules);
  const next = {
    version: Number(current.version || 1) + 1,
    updatedAt: new Date().toISOString(),
    disabledDefaultRuleIds: body.disabledDefaultRuleIds !== undefined
      ? sanitizeDisabledComplianceRuleIds(body.disabledDefaultRuleIds)
      : current.disabledDefaultRuleIds,
    revisionHistory: current.revisionHistory,
    snapshots: appendComplianceRuleSnapshot(current, '保存前快照'),
    customRules: {
      sensitiveTerms: body.customRules?.sensitiveTerms !== undefined
        ? sanitizeComplianceRuleList(body.customRules.sensitiveTerms, 'sensitiveTerms', 'custom')
        : current.customRules.sensitiveTerms,
      brandRules: body.customRules?.brandRules !== undefined
        ? sanitizeComplianceRuleList(body.customRules.brandRules, 'brandRules', 'custom')
        : current.customRules.brandRules
    }
  };
  return withComplianceRuleRevision(next, 'save', body.note || '保存规则库');
}

function withComplianceRuleRevision(input, action, note = '') {
  const normalized = sanitizeSavedComplianceRules(input);
  const version = Number(normalized.version || 1);
  normalized.updatedAt = normalized.updatedAt || new Date().toISOString();
  normalized.revisionHistory = [
    ...sanitizeComplianceRuleRevisionHistory(normalized.revisionHistory),
    {
      version,
      action,
      at: normalized.updatedAt,
      note: String(note || '')
    }
  ].slice(-20);
  return normalized;
}

function appendComplianceRuleSnapshot(state = savedComplianceRules, note = '') {
  const normalized = sanitizeSavedComplianceRules(state);
  const snapshot = {
    version: normalized.version,
    at: normalized.updatedAt || new Date().toISOString(),
    note: String(note || ''),
    state: complianceRulesSnapshotState(normalized)
  };
  return [
    ...sanitizeComplianceRuleSnapshots(normalized.snapshots || []),
    snapshot
  ]
    .filter((item, index, list) => list.findLastIndex((entry) => entry.version === item.version) === index)
    .slice(-12);
}

function summarizeComplianceRuleState(state = {}) {
  const normalized = sanitizeComplianceRuleSnapshotState(state);
  return {
    customSensitiveCount: normalized.customRules.sensitiveTerms.length,
    customBrandCount: normalized.customRules.brandRules.length,
    disabledDefaultCount: normalized.disabledDefaultRuleIds.length
  };
}

function buildComplianceRulesExport() {
  const normalized = sanitizeSavedComplianceRules(savedComplianceRules);
  const merged = mergeComplianceRules(normalized);
  return {
    schema: 'ad-workbench.compliance-rules',
    version: 1,
    exportedAt: new Date().toISOString(),
    note: '仅包含规则库配置，不包含 API Key、Cookie、Token 或登录态。',
    disabledDefaultRuleIds: normalized.disabledDefaultRuleIds,
    customRules: normalized.customRules,
    revisionHistory: normalized.revisionHistory,
    snapshots: normalized.snapshots,
    summary: publicComplianceRules().summary,
    activeRules: merged
  };
}

function importSavedComplianceRules(input = {}, options = {}) {
  const mode = options.mode === 'replace' ? 'replace' : 'merge';
  const previous = sanitizeSavedComplianceRules(savedComplianceRules);
  const current = mode === 'replace'
    ? emptyComplianceRulesState()
    : previous;
  const imported = sanitizeSavedComplianceRules(input.rules || input);
  const disabledDefaultRuleIds = mode === 'replace'
    ? imported.disabledDefaultRuleIds
    : Array.from(new Set([
        ...current.disabledDefaultRuleIds,
        ...imported.disabledDefaultRuleIds
      ]));
  return withComplianceRuleRevision({
    version: Number(previous.version || 1) + 1,
    updatedAt: new Date().toISOString(),
    disabledDefaultRuleIds,
    revisionHistory: previous.revisionHistory,
    snapshots: appendComplianceRuleSnapshot(previous, '导入前快照'),
    customRules: {
      sensitiveTerms: mergeImportedComplianceRuleList(current.customRules.sensitiveTerms, imported.customRules.sensitiveTerms, mode, 'sensitiveTerms'),
      brandRules: mergeImportedComplianceRuleList(current.customRules.brandRules, imported.customRules.brandRules, mode, 'brandRules')
    }
  }, `import:${mode}`, mode === 'replace' ? '覆盖导入规则库' : '合并导入规则库');
}

function previewComplianceRulesImport(input = {}, options = {}) {
  const mode = options.mode === 'replace' ? 'replace' : 'merge';
  const current = sanitizeSavedComplianceRules(savedComplianceRules);
  const imported = sanitizeSavedComplianceRules(input.rules || input);
  const next = importSavedComplianceRules(input, { mode });
  return {
    schema: 'ad-workbench.compliance-rules-import-preview',
    version: 1,
    mode,
    generatedAt: new Date().toISOString(),
    currentVersion: current.version,
    nextVersion: next.version,
    diff: diffComplianceRuleStates(current, imported, next, mode)
  };
}

function diffComplianceRuleStates(current = {}, imported = {}, next = {}, mode = 'merge') {
  const kinds = ['sensitiveTerms', 'brandRules'];
  const diff = {
    summary: {
      added: 0,
      overwritten: 0,
      scopeChanged: 0,
      authorizationChanged: 0,
      brandScopeChanged: 0,
      removedByReplace: 0,
      disabledDefaultAdded: 0,
      disabledDefaultRemoved: 0
    },
    byKind: {},
    disabledDefaults: {
      added: [],
      removed: []
    }
  };
  const currentDisabled = new Set(current.disabledDefaultRuleIds || []);
  const nextDisabled = new Set(next.disabledDefaultRuleIds || []);
  diff.disabledDefaults.added = [...nextDisabled].filter((id) => !currentDisabled.has(id));
  diff.disabledDefaults.removed = [...currentDisabled].filter((id) => !nextDisabled.has(id));
  diff.summary.disabledDefaultAdded = diff.disabledDefaults.added.length;
  diff.summary.disabledDefaultRemoved = diff.disabledDefaults.removed.length;

  for (const kind of kinds) {
    const currentMap = complianceRuleMap(current.customRules?.[kind] || [], kind);
    const importedMap = complianceRuleMap(imported.customRules?.[kind] || [], kind);
    const nextMap = complianceRuleMap(next.customRules?.[kind] || [], kind);
    const added = [];
    const overwritten = [];
    const scopeChanged = [];
    const authorizationChanged = [];
    const brandScopeChanged = [];
    const removedByReplace = [];

    for (const [key, rule] of importedMap) {
      const before = currentMap.get(key);
      if (!before) {
        added.push(summarizeComplianceRuleDiff(rule));
        continue;
      }
      if (complianceRuleSemanticSignature(before) !== complianceRuleSemanticSignature(rule)) {
        overwritten.push({
          before: summarizeComplianceRuleDiff(before),
          after: summarizeComplianceRuleDiff(rule)
        });
      }
      if (complianceRuleScopeSignature(before) !== complianceRuleScopeSignature(rule)) {
        scopeChanged.push({
          before: summarizeComplianceRuleDiff(before),
          after: summarizeComplianceRuleDiff(rule)
        });
      }
      if (kind === 'brandRules' && before.brandAuthorizationStatus !== rule.brandAuthorizationStatus) {
        authorizationChanged.push({
          before: summarizeComplianceRuleDiff(before),
          after: summarizeComplianceRuleDiff(rule)
        });
      }
      if (kind === 'brandRules' && complianceRuleBrandScopeSignature(before) !== complianceRuleBrandScopeSignature(rule)) {
        brandScopeChanged.push({
          before: summarizeComplianceRuleDiff(before),
          after: summarizeComplianceRuleDiff(rule)
        });
      }
    }
    if (mode === 'replace') {
      for (const [key, rule] of currentMap) {
        if (!nextMap.has(key)) removedByReplace.push(summarizeComplianceRuleDiff(rule));
      }
    }

    diff.byKind[kind] = {
      added,
      overwritten,
      scopeChanged,
      authorizationChanged,
      brandScopeChanged,
      removedByReplace
    };
    diff.summary.added += added.length;
    diff.summary.overwritten += overwritten.length;
    diff.summary.scopeChanged += scopeChanged.length;
    diff.summary.authorizationChanged += authorizationChanged.length;
    diff.summary.brandScopeChanged += brandScopeChanged.length;
    diff.summary.removedByReplace += removedByReplace.length;
  }
  return diff;
}

function complianceRuleMap(rules = [], kind = 'sensitiveTerms') {
  const map = new Map();
  for (const rule of rules) {
    const normalized = sanitizeComplianceRule(rule, kind, rule.source || 'custom');
    if (!normalized) continue;
    map.set(normalizeComplianceRuleKey(normalized.term), normalized);
  }
  return map;
}

function complianceRuleSemanticSignature(rule = {}) {
  return JSON.stringify({
    term: normalizeComplianceRuleKey(rule.term),
    severity: rule.severity || '',
    replacement: rule.replacement || '',
    note: rule.note || '',
    enabled: rule.enabled !== false,
    platforms: [...(rule.platforms || [])].sort(),
    categories: [...(rule.categories || [])].sort(),
    brandAuthorizationStatus: rule.brandAuthorizationStatus || '',
    brandScope: sanitizeComplianceBrandScope(rule.brandScope || {})
  });
}

function complianceRuleScopeSignature(rule = {}) {
  return JSON.stringify({
    platforms: [...(rule.platforms || [])].sort(),
    categories: [...(rule.categories || [])].sort()
  });
}

function complianceRuleBrandScopeSignature(rule = {}) {
  const scope = sanitizeComplianceBrandScope(rule.brandScope || {});
  return JSON.stringify({
    brands: [...scope.brands].sort(),
    platforms: [...scope.platforms].sort(),
    categories: [...scope.categories].sort(),
    channels: [...scope.channels].sort(),
    regions: [...scope.regions].sort(),
    campaign: scope.campaign,
    startsAt: scope.startsAt,
    expiresAt: scope.expiresAt,
    reference: scope.reference,
    reviewer: scope.reviewer,
    note: scope.note
  });
}

function summarizeComplianceRuleDiff(rule = {}) {
  const brandScope = sanitizeComplianceBrandScope(rule.brandScope || {});
  return {
    id: rule.id || '',
    term: rule.term || '',
    severity: rule.severity || 'medium',
    replacement: rule.replacement || '',
    note: rule.note || '',
    platforms: rule.platforms || [],
    categories: rule.categories || [],
    enabled: rule.enabled !== false,
    brandAuthorizationStatus: rule.brandAuthorizationStatus || '',
    brandScope,
    brandScopeSummary: complianceBrandScopeSummary(brandScope)
  };
}

function rollbackComplianceRules(version) {
  const normalized = sanitizeSavedComplianceRules(savedComplianceRules);
  const targetVersion = Number(version);
  const snapshot = normalized.snapshots.find((item) => Number(item.version) === targetVersion);
  if (!snapshot) {
    const error = new Error('未找到可回滚的规则库版本。');
    error.status = 404;
    throw error;
  }
  return withComplianceRuleRevision({
    ...snapshot.state,
    version: Number(normalized.version || 1) + 1,
    updatedAt: new Date().toISOString(),
    revisionHistory: normalized.revisionHistory,
    snapshots: appendComplianceRuleSnapshot(normalized, '回滚前快照')
  }, 'rollback', `回滚到版本 ${snapshot.version}`);
}

function mergeImportedComplianceRuleList(currentRules, importedRules, mode, kind) {
  const merged = new Map();
  const seed = mode === 'replace' ? [] : currentRules;
  for (const rule of seed || []) {
    const normalized = sanitizeComplianceRule(rule, kind, 'custom');
    if (normalized) merged.set(normalizeComplianceRuleKey(normalized.term), normalized);
  }
  for (const rule of importedRules || []) {
    const normalized = sanitizeComplianceRule(rule, kind, 'custom');
    if (normalized) merged.set(normalizeComplianceRuleKey(normalized.term), normalized);
  }
  return Array.from(merged.values());
}

function publicComplianceAuditRecords(limit = 20) {
  const records = complianceAuditRecords
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
  return {
    version: 1,
    count: records.length,
    total: complianceAuditRecords.length,
    records,
    generatedAt: new Date().toISOString()
  };
}

function buildComplianceAuditRecordsExport() {
  return {
    schema: 'ad-workbench.compliance-audit-records',
    version: 1,
    exportedAt: new Date().toISOString(),
    note: '审核留痕仅用于本机合规复核，不包含 API Key、Cookie、Token 或登录态。',
    records: complianceAuditRecords
  };
}

function publicAuthorizationCredentials(limit = 20) {
  const credentials = authorizationCredentials
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
  return {
    version: 1,
    count: credentials.length,
    total: authorizationCredentials.length,
    credentials,
    summary: summarizeAuthorizationCredentials(authorizationCredentials),
    generatedAt: new Date().toISOString()
  };
}

function buildAuthorizationCredentialsExport() {
  return {
    schema: 'ad-workbench.authorization-credentials',
    version: 1,
    exportedAt: new Date().toISOString(),
    note: '授权凭证台账仅保存来源摘要、凭证引用和审核信息，不包含 API Key、Cookie、Token 或登录态。',
    summary: summarizeAuthorizationCredentials(authorizationCredentials),
    credentials: authorizationCredentials
  };
}

function publicMaterialRightsRecords(limit = 20) {
  const records = materialRightsRecords
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
  return {
    version: 1,
    count: records.length,
    total: materialRightsRecords.length,
    records,
    summary: summarizeMaterialRights(materialRightsRecords),
    generatedAt: new Date().toISOString()
  };
}

function buildMaterialRightsExport() {
  return {
    schema: 'ad-workbench.material-rights',
    version: 1,
    exportedAt: new Date().toISOString(),
    note: '素材版权台账仅保存素材名称、来源类型、授权范围、引用和审核摘要，不包含原始素材文件、API Key、Cookie、Token 或登录态。',
    summary: summarizeMaterialRights(materialRightsRecords),
    records: materialRightsRecords
  };
}

function buildProfessionalPlanExport(input = {}) {
  const product = normalizeProduct(input.product || {});
  const analysis = input.analysis || analyzeMedia(product);
  const ad = input.ad
    ? attachAdQuality(product, analysis, input.ad)
    : null;
  const audit = input.audit || (ad ? auditCompliance(product, analysis, ad, {
    source: input.source || product.platform,
    credentials: findAuthorizationCredentialsForProduct(product, input.source || product.platform),
    materialRights: findMaterialRightsForProduct(product, input.source || product.platform)
  }) : null);
  const exportedAt = input.exportedAt || new Date().toISOString();
  const quality = ad?.quality || null;
  const visualRisk = analysis.visualRisk || null;
  return {
    schema: 'ad-workbench.professional-ad-plan',
    version: 1,
    exportedAt,
    project: {
      name: `${product.title} 广告方案`,
      productId: product.id,
      platform: product.platform,
      category: product.category,
      source: input.source || product.platform || '',
      owner: product.shop,
      confidentiality: 'local-only'
    },
    delivery: {
      summary: buildDeliverySummary(product, quality, audit, visualRisk),
      readiness: {
        creative: quality?.publishReadiness?.creativeReady ? 'ready' : 'review',
        compliance: audit?.level === 'low' ? 'ready' : 'review',
        material: visualRisk?.decision || 'manual_review'
      },
      nextActions: buildDeliveryNextActions(quality, audit, visualRisk)
    },
    product,
    creative: ad,
    materialInsight: {
      hook: analysis.hook || '',
      creativePattern: analysis.creativePattern || '',
      visualStyle: analysis.visualStyle || '',
      persuasionAngles: analysis.persuasionAngles || [],
      ai: analysis.ai || null
    },
    materialRisk: visualRisk,
    compliance: audit,
    productionPackage: buildProductionPackage(product, analysis, ad),
    evidencePackage: buildEvidencePackage(product, analysis, ad, audit),
    raw: {
      analysis,
      ad,
      audit
    }
  };
}

async function writeProfessionalPlanBundle(exported, productTitle) {
  const bundleName = `${dateStampForFile()}-${productTitle}`;
  const directory = join(outputDir, 'ad-plans', bundleName);
  const files = {
    json: join(directory, 'plan.json'),
    markdown: join(directory, 'plan.md'),
    checklistCsv: join(directory, 'review-checklist.csv'),
    manifest: join(directory, 'manifest.json')
  };
  await mkdir(directory, { recursive: true });
  await writeJsonFile(files.json, exported);
  await writeTextFile(files.markdown, buildProfessionalPlanMarkdown(exported));
  await writeTextFile(files.checklistCsv, buildProfessionalReviewChecklistCsv(exported));
  const manifest = {
    schema: 'ad-workbench.professional-export-bundle',
    version: 1,
    exportedAt: exported.exportedAt,
    summary: exported.delivery?.summary || '',
    directory,
    files: Object.entries(files).map(([kind, filepath]) => ({
      kind,
      filename: filepath.split(/[\\/]/).pop(),
      filepath
    })),
    note: '导出包不包含 API Key、Cookie、Token、登录态或原始授权文件内容。'
  };
  await writeJsonFile(files.manifest, manifest);
  return {
    directory,
    filepath: files.json,
    filename: 'plan.json',
    files: manifest.files,
    manifest
  };
}

function buildProfessionalPlanMarkdown(exported = {}) {
  const product = exported.product || {};
  const creative = exported.creative || {};
  const quality = creative.quality || {};
  const audit = exported.compliance || {};
  const materialRisk = exported.materialRisk || {};
  const production = exported.productionPackage || {};
  const evidence = exported.evidencePackage || {};
  const lines = [
    `# ${markdownText(exported.project?.name || `${product.title || '商品'} 广告方案`)}`,
    '',
    `- 导出时间：${markdownText(exported.exportedAt || '')}`,
    `- 商品：${markdownText(product.title || '')}`,
    `- 平台/类目：${markdownText(compact([product.platform, product.category]).join(' / '))}`,
    `- 店铺/主体：${markdownText(product.shop || exported.project?.owner || '')}`,
    `- 保密级别：${markdownText(exported.project?.confidentiality || 'local-only')}`,
    '',
    '## 交付结论',
    '',
    markdownText(exported.delivery?.summary || '暂无交付摘要。'),
    '',
    ...markdownList('下一步动作', exported.delivery?.nextActions),
    '',
    '## 创意质量',
    '',
    `- 质量分：${quality.score ?? '--'} / ${markdownText(quality.grade || '')}`,
    `- 状态：${markdownText(quality.statusLabel || quality.status || '')}`,
    `- 发布闸门：${markdownText(quality.publishReadiness?.gate || '')}`,
    '',
    ...markdownTable(
      ['维度', '分数', '状态', '说明'],
      (quality.dimensions || []).map((item) => [
        item.label || item.key || '',
        item.score ?? '',
        item.status || '',
        item.note || ''
      ])
    ),
    '',
    ...markdownList('改进建议', quality.improvementTips),
    '',
    '## 原创广告方案',
    '',
    `- 形式：${markdownText(creative.format || '')}`,
    `- 标题：${markdownText(creative.headline || creative.title || '')}`,
    `- CTA：${markdownText(creative.cta || '')}`,
    '',
    ...markdownCreativeBody(creative),
    '',
    '## 制作包',
    '',
    ...markdownList('制作说明', production.productionNotes),
    ...markdownList('验收清单', production.acceptanceChecklist),
    production.imagePrompt ? ['', '### 海报/图片提示词', '', markdownText(production.imagePrompt)] : [],
    '',
    '## 素材风险',
    '',
    `- 风险等级：${markdownText(materialRisk.riskLevel || '')}`,
    `- 处理建议：${markdownText(materialRisk.decisionLabel || materialRisk.decision || '')}`,
    `- 摘要：${markdownText(materialRisk.summary || '')}`,
    '',
    ...markdownList('素材清单', (materialRisk.assetInventory || []).map((item) => compact([
      item.label || item.roleLabel,
      item.typeLabel,
      item.displayUrl || item.url,
      item.recommendation
    ]).join(' / '))),
    ...markdownList('视频抽帧计划', (materialRisk.videoFramePlan || []).map((item) => compact([
      item.timecode,
      item.label,
      item.purpose
    ]).join(' / '))),
    ...markdownList('证据截图留档', (materialRisk.evidenceSnapshots || []).map((item) => compact([
      item.title,
      item.captureTarget,
      item.status
    ]).join(' / '))),
    ...markdownList('人工复核清单', (materialRisk.manualReviewChecklist || []).map((item) => compact([
      item.priority,
      item.title,
      item.detail
    ]).join(' / '))),
    ...markdownList('复核重点', materialRisk.reviewFocus),
    ...markdownList('证据要求', materialRisk.evidenceRequired),
    '',
    '## 合规审核',
    '',
    `- 审核分：${audit.score ?? '--'}`,
    `- 风险等级：${markdownText(audit.level || '')}`,
    `- 摘要：${markdownText(audit.summary || '')}`,
    '',
    ...markdownTable(
      ['状态', '检查项', '说明', '建议'],
      (audit.checks || []).map((item) => [
        item.status || '',
        item.title || '',
        item.detail || '',
        item.suggestion || ''
      ])
    ),
    '',
    '## 证据包',
    '',
    ...markdownList('需留存', evidence.required),
    ...markdownList('授权凭证匹配', (evidence.credentialMatches || []).map((item) => compact([
      item.title,
      item.sourceType,
      item.reference
    ]).join(' / '))),
    ...markdownList('素材版权匹配', (evidence.materialRightMatches || []).map((item) => compact([
      item.title,
      item.assetType,
      item.sourceType,
      item.licenseScope,
      item.scopeSummary,
      item.expiryStatus?.label,
      item.brandScope?.statusLabel,
      item.attachmentRefs?.length ? `附件引用 ${item.attachmentRefs.length} 条` : '',
      item.reference
    ]).join(' / '))),
    '',
    '> 本导出包仅用于授权商品的原创广告方案交付和人工复核，不包含 API Key、Cookie、Token、登录态或原始授权文件内容。'
  ].flat();
  return lines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

function markdownCreativeBody(creative = {}) {
  if (creative.format === 'poster') {
    return [
      creative.subheadline ? `- 副标题：${markdownText(creative.subheadline)}` : '',
      ...markdownList('文案块', creative.copyBlocks),
      ...markdownList('版式', creative.layout),
      ...markdownList('合规核对', creative.complianceChecklist)
    ].filter(Boolean);
  }
  return [
    ...markdownTable(
      ['时间', '镜头', '动作', '字幕/画面文字'],
      (creative.storyboard || []).map((scene) => [
        scene.time || '',
        scene.shot || '',
        scene.action || '',
        scene.text || ''
      ])
    ),
    '',
    ...markdownList('口播', creative.voiceover),
    ...markdownList('字幕', creative.captions),
    ...markdownList('合规核对', creative.complianceChecklist)
  ];
}

function buildProfessionalReviewChecklistCsv(exported = {}) {
  const rows = [
    ['section', 'item', 'status', 'detail', 'suggestion']
  ];
  const creative = exported.creative || {};
  const quality = creative.quality || {};
  (quality.checks || []).forEach((item) => rows.push([
    'creative_quality',
    item.title || '',
    item.status || '',
    item.detail || '',
    item.suggestion || ''
  ]));
  (exported.materialRisk?.riskMatrix || []).forEach((item) => rows.push([
    'material_risk',
    item.label || item.key || '',
    item.level || '',
    item.detail || '',
    item.action || ''
  ]));
  (exported.materialRisk?.evidenceSnapshots || []).forEach((item) => rows.push([
    'visual_evidence_snapshot',
    item.title || '',
    item.status || 'pending',
    item.captureTarget || item.reason || '',
    item.note || ''
  ]));
  (exported.materialRisk?.manualReviewChecklist || []).forEach((item) => rows.push([
    'visual_manual_review',
    item.title || '',
    item.priority || 'medium',
    item.detail || '',
    item.evidenceTarget || ''
  ]));
  (exported.compliance?.checks || []).forEach((item) => rows.push([
    'compliance',
    item.title || '',
    item.status || '',
    item.detail || '',
    item.suggestion || ''
  ]));
  (exported.evidencePackage?.required || []).forEach((item) => rows.push([
    'evidence',
    item,
    'pending',
    '发布前需留存或人工确认',
    ''
  ]));
  return rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

function markdownList(title, items) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return [];
  return [
    `### ${markdownText(title)}`,
    '',
    ...list.map((item) => `- ${markdownText(item)}`),
    ''
  ];
}

function markdownTable(headers, rows) {
  const cleanRows = (rows || []).filter((row) => row.some((cell) => String(cell ?? '').trim()));
  if (!cleanRows.length) return [];
  const headerLine = `| ${headers.map(markdownText).join(' | ')} |`;
  const divider = `| ${headers.map(() => '---').join(' | ')} |`;
  return [
    headerLine,
    divider,
    ...cleanRows.map((row) => `| ${row.map(markdownText).join(' | ')} |`)
  ];
}

function markdownText(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function csvCell(value) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildDeliverySummary(product, quality, audit, visualRisk) {
  const parts = [
    `${product.title} 的原创广告方案已生成。`,
    quality ? `创意质量 ${quality.score} 分。` : '',
    audit ? `合规评分 ${audit.score} 分。` : '',
    visualRisk ? `素材处理建议：${visualRisk.decisionLabel || visualRisk.decision || '人工复核'}。` : ''
  ];
  return compact(parts).join(' ');
}

function buildDeliveryNextActions(quality, audit, visualRisk) {
  return compact([
    ...(quality?.improvementTips || []).slice(0, 3),
    ...(visualRisk?.reviewFocus || []).slice(0, 3),
    ...(audit?.checks || [])
      .filter((check) => check.status !== 'pass')
      .map((check) => check.suggestion || check.detail)
      .filter(Boolean)
      .slice(0, 3),
    '发布前由人工复核最终素材、文案、授权凭证和平台规则。'
  ]).slice(0, 10);
}

function buildProductionPackage(product, analysis = {}, ad = {}) {
  if (!ad) return null;
  return {
    format: ad.format,
    headline: ad.headline || '',
    cta: ad.cta || '',
    storyboard: ad.storyboard || [],
    posterLayout: ad.layout || [],
    voiceover: ad.voiceover || [],
    captions: ad.captions || [],
    imagePrompt: ad.prompt || '',
    productionNotes: [
      ...(ad.productionNotes || []),
      ...(analysis.visualRisk?.reshootBrief?.shotIdeas || []).map((item) => `拍摄建议：${item}`)
    ],
    acceptanceChecklist: compact([
      '画面主体与当前商品一致',
      '素材无平台水印、第三方 logo、未授权字幕或音乐',
      '卖点与商品详情、后台数据或检测报告一致',
      'CTA 与实际落地页一致',
      ...(ad.complianceChecklist || [])
    ])
  };
}

function buildEvidencePackage(product, analysis = {}, ad = {}, audit = {}) {
  return {
    required: compact([
      ...(audit?.evidenceChecklist || []),
      ...(analysis.visualRisk?.evidenceRequired || []),
      ...(analysis.visualRisk?.evidenceSnapshots || [])
        .map((item) => item.title && `截图留档：${item.title}`),
      ...(analysis.visualRisk?.manualReviewChecklist || [])
        .map((item) => item.evidenceTarget && `人工复核：${item.evidenceTarget}`),
      ...(ad?.quality?.checks || [])
        .filter((check) => check.status !== 'pass')
        .map((check) => check.suggestion)
    ]).slice(0, 16),
    productSnapshot: {
      id: product.id,
      title: product.title,
      shop: product.shop,
      platform: product.platform,
      category: product.category,
      price: product.price,
      sales: product.sales,
      salesTrendPoints: product.salesTrend?.length || 0
    },
    credentialMatches: audit?.credentialMatches || [],
    materialRightMatches: audit?.materialRightMatches || [],
    visualEvidence: {
      assetInventory: analysis.visualRisk?.assetInventory || [],
      videoFramePlan: analysis.visualRisk?.videoFramePlan || [],
      evidenceSnapshots: analysis.visualRisk?.evidenceSnapshots || [],
      riskEvidenceCards: analysis.visualRisk?.riskEvidenceCards || [],
      manualReviewChecklist: analysis.visualRisk?.manualReviewChecklist || []
    },
    auditRecordNotice: '导出文件不包含 API Key、Cookie、Token、登录态或原始授权文件内容。'
  };
}

async function appendAuthorizationCredential(input = {}) {
  const credential = normalizeAuthorizationCredential({
    ...input,
    createdAt: input.createdAt || new Date().toISOString()
  });
  if (!credential) {
    const error = new Error('请填写凭证名称和来源类型。');
    error.status = 400;
    throw error;
  }
  authorizationCredentials = [
    credential,
    ...authorizationCredentials.filter((item) => item.id !== credential.id)
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_AUTHORIZATION_CREDENTIALS);
  await persistAuthorizationCredentials();
  return credential;
}

function normalizeAuthorizationCredential(input = {}) {
  if (!input || typeof input !== 'object') return null;
  const title = String(input.title || input.name || '').trim();
  const sourceType = normalizeCredentialSourceType(input.sourceType || input.type || input.source);
  if (!title || !sourceType) return null;
  const createdAt = String(input.createdAt || new Date().toISOString());
  const products = sanitizeCredentialProductRefs(input.products || input.productRefs || input.productIds || []);
  const platform = String(input.platform || '').trim().toLowerCase();
  const category = String(input.category || '').trim();
  return {
    id: String(input.id || makeAuthorizationCredentialId({ title, sourceType, createdAt })),
    title: title.slice(0, 120),
    sourceType,
    platform,
    category,
    owner: String(input.owner || input.account || input.shop || '').trim().slice(0, 80),
    reference: sanitizeCredentialReference(input.reference || input.url || input.fileName || input.filename || ''),
    capturedAt: normalizeOptionalDateTime(input.capturedAt || input.exportedAt || input.authorizedAt || ''),
    reviewer: String(input.reviewer || input.operator || '').trim().slice(0, 60),
    note: sanitizeCredentialNote(input.note || input.description || ''),
    products,
    productCount: products.length,
    createdAt
  };
}

function normalizeCredentialSourceType(value) {
  const key = String(value || '').trim().toLowerCase();
  const aliases = {
    api: 'official_api',
    official: 'official_api',
    official_api: 'official_api',
    open_platform: 'official_api',
    csv: 'merchant_export',
    merchant: 'merchant_export',
    merchant_export: 'merchant_export',
    backend_export: 'merchant_export',
    screenshot: 'page_screenshot',
    page: 'page_screenshot',
    page_screenshot: 'page_screenshot',
    creator: 'creator_authorization',
    creator_authorization: 'creator_authorization',
    internal: 'internal_data',
    internal_data: 'internal_data',
    contract: 'authorization_file',
    file: 'authorization_file',
    authorization_file: 'authorization_file',
    other: 'other'
  };
  return aliases[key] || '';
}

function sanitizeCredentialProductRefs(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[,\n|，、;；]+/);
  return list
    .map((item) => {
      if (typeof item === 'string') {
        const text = item.trim();
        if (!text) return null;
        return { id: text.slice(0, 80), title: '' };
      }
      const id = String(item?.id || item?.productId || item?.sku || '').trim();
      const title = String(item?.title || item?.name || '').trim();
      if (!id && !title) return null;
      return {
        id: id.slice(0, 80),
        title: title.slice(0, 120)
      };
    })
    .filter(Boolean)
    .slice(0, 80);
}

function sanitizeCredentialReference(value) {
  const text = String(value || '').trim();
  if (!text || /(?:api[_-]?key|token|cookie|secret|password)\s*[:=]/i.test(text)) return '';
  return text.slice(0, 240);
}

function sanitizeCredentialNote(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text
    .replace(/(api[_-]?key|token|cookie|secret|password)\s*[:=]\s*\S+/gi, '$1:[已隐藏]')
    .slice(0, 400);
}

function normalizeOptionalDateTime(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text.slice(0, 60) : date.toISOString();
}

function makeAuthorizationCredentialId(input = {}) {
  return `cred-${Date.now()}-${stableId(`${input.title || ''}-${input.sourceType || ''}-${input.createdAt || ''}-${Math.random()}`)}`;
}

function summarizeAuthorizationCredentials(credentials = []) {
  const summary = {
    total: credentials.length,
    bySourceType: {},
    withProductRefs: credentials.filter((item) => item.products?.length).length,
    latestAt: credentials
      .map((item) => item.createdAt)
      .sort((a, b) => new Date(b) - new Date(a))[0] || ''
  };
  for (const credential of credentials) {
    const key = credential.sourceType || 'other';
    summary.bySourceType[key] = (summary.bySourceType[key] || 0) + 1;
  }
  return summary;
}

function findAuthorizationCredentialsForProduct(product = {}, source = '') {
  const productId = String(product.id || product.productId || product.sku || '').trim().toLowerCase();
  const productTitle = String(product.title || product.name || '').trim().toLowerCase();
  const platform = String(product.platform || source || '').trim().toLowerCase();
  const category = String(product.category || '').trim().toLowerCase();
  return authorizationCredentials
    .filter((credential) => {
      if (credential.platform && platform && credential.platform !== platform) return false;
      if (credential.category && category && !category.includes(credential.category.toLowerCase())) return false;
      if (!credential.products?.length) return true;
      return credential.products.some((item) => {
        const id = String(item.id || '').trim().toLowerCase();
        const title = String(item.title || '').trim().toLowerCase();
        return (id && productId && id === productId) || (title && productTitle && productTitle.includes(title));
      });
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
}

async function appendMaterialRightRecord(input = {}) {
  const record = normalizeMaterialRightRecord({
    ...input,
    createdAt: input.createdAt || new Date().toISOString()
  });
  if (!record) {
    const error = new Error('请填写素材名称、素材类型和来源类型。');
    error.status = 400;
    throw error;
  }
  materialRightsRecords = [
    record,
    ...materialRightsRecords.filter((item) => item.id !== record.id)
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_MATERIAL_RIGHTS);
  await persistMaterialRightsRecords();
  return record;
}

function normalizeMaterialRightRecord(input = {}) {
  if (!input || typeof input !== 'object') return null;
  const title = String(input.title || input.name || '').trim();
  const assetType = normalizeMaterialAssetType(input.assetType || input.materialType || input.type);
  const sourceType = normalizeMaterialSourceType(input.sourceType || input.source || input.rightSource);
  if (!title || !assetType || !sourceType) return null;
  const createdAt = String(input.createdAt || new Date().toISOString());
  const products = sanitizeCredentialProductRefs(input.products || input.productRefs || input.productIds || []);
  const platform = String(input.platform || '').trim().toLowerCase();
  const category = String(input.category || '').trim();
  return {
    id: String(input.id || makeMaterialRightId({ title, assetType, sourceType, createdAt })),
    title: title.slice(0, 120),
    assetType,
    sourceType,
    platform,
    category,
    owner: String(input.owner || input.account || input.shop || '').trim().slice(0, 80),
    reference: sanitizeCredentialReference(input.reference || input.url || input.fileName || input.filename || ''),
    attachmentRefs: sanitizeMaterialAttachmentRefs(input.attachmentRefs || input.attachments || input.attachmentReferences || input.attachment || []),
    licenseScope: normalizeLicenseScope(input.licenseScope || input.scope || input.usageScope),
    brandScope: normalizeBrandScope(input.brandScope || input.brandAuthorization || input.brandAuth || {}),
    channelScope: sanitizeRuleScopeList(input.channelScope || input.channels || input.channel || []),
    regionScope: sanitizeRuleScopeList(input.regionScope || input.regions || input.region || []),
    campaignScope: sanitizeMaterialScopeText(input.campaignScope || input.campaign || input.activity || ''),
    startsAt: normalizeOptionalDateTime(input.startsAt || input.validFrom || input.effectiveAt || ''),
    expiresAt: normalizeOptionalDateTime(input.expiresAt || input.validUntil || input.expiredAt || ''),
    capturedAt: normalizeOptionalDateTime(input.capturedAt || input.registeredAt || input.authorizedAt || ''),
    reviewer: String(input.reviewer || input.operator || '').trim().slice(0, 60),
    note: sanitizeCredentialNote(input.note || input.description || ''),
    products,
    productCount: products.length,
    createdAt,
    expiryStatus: materialRightExpiryStatus(input.expiresAt || input.validUntil || input.expiredAt || ''),
    scopeSummary: buildMaterialRightScopeSummary({
      licenseScope: input.licenseScope || input.scope || input.usageScope,
      brandScope: input.brandScope || input.brandAuthorization || input.brandAuth || {},
      channelScope: input.channelScope || input.channels || input.channel || [],
      regionScope: input.regionScope || input.regions || input.region || [],
      campaignScope: input.campaignScope || input.campaign || input.activity || ''
    })
  };
}

function sanitizeMaterialAttachmentRefs(value) {
  const list = Array.isArray(value) ? value : splitPoints(value || '');
  return list
    .map((item, index) => {
      if (typeof item === 'string') {
        const reference = sanitizeCredentialReference(item);
        if (!reference) return null;
        return {
          id: `att-${index + 1}`,
          title: reference.slice(0, 80),
          reference,
          type: inferMaterialAttachmentType(reference),
          note: ''
        };
      }
      const reference = sanitizeCredentialReference(item?.reference || item?.url || item?.path || item?.fileName || item?.filename || '');
      const title = String(item?.title || item?.name || item?.label || reference || '').trim();
      if (!reference && !title) return null;
      return {
        id: String(item?.id || `att-${index + 1}`).slice(0, 60),
        title: title.slice(0, 80),
        reference,
        type: inferMaterialAttachmentType(item?.type || reference),
        note: sanitizeCredentialNote(item?.note || item?.description || '')
      };
    })
    .filter(Boolean)
    .slice(0, 10);
}

function inferMaterialAttachmentType(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (/contract|合同|agreement|授权书|authorization/.test(raw)) return 'authorization_file';
  if (/screenshot|截图|png|jpe?g|webp/.test(raw)) return 'screenshot_ref';
  if (/drive|网盘|share|url|https?:\/\//.test(raw)) return 'link_ref';
  if (/invoice|发票|receipt|order/.test(raw)) return 'purchase_record';
  return 'reference';
}

function normalizeBrandScope(value = {}) {
  const input = value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : { brands: value };
  const brands = toTextList(input.brands || input.brand || input.brandNames || input.names)
    .map((item) => item.slice(0, 60))
    .slice(0, 20);
  const status = normalizeBrandAuthorizationStatus(input.status || input.authorizationStatus || input.authStatus || (brands.length ? 'authorized' : 'not_applicable'));
  return {
    status,
    statusLabel: brandAuthorizationStatusLabel(status),
    brands,
    owner: String(input.owner || input.brandOwner || input.licensor || '').trim().slice(0, 80),
    restrictions: toTextList(input.restrictions || input.limits || input.notes).slice(0, 10),
    usage: sanitizeMaterialScopeText(input.usage || input.allowedUsage || input.scope || '')
  };
}

function normalizeBrandAuthorizationStatus(value) {
  const key = String(value || '').trim().toLowerCase();
  const aliases = {
    authorized: 'authorized',
    yes: 'authorized',
    approved: 'authorized',
    allowed: 'authorized',
    pending: 'pending_review',
    review: 'pending_review',
    pending_review: 'pending_review',
    limited: 'limited',
    restricted: 'limited',
    forbidden: 'forbidden',
    denied: 'forbidden',
    none: 'not_applicable',
    no_brand: 'not_applicable',
    not_applicable: 'not_applicable'
  };
  return aliases[key] || 'not_applicable';
}

function brandAuthorizationStatusLabel(status) {
  const labels = {
    authorized: '已授权',
    pending_review: '待复核',
    limited: '有限授权',
    forbidden: '不可使用',
    not_applicable: '不涉及品牌'
  };
  return labels[status] || status || '不涉及品牌';
}

function sanitizeMaterialScopeText(value) {
  return sanitizeCredentialNote(value).slice(0, 160);
}

function normalizeMaterialAssetType(value) {
  const key = String(value || '').trim().toLowerCase();
  const aliases = {
    image: 'image',
    img: 'image',
    photo: 'image',
    picture: 'image',
    video: 'video',
    clip: 'video',
    music: 'music',
    audio: 'music',
    bgm: 'music',
    font: 'font',
    typeface: 'font',
    portrait: 'portrait',
    person: 'portrait',
    likeness: 'portrait',
    logo: 'logo',
    brand_logo: 'logo',
    product_shoot: 'product_shoot',
    shoot: 'product_shoot',
    sample_shoot: 'product_shoot',
    other: 'other'
  };
  return aliases[key] || '';
}

function normalizeMaterialSourceType(value) {
  const key = String(value || '').trim().toLowerCase();
  const aliases = {
    self: 'self_produced',
    self_produced: 'self_produced',
    own: 'self_produced',
    brand: 'brand_library',
    brand_library: 'brand_library',
    merchant: 'merchant_authorized',
    merchant_authorized: 'merchant_authorized',
    stock: 'stock_license',
    stock_license: 'stock_license',
    creator: 'creator_authorized',
    creator_authorized: 'creator_authorized',
    platform: 'platform_material',
    platform_material: 'platform_material',
    agency: 'agency_produced',
    agency_produced: 'agency_produced',
    other: 'other'
  };
  return aliases[key] || '';
}

function normalizeLicenseScope(value) {
  const key = String(value || '').trim().toLowerCase();
  const aliases = {
    all: 'all_ads',
    all_ads: 'all_ads',
    ecommerce: 'ecommerce_ads',
    ecommerce_ads: 'ecommerce_ads',
    social: 'social_ads',
    social_ads: 'social_ads',
    single: 'single_campaign',
    single_campaign: 'single_campaign',
    internal: 'internal_review',
    internal_review: 'internal_review',
    other: 'other'
  };
  return aliases[key] || (key ? 'other' : 'other');
}

function makeMaterialRightId(input = {}) {
  return `mat-${Date.now()}-${stableId(`${input.title || ''}-${input.assetType || ''}-${input.sourceType || ''}-${input.createdAt || ''}-${Math.random()}`)}`;
}

function materialRightExpiryStatus(expiresAtValue) {
  const raw = String(expiresAtValue || '').trim();
  if (!raw) return { status: 'no_expiry', label: '未设置到期', daysLeft: null };
  const expiresAt = new Date(raw).getTime();
  if (Number.isNaN(expiresAt)) return { status: 'unknown', label: '到期时间待确认', daysLeft: null };
  const now = Date.now();
  const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { status: 'expired', label: '已过期', daysLeft };
  if (daysLeft <= 30) return { status: 'expiring_soon', label: `${daysLeft} 天后到期`, daysLeft };
  return { status: 'valid', label: `${daysLeft} 天后到期`, daysLeft };
}

function buildMaterialRightScopeSummary(input = {}) {
  const brandScope = normalizeBrandScope(input.brandScope || {});
  return compact([
    materialScopeLabel(normalizeLicenseScope(input.licenseScope)),
    brandScope.brands?.length ? `品牌：${brandScope.brands.join('、')}（${brandScope.statusLabel}）` : '',
    toTextList(input.channelScope).length ? `渠道：${toTextList(input.channelScope).join('、')}` : '',
    toTextList(input.regionScope).length ? `地域：${toTextList(input.regionScope).join('、')}` : '',
    sanitizeMaterialScopeText(input.campaignScope) && `活动：${sanitizeMaterialScopeText(input.campaignScope)}`
  ]).join(' / ');
}

function summarizeMaterialRights(records = []) {
  const summary = {
    total: records.length,
    byAssetType: {},
    bySourceType: {},
    byScope: {},
    byBrandStatus: {},
    withProductRefs: records.filter((item) => item.products?.length).length,
    withAttachmentRefs: records.filter((item) => item.attachmentRefs?.length).length,
    expiringSoon: 0,
    expired: 0,
    latestAt: records
      .map((item) => item.createdAt)
      .sort((a, b) => new Date(b) - new Date(a))[0] || ''
  };
  const soon = Date.now() + 1000 * 60 * 60 * 24 * 30;
  for (const record of records) {
    const assetKey = record.assetType || 'other';
    const sourceKey = record.sourceType || 'other';
    const scopeKey = record.licenseScope || 'other';
    const brandKey = record.brandScope?.status || 'not_applicable';
    summary.byAssetType[assetKey] = (summary.byAssetType[assetKey] || 0) + 1;
    summary.bySourceType[sourceKey] = (summary.bySourceType[sourceKey] || 0) + 1;
    summary.byScope[scopeKey] = (summary.byScope[scopeKey] || 0) + 1;
    summary.byBrandStatus[brandKey] = (summary.byBrandStatus[brandKey] || 0) + 1;
    if (record.expiresAt) {
      const expiresAt = new Date(record.expiresAt).getTime();
      if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) summary.expired += 1;
      else if (!Number.isNaN(expiresAt) && expiresAt <= soon) summary.expiringSoon += 1;
    }
  }
  return summary;
}

function findMaterialRightsForProduct(product = {}, source = '') {
  const productId = String(product.id || product.productId || product.sku || '').trim().toLowerCase();
  const productTitle = String(product.title || product.name || '').trim().toLowerCase();
  const platform = String(product.platform || source || '').trim().toLowerCase();
  const category = String(product.category || '').trim().toLowerCase();
  const title = normalizeComparable(product.title || product.name || '');
  const shop = normalizeComparable(product.shop || product.store || '');
  const now = Date.now();
  return materialRightsRecords
    .filter((record) => {
      if (record.platform && platform && record.platform !== platform) return false;
      if (record.category && category && !category.includes(record.category.toLowerCase())) return false;
      if (!record.products?.length) return true;
      return record.products.some((item) => {
        const id = String(item.id || '').trim().toLowerCase();
        const title = String(item.title || '').trim().toLowerCase();
        return (id && productId && id === productId) || (title && productTitle && productTitle.includes(title));
      });
    })
    .map((record) => ({
      ...record,
      expiryStatus: materialRightExpiryStatus(record.expiresAt),
      scopeWarnings: buildMaterialRightScopeWarnings(record, { platform, category, title, shop })
    }))
    .sort((a, b) => {
      const warningDiff = (b.scopeWarnings?.length || 0) - (a.scopeWarnings?.length || 0);
      if (warningDiff) return warningDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    })
    .slice(0, 5);
}

function buildMaterialRightScopeWarnings(record = {}, productContext = {}) {
  const warnings = [];
  const expiry = materialRightExpiryStatus(record.expiresAt);
  if (expiry.status === 'expired') warnings.push('授权已过期，不能作为当前投放依据。');
  if (expiry.status === 'expiring_soon') warnings.push(`素材授权${expiry.label}，发布前需确认投放周期是否覆盖。`);
  if (record.brandScope?.status === 'pending_review') warnings.push('品牌授权状态为待复核，需要人工确认授权范围。');
  if (record.brandScope?.status === 'limited') warnings.push('品牌授权为有限授权，需要核对平台、活动和使用场景。');
  if (record.brandScope?.status === 'forbidden') warnings.push('品牌授权状态为不可使用，不能作为当前素材依据。');
  const brands = record.brandScope?.brands || [];
  if (brands.length) {
    const brandHit = brands.some((brand) => {
      const key = normalizeComparable(brand);
      return key && (productContext.title.includes(key) || productContext.shop.includes(key));
    });
    if (!brandHit) warnings.push('登记品牌未明显匹配当前商品标题或店铺，需人工确认是否同一授权范围。');
  }
  return warnings.slice(0, 6);
}

async function appendComplianceAuditRecord(input = {}) {
  const record = normalizeComplianceAuditRecord({
    id: makeComplianceAuditRecordId(input.product, input.audit),
    createdAt: new Date().toISOString(),
    source: input.source,
    operator: input.operator,
    product: input.product,
    ad: input.ad,
    mediaAnalysis: input.mediaAnalysis,
    audit: input.audit,
    rulesSnapshot: buildComplianceRulesSnapshot()
  });
  complianceAuditRecords = [
    record,
    ...complianceAuditRecords.filter((item) => item.id !== record.id)
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_AUDIT_RECORDS);
  await persistComplianceAuditRecords();
  return record;
}

function normalizeComplianceAuditRecord(input = {}) {
  if (!input || typeof input !== 'object') return null;
  const audit = input.audit && typeof input.audit === 'object' ? input.audit : {};
  const product = input.product && typeof input.product === 'object' ? input.product : {};
  const createdAt = String(input.createdAt || new Date().toISOString());
  return {
    id: String(input.id || makeComplianceAuditRecordId(product, audit)),
    createdAt,
    source: String(input.source || product.platform || ''),
    operator: String(input.operator || ''),
    product: {
      id: String(product.id || ''),
      title: String(product.title || product.name || '未命名商品'),
      platform: String(product.platform || ''),
      category: String(product.category || ''),
      shop: String(product.shop || product.store || ''),
      price: Number(product.price || 0),
      sales: Number(product.sales || product.volume || 0),
      sourceNotice: String(product.sourceNotice || '')
    },
    creative: summarizeAuditCreative(input.ad),
    audit: {
      score: Number(audit.score || 0),
      level: String(audit.level || 'medium'),
      summary: String(audit.summary || ''),
      flaggedTerms: Array.isArray(audit.flaggedTerms)
        ? audit.flaggedTerms.map((item) => ({
            term: String(item.term || ''),
            severity: String(item.severity || 'medium'),
            replacement: String(item.replacement || ''),
            note: String(item.note || ''),
            kind: String(item.kind || ''),
            source: String(item.source || ''),
            ruleId: String(item.ruleId || ''),
            brandAuthorizationStatus: String(item.brandAuthorizationStatus || ''),
            brandScope: sanitizeComplianceBrandScope(item.brandScope || {}),
            brandScopeSummary: String(item.brandScopeSummary || ''),
            brandScopeWarnings: toTextList(item.brandScopeWarnings || []).slice(0, 10),
            platforms: sanitizeRuleScopeList(item.platforms || []),
            categories: sanitizeRuleScopeList(item.categories || [])
          })).filter((item) => item.term)
        : [],
      checks: Array.isArray(audit.checks)
        ? audit.checks.map((check) => ({
            status: String(check.status || ''),
            severity: String(check.severity || ''),
            title: String(check.title || ''),
            detail: String(check.detail || ''),
            suggestion: String(check.suggestion || '')
          })).filter((check) => check.title)
        : [],
      credentialMatches: Array.isArray(audit.credentialMatches)
        ? audit.credentialMatches.map((item) => ({
            id: String(item.id || ''),
            title: String(item.title || ''),
            sourceType: String(item.sourceType || ''),
            platform: String(item.platform || ''),
            category: String(item.category || ''),
            reference: String(item.reference || ''),
            capturedAt: String(item.capturedAt || ''),
            reviewer: String(item.reviewer || '')
          })).filter((item) => item.title)
        : [],
      materialRightMatches: Array.isArray(audit.materialRightMatches)
        ? audit.materialRightMatches.map((item) => ({
            id: String(item.id || ''),
            title: String(item.title || ''),
            assetType: String(item.assetType || ''),
            sourceType: String(item.sourceType || ''),
            licenseScope: String(item.licenseScope || ''),
            scopeSummary: String(item.scopeSummary || ''),
            brandScope: normalizeBrandScope(item.brandScope || {}),
            channelScope: sanitizeRuleScopeList(item.channelScope || []),
            regionScope: sanitizeRuleScopeList(item.regionScope || []),
            campaignScope: sanitizeMaterialScopeText(item.campaignScope || ''),
            platform: String(item.platform || ''),
            category: String(item.category || ''),
            reference: String(item.reference || ''),
            attachmentRefs: sanitizeMaterialAttachmentRefs(item.attachmentRefs || []),
            startsAt: String(item.startsAt || ''),
            expiresAt: String(item.expiresAt || ''),
            expiryStatus: materialRightExpiryStatus(item.expiresAt || ''),
            scopeWarnings: toTextList(item.scopeWarnings || []).slice(0, 6),
            capturedAt: String(item.capturedAt || ''),
            reviewer: String(item.reviewer || '')
          })).filter((item) => item.title)
        : []
    },
    rulesSnapshot: normalizeComplianceRulesSnapshot(input.rulesSnapshot),
    evidence: {
      mediaSourceUrl: sanitizeEvidenceUrl(input.mediaAnalysis?.sourceUrl || product.mediaUrl || product.imageUrl || ''),
      visualRiskLevel: String(input.mediaAnalysis?.visualRisk?.riskLevel || ''),
      visualSummary: String(input.mediaAnalysis?.visualRisk?.summary || '')
    }
  };
}

function summarizeAuditCreative(ad) {
  if (!ad || typeof ad !== 'object') {
    return {
      format: '',
      title: '',
      headline: '',
      cta: '',
      hasPlan: false
    };
  }
  return {
    format: String(ad.format || ''),
    title: String(ad.title || ''),
    headline: String(ad.headline || ad.subheadline || ''),
    cta: String(ad.cta || ''),
    hasPlan: true
  };
}

function buildComplianceRulesSnapshot() {
  const publicRules = publicComplianceRules();
  return {
    version: publicRules.version,
    updatedAt: publicRules.updatedAt,
    summary: publicRules.summary,
    disabledDefaultRuleIds: publicRules.disabledDefaultRuleIds,
    customRules: publicRules.customRules,
    revisionHistory: publicRules.revisionHistory
  };
}

function normalizeComplianceRulesSnapshot(input = {}) {
  return {
    version: Number(input.version || 1),
    updatedAt: String(input.updatedAt || ''),
    summary: input.summary && typeof input.summary === 'object'
      ? {
          defaultSensitiveCount: Number(input.summary.defaultSensitiveCount || 0),
          defaultBrandCount: Number(input.summary.defaultBrandCount || 0),
          customSensitiveCount: Number(input.summary.customSensitiveCount || 0),
          customBrandCount: Number(input.summary.customBrandCount || 0),
          activeSensitiveCount: Number(input.summary.activeSensitiveCount || 0),
          activeBrandCount: Number(input.summary.activeBrandCount || 0),
          activeCount: Number(input.summary.activeCount || 0),
          disabledDefaultCount: Number(input.summary.disabledDefaultCount || 0)
        }
      : {},
    disabledDefaultRuleIds: sanitizeDisabledComplianceRuleIds(input.disabledDefaultRuleIds || []),
    revisionHistory: sanitizeComplianceRuleRevisionHistory(input.revisionHistory || []),
    customRules: {
      sensitiveTerms: sanitizeComplianceRuleList(input.customRules?.sensitiveTerms || [], 'sensitiveTerms', 'custom'),
      brandRules: sanitizeComplianceRuleList(input.customRules?.brandRules || [], 'brandRules', 'custom')
    }
  };
}

async function persistComplianceAuditRecords() {
  complianceAuditPersistChain = complianceAuditPersistChain.then(async () => {
    await mkdir(dataDir, { recursive: true });
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      records: complianceAuditRecords
    };
    await writeFile(complianceAuditRecordsPath, JSON.stringify(payload, null, 2), 'utf8');
  }).catch((error) => {
    console.error('Failed to persist compliance audit records', error);
  });
  return complianceAuditPersistChain;
}

async function persistAuthorizationCredentials() {
  authorizationCredentialPersistChain = authorizationCredentialPersistChain.then(async () => {
    await mkdir(dataDir, { recursive: true });
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      credentials: authorizationCredentials
    };
    await writeFile(authorizationCredentialsPath, JSON.stringify(payload, null, 2), 'utf8');
  }).catch((error) => {
    console.error('Failed to persist authorization credentials', error);
  });
  return authorizationCredentialPersistChain;
}

async function persistMaterialRightsRecords() {
  materialRightPersistChain = materialRightPersistChain.then(async () => {
    await mkdir(dataDir, { recursive: true });
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      records: materialRightsRecords
    };
    await writeFile(materialRightsPath, JSON.stringify(payload, null, 2), 'utf8');
  }).catch((error) => {
    console.error('Failed to persist material rights records', error);
  });
  return materialRightPersistChain;
}

function makeComplianceAuditRecordId(product = {}, audit = {}) {
  return `audit-${Date.now()}-${stableId(`${product.id || product.title || ''}-${audit.score || ''}-${Math.random()}`)}`;
}

function sanitizeEvidenceUrl(value) {
  const raw = String(value || '').trim();
  if (!raw || /^(data|javascript|file|blob):/i.test(raw)) return '';
  try {
    const parsed = new URL(raw);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.href;
  } catch {
    return raw.split(/[?#]/)[0].slice(0, 240);
  }
}

function sanitizePublicUrl(value) {
  return sanitizeEvidenceUrl(value);
}

function normalizeBaseUrl(value) {
  const raw = String(value || defaultAiConfig.baseUrl).trim().replace(/\/$/, '');
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return defaultAiConfig.baseUrl;
    return raw;
  } catch {
    return defaultAiConfig.baseUrl;
  }
}

function publicAiConfig() {
  const envHasKey = Boolean(process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.DASHSCOPE_API_KEY);
  const visualEnvHasKey = Boolean(process.env.AI_VISUAL_API_KEY || process.env.DASHSCOPE_VISUAL_API_KEY);
  const hasKey = Boolean(aiConfig.apiKey);
  const localHasKey = Boolean(savedAiConfig.apiKey);
  const visualConfig = getAiClientConfig('visual');
  const visualLocalHasKey = Boolean(savedAiConfig.visualApiKey);
  const visualUsesSharedKey = !aiConfig.visualApiKey && Boolean(aiConfig.apiKey);
  return {
    configured: hasKey,
    hasKey,
    remembered: Boolean(savedAiConfig.baseUrl || savedAiConfig.model || localHasKey),
    localHasKey,
    keySource: envHasKey ? 'environment' : savedAiConfig.apiKey ? 'local' : 'none',
    keyHint: maskApiKey(aiConfig.apiKey),
    baseUrl: aiConfig.baseUrl,
    model: aiConfig.model,
    visualConfigured: Boolean(visualConfig.apiKey),
    visualHasKey: Boolean(visualConfig.apiKey),
    visualRemembered: Boolean(savedAiConfig.visualBaseUrl || savedAiConfig.visualModel || visualLocalHasKey),
    visualLocalHasKey,
    visualUsesSharedKey,
    visualKeySource: visualEnvHasKey ? 'environment' : visualLocalHasKey ? 'local' : visualUsesSharedKey ? 'shared' : 'none',
    visualKeyHint: maskApiKey(visualConfig.apiKey),
    visualBaseUrl: visualConfig.baseUrl,
    visualModel: visualConfig.model,
    timeoutMs: aiConfig.timeoutMs
  };
}

function maskApiKey(value) {
  const key = String(value || '');
  if (!key) return '';
  if (key.length <= 8) return '****';
  return `****${key.slice(-4)}`;
}

function getAiClientConfig(scope = 'primary') {
  if (scope === 'visual') {
    return {
      apiKey: aiConfig.visualApiKey || aiConfig.apiKey,
      baseUrl: aiConfig.visualBaseUrl || defaultAiConfig.visualBaseUrl,
      model: aiConfig.visualModel || defaultAiConfig.visualModel,
      timeoutMs: aiConfig.timeoutMs
    };
  }
  return aiConfig;
}

async function testAiConnection(scope = 'primary') {
  const targetConfig = getAiClientConfig(scope);
  if (!targetConfig.apiKey) {
    return {
      ok: false,
      message: '请先保存 API Key。'
    };
  }
  try {
    const response = await fetch(`${targetConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${targetConfig.apiKey}`
      },
      body: JSON.stringify({
        model: targetConfig.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: '只输出 JSON。' },
          { role: 'user', content: '请返回 {"ok":true}' }
        ]
      }),
      signal: AbortSignal.timeout(Math.min(targetConfig.timeoutMs, 30000))
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const diagnostic = diagnoseAiError(response.status, data.error?.message || response.statusText);
      return {
        ok: false,
        status: response.status,
        message: diagnostic.message,
        hint: diagnostic.hint
      };
    }
    return {
      ok: true,
      status: response.status,
      message: 'AI 连接测试成功。',
      model: targetConfig.model
    };
  } catch (error) {
    const diagnostic = error?.hint
      ? { message: error.message, hint: error.hint }
      : diagnoseAiError(0, error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      message: diagnostic.message,
      hint: diagnostic.hint
    };
  }
}

async function openWorkbenchDirectory(kind) {
  const targetDir = kind === 'output' ? outputDir : extensionDir;
  if (kind === 'output') await mkdir(targetDir, { recursive: true });
  if (!existsSync(targetDir)) {
    return {
      ok: false,
      message: kind === 'extension'
        ? '插件目录不存在，请确认当前安装包包含 edge-extension 资源。'
        : '目录不存在。'
    };
  }

  try {
    openDirectory(targetDir);
    return {
      ok: true,
      path: targetDir,
      message: kind === 'output' ? '已打开导出目录。' : '已打开插件目录。'
    };
  } catch (error) {
    return {
      ok: false,
      path: targetDir,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function openDirectory(targetDir) {
  const opener = process.platform === 'win32'
    ? { command: 'explorer.exe', args: [targetDir] }
    : process.platform === 'darwin'
      ? { command: 'open', args: [targetDir] }
      : { command: 'xdg-open', args: [targetDir] };
  const child = spawn(opener.command, opener.args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
}

function diagnoseAiError(status, rawMessage) {
  const message = String(rawMessage || 'AI 调用失败。');
  if (status === 401 || /incorrect api key|invalid api key|apikey/i.test(message)) {
    return {
      message: 'API Key 未通过鉴权。',
      hint: '当前请求已到达模型接口，但保存的 Key 不被该 Base URL 接受。请确认使用的是百炼控制台生成的 API Key；如果是套餐专属 sk-sp Key，请使用对应套餐页面提供的 Base URL，或换成普通百炼 API Key。'
    };
  }
  if (status === 403 || /permission|forbidden|quota|access/i.test(message)) {
    return {
      message: '账号、模型或额度权限不足。',
      hint: '请确认该 Key 所属账号已开通对应模型，且模型名称、地域和额度可用。'
    };
  }
  if (/vision|multimodal|image|video|unsupported content|content type|invalid content/i.test(message)) {
    return {
      message: '当前模型或素材输入不支持视觉分析。',
      hint: '请确认素材 URL 可访问，并使用支持图片/视频输入的视觉模型，例如 qwen-vl-plus、qwen-vl-max 或 qwen3-vl-plus。'
    };
  }
  if (status === 404 || /model|not found/i.test(message)) {
    return {
      message: '模型或接口地址不存在。',
      hint: '请检查 Base URL 是否以 /compatible-mode/v1 结尾，模型名是否为 qwen-plus、qwen-turbo、qwen-vl-plus、qwen3-vl-plus 等当前账号可用模型。'
    };
  }
  if (/ENOTFOUND|getaddrinfo|fetch failed|ECONNREFUSED|ETIMEDOUT|timeout|aborted/i.test(message)) {
    return {
      message: '无法连接到模型服务。',
      hint: '请检查网络、代理、DNS 和 Base URL。若使用套餐专属域名，请先确认本机能解析并访问该域名。'
    };
  }
  return {
    message,
    hint: '请检查 Base URL、模型名、Key 类型和账号权限。'
  };
}

async function readSampleProducts() {
  const content = await readFile(sampleDataPath, 'utf8');
  return JSON.parse(content).map(normalizeProduct);
}

async function fetchTaobaoProducts({ keyword, limit }) {
  const appKey = process.env.TAOBAO_APP_KEY;
  const appSecret = process.env.TAOBAO_APP_SECRET;
  const adzoneId = process.env.TAOBAO_ADZONE_ID;
  if (!appKey || !appSecret || !adzoneId) {
    const fallback = await readSampleProducts();
    return fallback
      .filter((product) => product.platform === 'taobao')
      .slice(0, limit)
      .map((product) => ({
        ...product,
        sourceNotice: '未配置淘宝开放平台密钥，当前显示样例数据。'
      }));
  }

  const params = {
    method: 'taobao.tbk.dg.material.optional',
    app_key: appKey,
    timestamp: formatTaobaoTimestamp(new Date()),
    format: 'json',
    v: '2.0',
    sign_method: 'md5',
    q: keyword || '热卖',
    adzone_id: adzoneId,
    page_size: String(limit),
    sort: 'total_sales_des'
  };
  params.sign = signTaobao(params, appSecret);

  const response = await fetch(`https://eco.taobao.com/router/rest?${new URLSearchParams(params)}`);
  if (!response.ok) {
    throw new Error(`Taobao API failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  const list = data?.tbk_dg_material_optional_response?.result_list?.map_data || [];
  return list.map((item, index) => normalizeProduct({
    id: item.item_id || `taobao-${index}`,
    platform: 'taobao',
    title: item.title,
    category: item.category_name || '淘宝热卖',
    shop: item.shop_title || item.seller_id || '淘宝商家',
    price: Number(item.zk_final_price || item.reserve_price || 0),
    sales: Number(item.volume || item.tk_total_sales || 0),
    commissionRate: Number(item.commission_rate || 0) / 100,
    imageUrl: ensureHttps(item.pict_url),
    mediaType: 'image',
    mediaUrl: ensureHttps(item.pict_url),
    sellingPoints: compact([item.item_description, item.short_title, item.nick]),
    audience: '淘宝站内高购买意图用户'
  }));
}

async function fetchDouyinProducts({ keyword, limit }) {
  const token = process.env.DOUYIN_ACCESS_TOKEN;
  if (!token) {
    const fallback = await readSampleProducts();
    return fallback
      .filter((product) => product.platform === 'douyin')
      .slice(0, limit)
      .map((product) => ({
        ...product,
        sourceNotice: '未配置抖音/抖店开放平台授权，当前显示样例数据。'
      }));
  }

  return [
    normalizeProduct({
      id: 'douyin-adapter-placeholder',
      platform: 'douyin',
      title: keyword || '抖音授权商品',
      category: '抖音电商',
      shop: '已授权账号',
      price: 0,
      sales: 0,
      commissionRate: 0,
      imageUrl: '',
      mediaType: 'image',
      mediaUrl: '',
      sellingPoints: ['请按抖音开放平台/抖店开放平台审批后的接口字段映射'],
      audience: '抖音兴趣推荐流用户',
      sourceNotice: '已检测到 DOUYIN_ACCESS_TOKEN，请在 src/server.js 的 fetchDouyinProducts 中补齐获批接口映射。'
    })
  ];
}

function parseCsvProducts(csv) {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1)
    .filter((row) => row.some(Boolean))
    .map((row, index) => {
      const item = Object.fromEntries(headers.map((header, i) => [header, row[i] || '']));
      return normalizeProduct({
        id: item.id || `csv-${index + 1}`,
        platform: item.platform || 'csv',
        title: item.title || item.name || '未命名商品',
        category: item.category || '未分类',
        shop: item.shop || item.store || '导入商家',
        price: Number(item.price || 0),
        sales: Number(item.sales || item.volume || 0),
        commissionRate: Number(item.commissionRate || item.commission_rate || 0),
        imageUrl: item.imageUrl || item.image || '',
        mediaType: item.mediaType || inferMediaType(item.mediaUrl || item.imageUrl || ''),
        mediaUrl: item.mediaUrl || item.imageUrl || item.image || '',
        mediaItems: item.mediaItems || item.mediaList || item.images || item.imageUrls || item.gallery,
        sellingPoints: splitPoints(item.sellingPoints || item.points || ''),
        audience: item.audience || '导入数据目标人群',
        salesTrend: item.salesTrend || item.salesHistory || item.dailySales || item.trend
      });
    })
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 50);
}

function importSalesHistory(body = {}) {
  const products = Array.isArray(body.products) ? body.products.map((item) => normalizeProduct(item)) : [];
  const source = String(body.source || body.sourceType || 'csv').trim() || 'csv';
  const historyItems = parseSalesHistoryPayload(body);
  const report = {
    source,
    inputRows: historyItems.length,
    matchedProducts: 0,
    unmatchedRows: 0,
    updatedProductIds: [],
    unmatchedKeys: []
  };
  if (!products.length) {
    return {
      products: [],
      count: 0,
      report: {
        ...report,
        message: '请先导入或选择商品，再合并历史销量。'
      }
    };
  }

  const grouped = groupSalesHistoryItems(historyItems);
  const updated = products.map((product) => {
    const key = findSalesHistoryGroupKey(product, grouped);
    if (!key) return product;
    const group = grouped.get(key);
    group.matched = true;
    const salesTrend = normalizeSalesTrend(group.values);
    if (salesTrend.length < 2) return product;
    report.matchedProducts += 1;
    report.updatedProductIds.push(product.id);
    return {
      ...product,
      salesTrend,
      salesTrendSource: source,
      salesTrendUpdatedAt: new Date().toISOString()
    };
  });

  for (const [key, group] of grouped) {
    if (group.matched) continue;
    report.unmatchedRows += group.rows;
    report.unmatchedKeys.push(key);
  }

  return {
    products: updated,
    count: updated.length,
    report: {
      ...report,
      updatedProductIds: Array.from(new Set(report.updatedProductIds)),
      unmatchedKeys: report.unmatchedKeys.slice(0, 20),
      message: report.matchedProducts
        ? `已合并 ${report.matchedProducts} 个商品的真实历史销量。`
        : '未找到可匹配的商品，请确认历史销量表包含 id/productId/sku/title 等匹配字段。'
    }
  };
}

function buildExtensionQualityReport(products = [], context = {}) {
  const list = Array.isArray(products) ? products : [];
  const fields = [
    { key: 'title', label: '标题' },
    { key: 'price', label: '价格' },
    { key: 'sales', label: '销量' },
    { key: 'shop', label: '店铺' },
    { key: 'imageUrl', label: '主图' },
    { key: 'mediaItems', label: '素材' },
    { key: 'salesTrend', label: '历史销量' },
    { key: 'sourceUrl', label: '来源链接' }
  ];
  const completeness = {};
  const missingSamples = [];
  for (const field of fields) {
    const present = list.filter((product) => hasExtensionField(product, field.key)).length;
    completeness[field.key] = {
      label: field.label,
      present,
      total: list.length,
      rate: list.length ? Number((present / list.length).toFixed(3)) : 0
    };
  }
  list.forEach((product) => {
    const missing = fields
      .filter((field) => !hasExtensionField(product, field.key))
      .map((field) => field.key);
    if (missing.length) {
      missingSamples.push({
        id: product.id,
        title: product.title,
        missing
      });
    }
  });
  const candidateCards = Number(context.diagnostics?.candidateCards || 0);
  return {
    schema: 'ad-workbench.extension-quality-report',
    generatedAt: new Date().toISOString(),
    sourceUrl: String(context.sourceUrl || ''),
    pageTitle: String(context.pageTitle || context.diagnostics?.title || ''),
    candidateCards,
    recognizedProducts: list.length,
    recognitionRate: candidateCards ? Number((list.length / candidateCards).toFixed(3)) : 0,
    completeness,
    missingSamples: missingSamples.slice(0, 20),
    recommendations: buildExtensionQualityRecommendations(completeness, candidateCards, list.length)
  };
}

function hasExtensionField(product, key) {
  if (!product) return false;
  if (key === 'price' || key === 'sales') return Number(product[key] || 0) > 0;
  if (key === 'mediaItems') return Array.isArray(product.mediaItems) && product.mediaItems.length > 0;
  if (key === 'salesTrend') return Array.isArray(product.salesTrend) && product.salesTrend.length >= 2;
  return Boolean(String(product[key] || '').trim());
}

function buildExtensionQualityRecommendations(completeness, candidateCards, recognizedProducts) {
  const tips = [];
  if (candidateCards && recognizedProducts < candidateCards) {
    tips.push('部分候选卡片未识别为商品，可把授权页面的失败 DOM 样本沉淀到 fixture 继续调优。');
  }
  if ((completeness.salesTrend?.present || 0) === 0) {
    tips.push('当前页面没有可见历史销量字段；如需趋势图，请导入商家后台 CSV/API 的 salesTrend、salesHistory、dailySales 或 trend 字段。');
  }
  if ((completeness.imageUrl?.rate || 0) < 0.9) {
    tips.push('主图字段覆盖率偏低，优先检查懒加载图片、背景图或 data-cover/data-imgurl 属性。');
  }
  if ((completeness.sales?.rate || 0) < 0.9) {
    tips.push('销量字段覆盖率偏低，建议补充真实授权页面中的销量表达样本。');
  }
  return tips;
}

function parseSalesHistoryPayload(body = {}) {
  const items = [];
  const payload = body.history || body.rows || body.data || body.items;
  if (Array.isArray(payload)) {
    payload.forEach((item, index) => {
      items.push(...normalizeSalesHistoryRow(item, index));
    });
  }
  const csv = String(body.csv || body.content || '').trim();
  if (csv) {
    parseSalesHistoryCsv(csv).forEach((item) => items.push(item));
  }
  return items.filter((item) => item.key && Number.isFinite(item.value) && item.value >= 0);
}

function parseSalesHistoryCsv(csv) {
  const normalizedCsv = String(csv || '').replace(/\\r\\n|\\n|\\r/g, '\n');
  const rows = parseCsv(normalizedCsv);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => normalizeSalesHistoryHeader(header));
  return rows.slice(1).flatMap((row, index) => {
    const item = Object.fromEntries(headers.map((header, i) => [header, row[i] || '']));
    return normalizeSalesHistoryRow(item, index);
  });
}

function normalizeSalesHistoryHeader(header) {
  const raw = String(header || '').trim();
  const key = raw.toLowerCase().replace(/[\s_-]+/g, '');
  const aliases = {
    productid: 'productId',
    product: 'productId',
    itemid: 'productId',
    goodsid: 'productId',
    skuid: 'sku',
    sku: 'sku',
    id: 'id',
    title: 'title',
    name: 'title',
    date: 'date',
    day: 'date',
    dt: 'date',
    sales: 'sales',
    sale: 'sales',
    volume: 'sales',
    count: 'sales',
    value: 'sales',
    salestrend: 'salesTrend',
    saleshistory: 'salesTrend',
    dailysales: 'salesTrend',
    trend: 'salesTrend'
  };
  return aliases[key] || raw;
}

function normalizeSalesHistoryRow(input = {}, index = 0) {
  if (Array.isArray(input)) {
    return normalizeSalesTrend(input).map((value, itemIndex) => ({
      key: `row-${index}`,
      date: String(itemIndex + 1),
      value
    }));
  }
  if (!input || typeof input !== 'object') return [];
  const key = normalizeSalesHistoryKey(input.id || input.productId || input.product_id || input.itemId || input.goodsId || input.sku || input.title || input.name);
  const trend = input.salesTrend || input.salesHistory || input.dailySales || input.trend;
  if (trend !== undefined && trend !== null && trend !== '') {
    return normalizeSalesTrend(trend).map((value, itemIndex) => ({
      key,
      date: String(input.date || input.day || itemIndex + 1),
      value
    }));
  }
  const value = parseSalesHistoryNumber(input.sales ?? input.sale ?? input.volume ?? input.count ?? input.value);
  return [{
    key,
    date: String(input.date || input.day || index + 1),
    value
  }];
}

function parseSalesHistoryNumber(value) {
  const text = String(value ?? '').trim();
  if (!text) return 0;
  const number = Number(text.replace(/[,+]/g, '').replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(number)) return 0;
  if (/万|w/i.test(text)) return Math.round(number * 10000);
  if (/千|k/i.test(text)) return Math.round(number * 1000);
  return Math.round(number);
}

function groupSalesHistoryItems(items) {
  const grouped = new Map();
  for (const item of items) {
    const key = normalizeSalesHistoryKey(item.key);
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, { values: [], rows: 0, matched: false });
    const group = grouped.get(key);
    group.rows += 1;
    group.values.push({
      date: item.date || '',
      sales: item.value
    });
  }
  return grouped;
}

function findSalesHistoryGroupKey(product, grouped) {
  const candidates = [
    product.id,
    product.productId,
    product.itemId,
    product.goodsId,
    product.sku,
    product.title,
    `${product.title}|${product.shop}`
  ].map(normalizeSalesHistoryKey).filter(Boolean);
  return candidates.find((key) => grouped.has(key)) || '';
}

function normalizeSalesHistoryKey(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function parseAuthorizedTextProducts(content, options = {}) {
  const raw = String(content || '')
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .trim();
  const warnings = [
    '仅解析你粘贴的已授权文本/HTML，不会自动访问淘宝页面或绕过登录、风控、反爬限制。',
    '投放前请保留商家授权、后台导出记录、复制时间和原始页面截图。'
  ];
  if (!raw) return { products: [], warnings: ['内容为空，请粘贴商品列表文本、HTML 片段或后台导出内容。'] };
  if (/^https?:\/\/\S+$/i.test(raw)) {
    return {
      products: [],
      warnings: [
        ...warnings,
        '检测到你只输入了 URL。为了避免未授权抓取，请打开你有权访问的页面后复制商品列表内容，再粘贴到这里解析。'
      ]
    };
  }

  const rows = parseCsv(raw);
  const headers = rows[0]?.map((header) => header.trim().toLowerCase()) || [];
  if (rows.length > 1 && (headers.includes('title') || headers.includes('name'))) {
    return { products: parseCsvProducts(raw), warnings };
  }

  const images = extractImageUrls(raw);
  const plain = htmlToPlainText(raw);
  const blocks = buildProductBlocks(plain);
  const seen = new Set();
  const products = [];

  blocks.forEach((block, index) => {
    const product = parseProductBlock(block, index, images, options);
    if (!product) return;
    const key = `${product.title}|${product.price}|${product.shop}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    products.push(product);
  });

  if (!products.length) {
    warnings.push('未识别出商品卡片。建议复制包含标题、价格、销量和店铺的列表区域，或改用 CSV 表头导入。');
  }

  return {
    products: products
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 50)
      .map((product, index) => ({
        ...product,
        rank: index + 1,
        score: scoreProduct(product)
      })),
    warnings
  };
}

function extractImageUrls(html) {
  const urls = [];
  const attrPattern = /\b(?:src|data-src|data-original|data-ks-lazyload|data-lazy-src)=["']([^"']+)["']/gi;
  let match;
  while ((match = attrPattern.exec(html))) {
    urls.push(match[1]);
  }
  const srcsetPattern = /\bsrcset=["']([^"']+)["']/gi;
  while ((match = srcsetPattern.exec(html))) {
    urls.push(...match[1].split(',').map((item) => item.trim().split(/\s+/)[0]));
  }
  return [...new Set(urls.map(normalizeAssetUrl).filter(Boolean))];
}

function normalizeAssetUrl(value) {
  const decoded = decodeHtmlEntities(String(value || '').trim());
  if (!decoded || decoded.startsWith('data:')) return '';
  if (decoded.startsWith('//')) return `https:${decoded}`;
  if (/^https?:\/\//i.test(decoded)) return ensureHttps(decoded);
  return '';
}

function htmlToPlainText(value) {
  return decodeHtmlEntities(String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '\n')
    .replace(/<(?:br|p|li|ul|ol|div|section|article|tr|td|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim());
}

function decodeHtmlEntities(value) {
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' '
  };
  return String(value || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code) => {
    const lower = code.toLowerCase();
    if (named[lower]) return named[lower];
    if (lower.startsWith('#x')) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    if (lower.startsWith('#')) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    return entity;
  });
}

function buildProductBlocks(plain) {
  const blocks = plain
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length >= 8);
  const usefulBlocks = blocks.filter((block) => hasProductSignal(block));
  if (usefulBlocks.length >= 2) return usefulBlocks;

  const lines = plain
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const anchors = [];
  lines.forEach((line, index) => {
    if (extractPrice(line) || extractSales(line)) anchors.push(index);
  });
  return anchors.map((index) => lines.slice(Math.max(0, index - 4), Math.min(lines.length, index + 8)).join('\n'));
}

function hasProductSignal(block) {
  return Boolean(extractPrice(block) || extractSales(block)) && /[\u4e00-\u9fa5A-Za-z]{4,}/.test(block);
}

function parseProductBlock(block, index, images, options) {
  const lines = block
    .split(/\n+/)
    .map((line) => cleanCommerceLine(line))
    .filter(Boolean);
  const text = lines.join(' ');
  const title = extractTitle(lines, text);
  if (!title) return null;
  const price = extractPrice(text);
  const sales = extractSales(text);
  const shop = extractShop(lines) || '淘宝授权导入';
  const imageUrl = images[index] || '';
  const sellingPoints = extractSellingPointsFromText(text);
  return normalizeProduct({
    id: `paste-${stableId(`${title}-${price}-${shop}`)}`,
    platform: options.platform || 'taobao',
    category: options.category || '淘宝导入商品',
    shop,
    title,
    price,
    sales,
    commissionRate: 0,
    imageUrl,
    mediaType: inferMediaType(imageUrl),
    mediaUrl: imageUrl,
    sellingPoints,
    audience: options.audience || '淘宝高购买意图用户'
  });
}

function cleanCommerceLine(line) {
  return String(line || '')
    .replace(/\s+/g, ' ')
    .replace(/^[-•·\d.、\s]+/, '')
    .replace(/^(广告|找相似|进店|客服|收藏|分享|详情|评价|问大家|加入购物车|立即购买)$/i, '')
    .trim();
}

function extractTitle(lines, text) {
  const signalIndex = lines.findIndex((line) => extractPrice(line) || extractSales(line));
  const candidates = lines
    .map((line, index) => ({
      line: line.replace(/(?:¥|￥)\s*\d+(?:\.\d+)?/g, '').trim(),
      index
    }))
    .filter(({ line }) => {
      if (line.length < 4 || line.length > 90) return false;
      if (/^https?:\/\//i.test(line)) return false;
      if (/^(¥|￥)?\d+(?:\.\d+)?(?:元|起)?$/.test(line)) return false;
      if (/(月销|已售|销量|售出|付款|成交|评价|券后|到手价|包邮|满减|退换|发货|天猫|淘宝)$/.test(line) && line.length < 12) return false;
      return /[\u4e00-\u9fa5A-Za-z]{4,}/.test(line);
    })
    .sort((a, b) => scoreTitleLine(b.line, b.index, signalIndex) - scoreTitleLine(a.line, a.index, signalIndex));
  if (candidates[0]) return candidates[0].line.slice(0, 80);

  const fallback = text
    .replace(/(?:¥|￥)\s*\d+(?:\.\d+)?/g, ' ')
    .replace(/(?:月销|已售|销量|售出|付款|成交)\s*[\d,.]+(?:万|千|w|W|k|K)?/g, ' ')
    .trim();
  return fallback.length >= 4 ? fallback.slice(0, 80) : '';
}

function scoreTitleLine(line, index = 0, signalIndex = -1) {
  let score = Math.min(line.length, 60);
  if (signalIndex >= 0 && index < signalIndex) score += 26;
  if (signalIndex >= 0 && index > signalIndex) score -= 18;
  if (index === 0) score += 14;
  if (/旗舰店|专营店|专卖店|店铺/.test(line)) score -= 20;
  if (/包邮|券后|满减|发货|退换|评价/.test(line)) score -= 12;
  if (/安装|空间|速干|低噪|优惠|背书|现货|发货/.test(line) && line.length < 18 && index > signalIndex) score -= 16;
  if (/[\u4e00-\u9fa5]/.test(line)) score += 10;
  return score;
}

function extractPrice(text) {
  const patterns = [
    /(?:¥|￥)\s*([0-9]+(?:\.[0-9]{1,2})?)/g,
    /(?:券后|到手价|价格|折后价|促销价)[:：\s]*([0-9]+(?:\.[0-9]{1,2})?)/g
  ];
  for (const pattern of patterns) {
    const matches = [...String(text || '').matchAll(pattern)]
      .map((match) => Number(match[1]))
      .filter((value) => value > 0 && value < 100000);
    if (matches.length) return Math.min(...matches);
  }
  return 0;
}

function extractSales(text) {
  const patterns = [
    /(?:月销|已售|销量|售出|付款|成交)\s*([0-9,.]+)\s*(万|w|W|千|k|K)?/g,
    /([0-9,.]+)\s*(万|w|W|千|k|K)?\s*(?:人付款|人已买|件已售|已售|销量|成交)/g
  ];
  const values = [];
  for (const pattern of patterns) {
    for (const match of String(text || '').matchAll(pattern)) {
      values.push(parseCommerceNumber(match[1], match[2]));
    }
  }
  return Math.max(0, ...values.filter(Number.isFinite));
}

function parseCommerceNumber(value, unit = '') {
  const number = Number(String(value || '').replace(/,/g, ''));
  if (!Number.isFinite(number)) return 0;
  if (/万|w/i.test(unit)) return Math.round(number * 10000);
  if (/千|k/i.test(unit)) return Math.round(number * 1000);
  return Math.round(number);
}

function extractShop(lines) {
  const labeled = lines.find((line) => /(?:店铺|商家|卖家)[:：]/.test(line));
  if (labeled) return labeled.replace(/^.*?(?:店铺|商家|卖家)[:：]\s*/, '').slice(0, 32);
  const signalIndex = lines.findIndex((line) => extractPrice(line) || extractSales(line));
  const searchLines = signalIndex > 0 ? lines.slice(0, signalIndex) : lines;
  const candidate = searchLines.find((line) => /旗舰店|专营店|专卖店|官方店|企业店|工厂店|生活馆|研究所|补给站|便利店|摄影棚|店$/.test(line) && line.length <= 32);
  return candidate || '';
}

function extractSellingPointsFromText(text) {
  const points = [];
  const source = String(text || '');
  if (/包邮/.test(source)) points.push('包邮权益');
  if (/券|优惠|满减|立减|到手价/.test(source)) points.push('价格优惠');
  if (/月销|已售|付款|成交/.test(source)) points.push('销量背书');
  if (/现货|发货|次日达|送达/.test(source)) points.push('履约明确');
  return points.slice(0, 4);
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let cell = '';
  let quote = false;
  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];
    if (char === '"' && quote && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quote = !quote;
    } else if (char === ',' && !quote) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quote) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function analyzeMedia(input) {
  const product = normalizeProduct(input.product || input);
  const mediaType = input.mediaType || product.mediaType || inferMediaType(product.mediaUrl);
  const points = product.sellingPoints.length ? product.sellingPoints : deriveSellingPoints(product);
  const priceSignal = product.price <= 50 ? '低客单冲动购买' : product.price <= 200 ? '中客单理性转化' : '高客单需要信任背书';
  const salesSignal = product.sales >= 50000 ? '爆品强背书' : product.sales >= 30000 ? '热卖可跟进' : '需要差异化切入';
  const visualStyle = chooseVisualStyle(product);
  const hook = buildHook(product, points[0], priceSignal);

  return {
    mediaType,
    sourceUrl: product.mediaUrl || product.imageUrl,
    creativePattern: mediaType === 'video'
      ? '痛点开场 -> 使用过程 -> 前后对比 -> 限时利益点 -> 行动号召'
      : '场景图/产品主体 -> 三个利益点标签 -> 价格锚点 -> 明确购买理由',
    likelyShots: buildShotList(product, mediaType),
    hook,
    visualStyle,
    persuasionAngles: compact([
      points[0] && `核心利益：${points[0]}`,
      points[1] && `辅助利益：${points[1]}`,
      salesSignal,
      priceSignal,
      `目标人群：${product.audience}`
    ]),
    riskNotes: [
      '不要下载、搬运或逐帧复刻第三方视频/图片素材。',
      '可复用的是结构、节奏和卖点表达方式；画面、文案、配乐、人物表演需原创或已授权。',
      '涉及平台数据抓取时，优先使用开放平台、商家后台导出或达人授权数据。'
    ],
    visualRisk: buildVisualRiskBaseline(product)
  };
}

async function analyzeMediaWithAi(product, options = {}) {
  const analysis = analyzeMedia(product);
  const visualRisk = options.includeVisualRisk
    ? await analyzeVisualRiskWithAi(product, options)
    : analysis.visualRisk;
  if (!aiConfig.apiKey) {
    return {
      ...analysis,
      visualRisk,
      ai: {
        enabled: false,
        status: 'not_configured',
        message: '未配置 AI_API_KEY，当前使用本地规则分析。'
      }
    };
  }

  try {
    const insight = await callAiForProductAnalysis(product, analysis, options);
    return {
      ...analysis,
      visualRisk,
      ai: {
        enabled: true,
        status: 'ok',
        provider: 'openai-compatible',
        model: aiConfig.model,
        ...insight
      }
    };
  } catch (error) {
    const diagnostic = diagnoseAiError(0, error instanceof Error ? error.message : String(error));
    return {
      ...analysis,
      visualRisk,
      ai: {
        enabled: true,
        status: 'error',
        model: aiConfig.model,
        message: diagnostic.message,
        hint: diagnostic.hint
      }
    };
  }
}

async function callAiForProductAnalysis(product, analysis, options = {}) {
  const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`
    },
    body: JSON.stringify({
      model: options.model || aiConfig.model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            '你是一个合规优先的电商广告策略分析师。',
            '你只分析用户提供的商品数据和已授权页面信息，不建议绕过平台限制、搬运素材或复刻竞品广告。',
            '请输出严格 JSON，不要 Markdown，不要额外解释。'
          ].join('\n')
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: '分析这个商品适合怎样做原创广告，不要复用第三方素材。',
            requiredSchema: {
              audienceInsight: '一句话目标人群洞察',
              purchaseDrivers: ['购买动机1', '购买动机2', '购买动机3'],
              creativeAngles: ['原创创意角度1', '原创创意角度2', '原创创意角度3'],
              differentiation: ['差异化表达1', '差异化表达2'],
              contentWarnings: ['合规或素材风险1', '合规或素材风险2'],
              recommendedHook: '原创开场钩子',
              evidenceNeeded: ['发布前需要留存的证据1', '证据2']
            },
            product: {
              title: product.title,
              platform: product.platform,
              category: product.category,
              shop: product.shop,
              price: product.price,
              sales: product.sales,
              sellingPoints: product.sellingPoints,
              audience: product.audience,
              mediaType: product.mediaType,
              hasMediaUrl: Boolean(product.mediaUrl || product.imageUrl)
            },
            localRuleAnalysis: {
              hook: analysis.hook,
              creativePattern: analysis.creativePattern,
              visualStyle: analysis.visualStyle,
              persuasionAngles: analysis.persuasionAngles,
              riskNotes: analysis.riskNotes
            }
          })
        }
      ]
    }),
    signal: AbortSignal.timeout(aiConfig.timeoutMs)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const diagnostic = diagnoseAiError(response.status, data.error?.message || response.statusText);
    const error = new Error(diagnostic.message);
    error.hint = diagnostic.hint;
    throw error;
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI response did not include message content.');
  return normalizeAiInsight(parseJsonObject(content));
}

function buildVisualRiskBaseline(product) {
  const asset = resolveVisualAsset(product);
  const isVideo = asset.mediaType === 'video';
  const platformSignal = /douyin|tiktok|kuaishou|taobao|tmall|xiaohongshu|alicdn|watermark|logo|subtitle/i.test(asset.sourceUrl || '');
  const evidence = compact([
    !asset.sourceUrl && '当前商品缺少图片或视频地址。',
    asset.sourceUrl && `素材地址：${asset.sourceUrl}`,
    isVideo && '视频素材需要检查平台水印、字幕、贴纸和镜头切换。',
    platformSignal && '素材 URL 或来源中出现平台、logo、水印或字幕相关线索。'
  ]).slice(0, 6);
  const riskLevel = !asset.sourceUrl ? 'medium' : isVideo || platformSignal ? 'medium' : 'low';

  const report = {
    enabled: false,
    status: asset.sourceUrl ? 'local' : 'no_asset',
    provider: 'local-rules',
    model: '',
    mediaType: asset.mediaType,
    sourceUrl: asset.sourceUrl,
    assetMode: asset.assetMode,
    riskLevel,
    summary: asset.sourceUrl
      ? '已完成本地视觉预检；配置视觉模型后可识别画面中的水印、字幕、品牌和场景风险。'
      : '缺少可分析的视觉素材地址，无法进行画面复核。',
    findings: {
      watermark: {
        status: platformSignal ? 'possible' : 'unknown',
        detail: asset.sourceUrl ? '需检查角标、平台水印、边框水印和下载痕迹。' : '没有素材地址，无法判断是否有水印。',
        evidence: platformSignal ? ['URL 或来源出现平台/水印相关线索。'] : []
      },
      subtitle: {
        status: isVideo ? 'possible' : 'unknown',
        detail: isVideo ? '视频素材可能包含字幕、贴纸或口播转写文字。' : '静态图暂未发现字幕线索，仍需检查画面贴字。',
        evidence: isVideo ? ['媒体类型为视频。'] : []
      },
      subject: {
        status: 'clear',
        detail: product.title || product.category || '商品主体待确认。',
        evidence: compact([product.category && `类目：${product.category}`, product.shop && `店铺：${product.shop}`])
      },
      scene: {
        status: 'clear',
        detail: chooseVisualStyle(product),
        evidence: compact([product.category && `根据类目 ${product.category} 推断场景。`])
      },
      shotChange: {
        status: isVideo ? 'unknown' : 'single',
        detail: isVideo ? '需要视觉模型或抽帧确认镜头切换、剪辑节奏和是否逐帧复刻。' : '静态图无镜头切换。',
        evidence: isVideo ? ['媒体类型为视频。'] : []
      },
      brandLogo: {
        status: platformSignal || product.shop ? 'possible' : 'unknown',
        detail: '需检查画面中是否出现第三方品牌 logo、店铺标识或平台角标，并确认授权范围。',
        evidence: compact([product.shop && `店铺/品牌线索：${product.shop}`])
      },
      onScreenText: {
        status: isVideo ? 'possible' : 'unknown',
        detail: '需检查画面文字是否包含极限词、医疗功效、虚假销量背书或误导性导流。',
        evidence: []
      }
    },
    evidence,
    recommendations: [
      '优先使用自有拍摄或已授权的干净素材源文件。',
      '发布前保留素材授权、拍摄记录、后台导出记录和审核记录。',
      isVideo ? '视频素材建议提供可访问的视频 URL 或封面帧，便于视觉模型复核。' : '静态图建议保留无水印原图和设计源文件。'
    ]
  };
  return enrichVisualRiskReport(report, product);
}

async function attachVisualAssetAccess(report = {}, product = {}, visualConfig = getAiClientConfig('visual')) {
  const assetAccess = await inspectVisualAssetAccess(report.sourceUrl, visualConfig);
  const accessEvidence = assetAccess.summary ? [assetAccess.summary] : [];
  const accessWarnings = assetAccess.accessible === false
    ? ['素材地址当前不可访问，视觉模型可能无法读取画面；请改用公网可访问 URL 或上传/导入可授权素材。']
    : [];
  return enrichVisualRiskReport({
    ...report,
    assetAccess,
    evidence: compact([...(report.evidence || []), ...accessEvidence]).slice(0, 8),
    contentWarnings: compact([...(report.contentWarnings || []), ...accessWarnings]).slice(0, 8)
  }, product);
}

async function inspectVisualAssetAccess(sourceUrl, visualConfig = getAiClientConfig('visual')) {
  const url = String(sourceUrl || '').trim();
  const checkedAt = new Date().toISOString();
  if (!url) {
    return {
      status: 'no_asset',
      accessible: false,
      checkedAt,
      summary: '未提供素材地址。',
      detail: '请补充图片、视频或封面图地址后再进行视觉分析。'
    };
  }
  if (/^data:/i.test(url)) {
    return {
      status: 'embedded',
      accessible: true,
      checkedAt,
      summary: '素材为本地内嵌数据，已跳过公网可访问性检查。',
      detail: '视觉模型将直接读取内嵌素材内容。'
    };
  }
  if (!/^https?:\/\//i.test(url)) {
    return {
      status: 'private',
      accessible: false,
      checkedAt,
      summary: '素材地址不是 HTTP/HTTPS 公网 URL。',
      detail: '请使用视觉模型可访问的授权素材 URL，或先导入可用图片地址。'
    };
  }

  const timeoutMs = Math.min(Number(visualConfig.timeoutMs || defaultAiConfig.timeoutMs), 12000);
  const base = {
    checkedAt,
    url: sanitizePublicUrl(url)
  };
  try {
    let response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(timeoutMs)
    });
    let method = 'HEAD';
    if (!response.ok && [403, 405, 406].includes(response.status)) {
      response = await fetch(url, {
        headers: { Range: 'bytes=0-1023' },
        signal: AbortSignal.timeout(timeoutMs)
      });
      method = 'GET';
    }
    const contentType = response.headers.get('content-type') || guessImageMimeType(url);
    const sizeBytes = Number(response.headers.get('content-length') || 0);
    const accessible = response.ok || response.status === 206;
    return {
      ...base,
      status: accessible ? 'ok' : 'http_error',
      accessible,
      method,
      httpStatus: response.status,
      contentType,
      sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
      summary: accessible
        ? `素材地址可访问：HTTP ${response.status}，${contentType || '未知类型'}。`
        : `素材地址返回 HTTP ${response.status}，视觉模型可能无法读取。`,
      detail: accessible
        ? '发布前仍需确认该地址来自授权素材源，并保留源文件或授权记录。'
        : '请替换为可访问的授权素材地址，或使用本地导入后的图片。'
    };
  } catch (error) {
    return {
      ...base,
      status: 'network_error',
      accessible: false,
      summary: '素材地址访问检查失败。',
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

async function analyzeVisualRiskWithAi(product, options = {}) {
  const baseline = buildVisualRiskBaseline(product);
  const visualConfig = getAiClientConfig('visual');
  const checkedBaseline = await attachVisualAssetAccess(baseline, product, visualConfig);
  if (!visualConfig.apiKey) {
    return {
      ...checkedBaseline,
      status: checkedBaseline.status === 'no_asset' ? 'no_asset' : 'not_configured',
      message: checkedBaseline.status === 'no_asset'
        ? '当前商品没有可分析素材。'
        : '未配置视觉模型 Key，当前仅返回本地视觉预检。'
    };
  }
  if (!checkedBaseline.sourceUrl) {
    return {
      ...checkedBaseline,
      enabled: true,
      status: 'no_asset',
      message: '当前商品没有可分析素材，请补充图片、视频或封面图地址。'
    };
  }

  try {
    return await callAiForVisualRisk(product, checkedBaseline, options, visualConfig);
  } catch (error) {
    const diagnostic = diagnoseAiError(error?.status || 0, error instanceof Error ? error.message : String(error));
    const failedModel = error?.model || resolveVisualModelCandidates(options, visualConfig)[0];
    return enrichVisualRiskReport({
      ...checkedBaseline,
      enabled: true,
      status: 'error',
      model: failedModel,
      modelCandidates: buildVisualModelCandidatesReport(options, visualConfig, failedModel),
      message: diagnostic.message,
      hint: diagnostic.hint
    }, product);
  }
}

async function callAiForVisualRisk(product, baseline, options = {}, visualConfig = getAiClientConfig('visual')) {
  const modelCandidates = resolveVisualModelCandidates(options, visualConfig);
  const inputCandidates = await buildVisualInputCandidates(product, visualConfig);
  if (!inputCandidates.length) {
    return enrichVisualRiskReport({
      ...baseline,
      enabled: true,
      status: 'no_asset',
      modelCandidates: buildVisualModelCandidatesReport(options, visualConfig),
      message: '当前素材无法转换为视觉模型输入。'
    }, product);
  }

  let lastError = null;
  for (const model of modelCandidates) {
    for (const input of inputCandidates) {
      try {
        const response = await fetch(`${visualConfig.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${visualConfig.apiKey}`
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: [
                  '你是一个合规优先的广告素材视觉审核员。',
                  '你只根据用户提供的图片或视频可见内容判断，不猜测不可见信息。',
                  '重点识别水印、字幕、主体、场景、镜头切换、品牌露出和画面文字风险。',
                  '不要复制素材，不要建议规避平台审核、版权审核或广告法审核。',
                  '请输出严格 JSON，不要 Markdown，不要额外解释。'
                ].join('\n')
              },
              {
                role: 'user',
                content: [
                  input.part,
                  {
                    type: 'text',
                    text: JSON.stringify({
                      task: '分析该授权素材的可见风险，并给出原创重拍或合规替换建议。',
                      product: {
                        title: product.title,
                        platform: product.platform,
                        category: product.category,
                        shop: product.shop,
                        sellingPoints: product.sellingPoints,
                        mediaType: baseline.mediaType,
                        sourceUrl: baseline.sourceUrl,
                        inputMode: input.mode
                      },
                      requiredSchema: {
                        riskLevel: 'low | medium | high',
                        summary: '一句话概括视觉风险',
                        findings: {
                          watermark: { status: 'none | possible | visible | unknown', detail: '水印/平台角标判断', evidence: ['可见证据'] },
                          subtitle: { status: 'none | possible | visible | unknown', detail: '字幕/贴纸/口播文字判断', evidence: ['可见证据'] },
                          subject: { status: 'clear | unclear | unknown', detail: '主体是否清晰及主体内容', evidence: ['可见证据'] },
                          scene: { status: 'clear | unclear | unknown', detail: '场景描述及风险', evidence: ['可见证据'] },
                          shotChange: { status: 'single | multiple | unknown', detail: '镜头切换、剪辑节奏或视频结构', evidence: ['可见证据'] },
                          brandLogo: { status: 'none | possible | visible | unknown', detail: '品牌 logo/店铺标识/第三方标志判断', evidence: ['可见证据'] },
                          onScreenText: { status: 'none | possible | visible | unknown', detail: '画面文字、绝对化用语或导流风险', evidence: ['可见证据'] }
                        },
                        evidence: ['可留存或需复核的证据'],
                        recommendations: ['合规重拍/替换建议'],
                        contentWarnings: ['发布前风险提醒']
                      },
                      localPrecheck: {
                        riskLevel: baseline.riskLevel,
                        summary: baseline.summary,
                        findings: baseline.findings,
                        evidence: baseline.evidence,
                        assetAccess: baseline.assetAccess
                      }
                    })
                  }
                ]
              }
            ]
          }),
          signal: AbortSignal.timeout(Math.min(visualConfig.timeoutMs, 30000))
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = data.error?.message || response.statusText;
          const error = new Error(message);
          error.status = response.status;
          error.model = model;
          lastError = error;
          if (shouldRetryVisualModel(response.status, message)) continue;
          throw error;
        }

        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('AI response did not include message content.');
        return normalizeVisualRiskInsight(parseJsonObject(content), baseline, {
          model,
          inputMode: input.mode,
          product,
          modelCandidates: buildVisualModelCandidatesReport(options, visualConfig, model)
        });
      } catch (error) {
        const nextError = error instanceof Error ? error : new Error(String(error));
        nextError.model ||= model;
        lastError = nextError;
        if (!shouldRetryVisualModel(nextError.status || 0, nextError.message)) {
          throw nextError;
        }
      }
    }
  }
  throw lastError || new Error('视觉模型调用失败。');
}

function shouldRetryVisualModel(status, message) {
  const raw = String(message || '');
  if (status === 401) return false;
  if (status === 403 || status === 404) return true;
  return /model|not found|unsupported|vision|multimodal|image|video|content type|input/i.test(raw);
}

function resolveVisualAsset(product) {
  const mediaType = product.mediaType || inferMediaType(product.mediaUrl || product.imageUrl || '');
  const mediaUrl = String(product.mediaUrl || '').trim();
  const imageUrl = String(product.imageUrl || '').trim();
  const isVideo = mediaType === 'video';
  const sourceUrl = isVideo ? (mediaUrl || imageUrl) : (imageUrl || mediaUrl);
  const assetMode = isVideo && mediaUrl ? 'video_url' : 'image_url';
  return {
    mediaType,
    sourceUrl,
    assetMode,
    posterUrl: isVideo ? imageUrl : '',
    mediaUrl,
    imageUrl
  };
}

async function buildVisualInputCandidates(product, visualConfig = getAiClientConfig('visual')) {
  const asset = resolveVisualAsset(product);
  const candidates = [];
  if (asset.assetMode === 'video_url' && asset.mediaUrl) {
    candidates.push({
      mode: 'video_url',
      part: {
        type: 'video_url',
        video_url: {
          url: asset.mediaUrl,
          fps: 1
        }
      }
    });
  }
  const mediaLooksImage = looksLikeImageUrl(asset.mediaUrl);
  const imageSource = asset.imageUrl || (asset.assetMode === 'image_url' || mediaLooksImage ? asset.sourceUrl : '');
  if (imageSource) {
    candidates.push({
      mode: asset.assetMode === 'video_url' ? 'poster_image' : 'image_url',
      part: {
        type: 'image_url',
        image_url: {
          url: await prepareImageInputUrl(imageSource, visualConfig)
        }
      }
    });
  }
  return candidates;
}

function looksLikeImageUrl(url) {
  return /^data:image\//i.test(String(url || ''))
    || /\.(png|jpe?g|webp|gif)(?:[?#].*)?$/i.test(String(url || ''));
}

async function prepareImageInputUrl(sourceUrl, visualConfig = getAiClientConfig('visual')) {
  const url = String(sourceUrl || '').trim();
  if (!url || /^data:/i.test(url) || !/^https?:\/\//i.test(url)) return url;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(Math.min(visualConfig.timeoutMs, 12000))
    });
    if (!response.ok) return url;
    const contentType = response.headers.get('content-type') || guessImageMimeType(url);
    if (!/^image\//i.test(contentType)) return url;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) return url;
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return url;
  }
}

function guessImageMimeType(url) {
  try {
    const ext = extname(new URL(url).pathname).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.gif') return 'image/gif';
  } catch {
    return 'image/jpeg';
  }
  return 'image/jpeg';
}

function resolveVisualModelCandidates(options = {}, visualConfig = getAiClientConfig('visual')) {
  const models = [];
  const explicitModel = String(options.visualModel || options.model || '').trim();
  const configuredModel = String(visualConfig.model || '').trim();
  if (explicitModel) models.push(explicitModel);
  if (looksLikeVisionModel(configuredModel)) models.push(configuredModel);
  models.push('qwen-vl-plus', 'qwen-vl-max', 'qwen3-vl-plus', 'qwen3-vl-flash');
  return [...new Set(models.filter(Boolean))];
}

function looksLikeVisionModel(model) {
  return /(?:vl|vision|omni|qwen3\.6|qwen3\.5|qwen2\.5)/i.test(String(model || ''));
}

function normalizeVisualRiskInsight(input, fallback, meta = {}) {
  const findingsInput = input.findings && typeof input.findings === 'object' ? input.findings : {};
  const findings = {
    watermark: normalizeVisualFinding(findingsInput.watermark ?? input.watermark, fallback.findings.watermark),
    subtitle: normalizeVisualFinding(findingsInput.subtitle ?? input.subtitle, fallback.findings.subtitle),
    subject: normalizeVisualFinding(findingsInput.subject ?? input.subject, fallback.findings.subject),
    scene: normalizeVisualFinding(findingsInput.scene ?? input.scene, fallback.findings.scene),
    shotChange: normalizeVisualFinding(findingsInput.shotChange ?? input.shotChange, fallback.findings.shotChange),
    brandLogo: normalizeVisualFinding(findingsInput.brandLogo ?? input.brandLogo, fallback.findings.brandLogo),
    onScreenText: normalizeVisualFinding(findingsInput.onScreenText ?? input.onScreenText, fallback.findings.onScreenText)
  };
  const evidence = compact([
    ...toTextList(input.evidence).slice(0, 8),
    ...Object.values(findings).flatMap((finding) => finding.evidence || [])
  ]).slice(0, 8);
  const recommendations = toTextList(input.recommendations).slice(0, 6);
  const riskLevel = normalizeRiskLevel(input.riskLevel) || inferVisualRiskLevel(findings, fallback.riskLevel);
  const normalizedReport = {
    ...fallback,
    enabled: true,
    status: 'ok',
    provider: 'openai-compatible',
    model: meta.model || fallback.model,
    inputMode: meta.inputMode || fallback.assetMode,
    modelCandidates: meta.modelCandidates || fallback.modelCandidates,
    riskLevel,
    summary: String(input.summary || fallback.summary || '').trim(),
    findings,
    evidence: evidence.length ? evidence : fallback.evidence,
    recommendations: recommendations.length ? recommendations : fallback.recommendations,
    contentWarnings: compact([
      ...toTextList(fallback.contentWarnings),
      ...toTextList(input.contentWarnings)
    ]).slice(0, 6)
  };

  return enrichVisualRiskReport({
    ...normalizedReport,
    localPrecheck: summarizeVisualPrecheck(fallback),
    precheckComparison: buildVisualPrecheckComparison(fallback, normalizedReport)
  }, meta.product || {});
}

function normalizeVisualFinding(input, fallback = {}) {
  if (typeof input === 'string') {
    return {
      status: fallback.status || 'unknown',
      detail: input.trim() || fallback.detail || '',
      evidence: fallback.evidence || []
    };
  }
  const value = input && typeof input === 'object' ? input : {};
  return {
    status: String(value.status || fallback.status || 'unknown').trim().toLowerCase(),
    detail: String(value.detail || value.description || value.text || fallback.detail || '').trim(),
    evidence: toTextList(value.evidence || fallback.evidence).slice(0, 4)
  };
}

function normalizeRiskLevel(value) {
  const level = String(value || '').trim().toLowerCase();
  return ['low', 'medium', 'high'].includes(level) ? level : '';
}

function inferVisualRiskLevel(findings, fallbackLevel = 'medium') {
  const statuses = Object.values(findings || {}).map((finding) => String(finding.status || '').toLowerCase());
  if (statuses.some((status) => status === 'visible')) return 'high';
  if (statuses.some((status) => status === 'possible' || status === 'multiple')) return 'medium';
  return normalizeRiskLevel(fallbackLevel) || 'medium';
}

function summarizeVisualPrecheck(report = {}) {
  const findings = report.findings || {};
  return {
    provider: report.provider || 'local-rules',
    riskLevel: report.riskLevel || 'medium',
    summary: report.summary || '',
    findings: Object.fromEntries(Object.entries(findings).map(([key, finding]) => [
      key,
      {
        status: String(finding?.status || 'unknown').toLowerCase(),
        detail: finding?.detail || ''
      }
    ]))
  };
}

function buildVisualPrecheckComparison(localReport = {}, aiReport = {}) {
  const labels = {
    watermark: '水印',
    subtitle: '字幕',
    subject: '主体',
    scene: '场景',
    shotChange: '镜头',
    brandLogo: '品牌',
    onScreenText: '画面文字'
  };
  const localFindings = localReport.findings || {};
  const aiFindings = aiReport.findings || {};
  return Object.keys(labels)
    .map((key) => {
      const localStatus = String(localFindings[key]?.status || 'unknown').toLowerCase();
      const aiStatus = String(aiFindings[key]?.status || 'unknown').toLowerCase();
      if (localStatus === aiStatus) return null;
      const aiLevel = visualFindingRiskLevel(aiStatus);
      return {
        key,
        label: labels[key],
        localStatus,
        aiStatus,
        level: aiLevel,
        note: visualComparisonNote(labels[key], localStatus, aiStatus)
      };
    })
    .filter(Boolean)
    .sort((a, b) => riskWeight(b.level) - riskWeight(a.level))
    .slice(0, 6);
}

function visualFindingRiskLevel(status) {
  if (status === 'visible' || status === 'unclear') return 'high';
  if (status === 'possible' || status === 'multiple' || status === 'unknown') return 'medium';
  return 'low';
}

function riskWeight(level) {
  return level === 'high' ? 3 : level === 'medium' ? 2 : level === 'low' ? 1 : 0;
}

function visualComparisonNote(label, localStatus, aiStatus) {
  if (localStatus === 'unknown' && aiStatus !== 'unknown') return `${label}由视觉模型补充判断。`;
  if (aiStatus === 'visible') return `${label}从本地预检升级为明确可见，需优先复核。`;
  if (aiStatus === 'none' || aiStatus === 'clear' || aiStatus === 'single') return `${label}风险较本地预检降低，但仍需保留证据。`;
  return `${label}判断与本地预检不一致，建议人工查看原图或视频帧。`;
}

const visualRiskLabels = {
  watermark: '水印/平台角标',
  subtitle: '字幕/贴纸',
  brandLogo: '品牌/店铺标识',
  onScreenText: '画面文字',
  subject: '商品主体',
  scene: '拍摄场景',
  shotChange: '镜头/剪辑'
};

function visualRiskLabel(key) {
  return visualRiskLabels[key] || key || '风险项';
}

function buildVisualAssetInventory(product = {}, report = {}) {
  const items = [];
  const addItem = (input, role, fallback = {}) => {
    const rawUrl = typeof input === 'string'
      ? input
      : input?.url || input?.mediaUrl || input?.imageUrl || input?.src || '';
    const originalUrl = String(rawUrl || '').trim();
    if (!originalUrl) return;
    const safeUrl = sanitizeVisualAssetUrl(originalUrl);
    const dedupeKey = safeUrl || `${role}:${originalUrl.slice(0, 48)}`;
    if (items.some((item) => item.dedupeKey === dedupeKey)) return;
    const typeValue = String(
      (typeof input === 'object' && (input.type || input.mediaType))
      || fallback.type
      || inferMediaType(originalUrl)
    ).toLowerCase();
    const mediaType = typeValue === 'video' ? 'video' : 'image';
    const label = String(
      (typeof input === 'object' && (input.label || input.title || input.alt))
      || fallback.label
      || visualAssetRoleLabel(role)
    );
    const isPrimary = Boolean(report.sourceUrl)
      && (originalUrl === report.sourceUrl || safeUrl === sanitizeVisualAssetUrl(report.sourceUrl));
    const access = isPrimary ? report.assetAccess || {} : {};
    const sourceKind = visualAssetSourceKind(originalUrl);
    items.push({
      dedupeKey,
      id: `asset-${items.length + 1}`,
      sequence: items.length + 1,
      role,
      roleLabel: visualAssetRoleLabel(role),
      label,
      type: mediaType,
      typeLabel: mediaType === 'video' ? '视频' : '图片',
      url: safeUrl,
      displayUrl: visualAssetDisplayUrl(originalUrl, safeUrl),
      sourceKind,
      sourceKindLabel: visualAssetSourceKindLabel(sourceKind),
      canModelRead: sourceKind === 'inline_data' || sourceKind === 'public_url',
      accessStatus: access.status || (sourceKind === 'inline_data' ? 'embedded' : 'unchecked'),
      accessible: typeof access.accessible === 'boolean'
        ? access.accessible
        : sourceKind === 'inline_data'
          ? true
          : sourceKind === 'private_or_local'
            ? false
            : null,
      recommendation: visualAssetRecommendation(mediaType, sourceKind)
    });
  };

  addItem(product.mediaUrl, product.mediaType === 'video' ? 'primary_video' : 'primary_media', {
    type: product.mediaType,
    label: product.mediaType === 'video' ? '视频素材' : '主素材'
  });
  addItem(product.imageUrl, 'main_image', { type: 'image', label: '商品主图' });
  [
    product.mediaItems,
    product.mediaList,
    product.images,
    product.imageUrls,
    product.gallery
  ].forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => addItem(item, 'gallery_asset'));
  });
  addItem(report.sourceUrl, 'analysis_source', {
    type: report.mediaType,
    label: '当前分析素材'
  });

  return items.slice(0, 10).map(({ dedupeKey, ...item }, index) => ({
    ...item,
    id: `asset-${index + 1}`,
    sequence: index + 1
  }));
}

function sanitizeVisualAssetUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^data:image\//i.test(raw)) return 'data:image/*;base64,...';
  if (/^data:video\//i.test(raw)) return 'data:video/*;base64,...';
  if (/^data:/i.test(raw)) return 'data:*;base64,...';
  return sanitizeEvidenceUrl(raw);
}

function visualAssetDisplayUrl(originalUrl, safeUrl) {
  if (/^data:image\//i.test(originalUrl)) return '内嵌图片数据';
  if (/^data:video\//i.test(originalUrl)) return '内嵌视频数据';
  if (/^data:/i.test(originalUrl)) return '内嵌素材数据';
  return safeUrl || String(originalUrl || '').split(/[?#]/)[0].slice(0, 240);
}

function visualAssetSourceKind(url) {
  const raw = String(url || '').trim();
  if (!raw) return 'unknown';
  if (/^data:/i.test(raw)) return 'inline_data';
  if (/^https?:\/\//i.test(raw)) return 'public_url';
  return 'private_or_local';
}

function visualAssetSourceKindLabel(kind) {
  const labels = {
    inline_data: '内嵌素材',
    public_url: '公网 URL',
    private_or_local: '本地/私有地址',
    unknown: '未知来源'
  };
  return labels[kind] || kind;
}

function visualAssetRoleLabel(role) {
  const labels = {
    primary_video: '主视频',
    primary_media: '主素材',
    main_image: '商品主图',
    gallery_asset: '素材组',
    analysis_source: '分析对象'
  };
  return labels[role] || '素材';
}

function visualAssetRecommendation(mediaType, sourceKind) {
  if (sourceKind === 'private_or_local') return '改用视觉模型可访问的授权素材地址，或登记本地导入记录。';
  if (mediaType === 'video') return '按抽帧计划留存关键帧截图，并核对音乐、字体、肖像和转场授权。';
  return '保留无水印源文件、设计源文件和授权素材库记录。';
}

function buildVisualVideoFramePlan(report = {}, product = {}, inventory = []) {
  const hasVideo = report.mediaType === 'video' || inventory.some((item) => item.type === 'video');
  if (!hasVideo) return [];
  const title = product.title || '当前商品';
  const frames = [
    ['00:00', '首帧/封面', '确认平台角标、水印、主体是否为当前商品。', ['watermark', 'brandLogo', 'subject']],
    ['00:03', '卖点出现', '核对字幕、贴纸和卖点文字是否有证据支撑。', ['subtitle', 'onScreenText']],
    ['00:06', '使用过程', '检查场景、人物肖像、产品演示和授权范围。', ['scene', 'subject', 'brandLogo']],
    ['00:09', '转场/节奏', '检查是否复用第三方剪辑模板、镜头节奏或未授权音乐。', ['shotChange']],
    ['末帧', 'CTA/落版', '核对最终引导、价格/销量背书和品牌露出。', ['onScreenText', 'brandLogo']]
  ];
  return frames.map(([timecode, label, purpose, riskKeys], index) => ({
    id: `frame-${index + 1}`,
    sequence: index + 1,
    timecode,
    label,
    purpose,
    riskFocus: riskKeys.map(visualRiskLabel),
    evidenceTarget: `${title} ${label}关键帧截图`,
    status: 'planned',
    note: '这是抽帧计划，不代表系统已自动下载或截取视频。'
  }));
}

function buildVisualEvidenceSnapshots(report = {}, product = {}, inventory = [], framePlan = []) {
  const primaryAsset = inventory.find((item) => item.role === 'primary_video' || item.role === 'primary_media' || item.role === 'main_image') || inventory[0];
  const snapshots = [];
  if (primaryAsset) {
    snapshots.push({
      id: 'snapshot-source',
      title: '原始素材来源留档',
      type: primaryAsset.type === 'video' ? 'source_video' : 'source_image',
      captureTarget: primaryAsset.label,
      sourceUrl: primaryAsset.url,
      reason: '证明素材来自授权来源或本地导入记录。',
      status: primaryAsset.accessible === false ? 'pending' : 'ready',
      note: '仅留存用户有权访问的页面或素材来源截图。'
    });
  }
  framePlan.slice(0, 5).forEach((frame) => {
    snapshots.push({
      id: `snapshot-${frame.id}`,
      title: `${frame.label}截图`,
      type: 'video_frame',
      captureTarget: frame.evidenceTarget,
      timecode: frame.timecode,
      reason: frame.purpose,
      status: 'planned',
      note: '发布前由审核人按计划抽帧或截图留存。'
    });
  });
  if (report.assetAccess?.accessible === false) {
    snapshots.push({
      id: 'snapshot-access-fallback',
      title: '替代素材导入记录',
      type: 'access_fallback',
      captureTarget: '本地素材导入或授权素材库记录',
      reason: '当前素材地址不可访问，需要证明替代素材来源。',
      status: 'pending',
      note: '不要保存登录态、Cookie、Token 或授权系统原始内容。'
    });
  }
  snapshots.push({
    id: 'snapshot-final',
    title: '最终发布版本截图',
    type: 'final_review',
    captureTarget: '最终导出/投放版本',
    reason: '用于发布前人工复核和后续留痕。',
    status: 'pending',
    note: '截图应与最终投放素材一致。'
  });
  return snapshots.slice(0, 8);
}

function buildVisualRiskEvidenceCards(report = {}, product = {}, matrix = [], evidenceSnapshots = []) {
  const snapshotLabels = evidenceSnapshots.map((item) => item.title).filter(Boolean);
  return matrix
    .map((item) => {
      const finding = report.findings?.[item.key] || {};
      const evidence = compact([
        ...(item.evidence || []),
        ...(finding.evidence || []),
        item.detail
      ]).slice(0, 4);
      return {
        key: item.key,
        label: item.label || visualRiskLabel(item.key),
        level: item.level,
        status: item.status,
        detail: item.detail,
        evidence,
        evidenceSnapshots: pickVisualSnapshotTargets(item.key, snapshotLabels),
        recordRequired: visualRiskRecordRequirement(item.key, product),
        reviewerAction: item.action
      };
    })
    .sort((a, b) => riskWeight(b.level) - riskWeight(a.level))
    .slice(0, 7);
}

function pickVisualSnapshotTargets(key, snapshotLabels = []) {
  if (!snapshotLabels.length) return [];
  if (key === 'shotChange') return snapshotLabels.filter((label) => /首帧|转场|末帧|截图/.test(label)).slice(0, 3);
  if (key === 'subtitle' || key === 'onScreenText') return snapshotLabels.filter((label) => /卖点|CTA|末帧|截图/.test(label)).slice(0, 3);
  if (key === 'scene' || key === 'subject') return snapshotLabels.filter((label) => /使用|首帧|来源|截图/.test(label)).slice(0, 3);
  return snapshotLabels.filter((label) => /来源|首帧|末帧|截图/.test(label)).slice(0, 3);
}

function visualRiskRecordRequirement(key, product = {}) {
  const requirements = {
    watermark: '保留无水印源文件或授权素材库记录。',
    subtitle: '保留字幕脚本、字体授权和画面文字审核记录。',
    brandLogo: `保留 ${product.shop || '品牌/店铺'} 授权范围或去标后的重拍记录。`,
    onScreenText: '保留价格、销量、功效、参数等画面文字的证明材料。',
    subject: '保留当前商品拍摄记录或商家授权素材说明。',
    scene: '保留自有拍摄场景、模特/肖像、道具和布景授权说明。',
    shotChange: '保留工程文件、音乐/字体授权和关键帧截图。'
  };
  return requirements[key] || '保留人工复核记录。';
}

function buildVisualManualReviewChecklist(report = {}, product = {}, matrix = [], inventory = [], framePlan = [], snapshots = []) {
  const riskItems = matrix.filter((item) => item.level !== 'low');
  return compact([
    {
      id: 'asset-source',
      priority: inventory.length ? 'medium' : 'high',
      title: '确认素材来源链路',
      detail: inventory.length
        ? `已识别 ${inventory.length} 个素材项，需核对是否来自授权商品、后台导出或自有制作。`
        : '未识别到可复核素材，发布前需要补充图片、视频或封面图地址。',
      evidenceTarget: '素材清单、授权凭证或素材版权台账'
    },
    report.assetAccess?.accessible === false && {
      id: 'asset-access',
      priority: 'high',
      title: '补齐可访问素材',
      detail: '当前素材地址不可访问，视觉模型和审核人都可能无法复核画面。',
      evidenceTarget: '可访问授权素材 URL 或本地导入记录'
    },
    framePlan.length && {
      id: 'video-frames',
      priority: 'high',
      title: '按计划留存关键帧',
      detail: `按 ${framePlan.length} 个抽帧点检查水印、字幕、品牌露出、画面文字和剪辑模板。`,
      evidenceTarget: '关键帧截图和视频工程文件'
    },
    {
      id: 'risk-cards',
      priority: riskItems.some((item) => item.level === 'high') ? 'high' : 'medium',
      title: '逐项复核风险证据卡',
      detail: riskItems.length
        ? `优先处理 ${riskItems.map((item) => item.label).slice(0, 4).join('、')}。`
        : '当前未发现高优先级视觉风险，仍需发布前抽查。',
      evidenceTarget: '风险证据卡、复核备注和处理结论'
    },
    {
      id: 'rights-ledger',
      priority: 'medium',
      title: '匹配素材版权台账',
      detail: '图片、视频、音乐、字体、肖像、Logo 和产品拍摄都要能关联到授权摘要。',
      evidenceTarget: '素材版权台账和审核留痕'
    },
    {
      id: 'final-version',
      priority: 'medium',
      title: '复核最终发布版本',
      detail: '确认最终素材与本次审核版本一致，并留存审核人、时间和最终截图。',
      evidenceTarget: snapshots.find((item) => item.id === 'snapshot-final')?.title || '最终发布版本截图'
    }
  ]).slice(0, 8);
}

function buildVisualModelCandidatesReport(options = {}, visualConfig = getAiClientConfig('visual'), activeModel = '') {
  const explicitModel = String(options.visualModel || options.model || '').trim();
  const configuredModel = String(visualConfig.model || '').trim();
  return resolveVisualModelCandidates(options, visualConfig)
    .map((model, index) => {
      const source = model === explicitModel
        ? 'request'
        : model === configuredModel
          ? 'configured'
          : 'fallback';
      return {
        model,
        rank: index + 1,
        source,
        sourceLabel: visualModelSourceLabel(source),
        active: Boolean(activeModel && model === activeModel),
        configured: Boolean(configuredModel && model === configuredModel),
        status: activeModel && model === activeModel ? 'used' : source === 'configured' ? 'configured' : 'candidate',
        useCase: visualModelUseCase(model),
        note: '实际可用性以当前账号权限、Base URL 和模型开通情况为准。'
      };
    })
    .slice(0, 6);
}

function visualModelSourceLabel(source) {
  const labels = {
    request: '本次指定',
    configured: '当前配置',
    fallback: '备选'
  };
  return labels[source] || source;
}

function visualModelUseCase(model) {
  const raw = String(model || '').toLowerCase();
  if (raw.includes('flash')) return '快速预检，适合批量图片或简单画面风险筛查。';
  if (raw.includes('max')) return '高精度复核，适合复杂画面、品牌露出和文字细节确认。';
  if (raw.includes('qwen3-vl')) return '新一代视觉候选，适合图片/视频素材的综合复核。';
  if (raw.includes('vl-plus')) return '默认视觉复核，适合水印、字幕、主体和场景判断。';
  return '视觉/多模态候选模型，需先测试账号权限。';
}

function enrichVisualRiskReport(report = {}, product = {}) {
  const findings = report.findings || {};
  const normalizedReport = {
    ...report,
    riskLevel: normalizeRiskLevel(report.riskLevel) || inferVisualRiskLevel(findings, 'medium')
  };
  const matrix = buildVisualRiskMatrix(normalizedReport, product);
  const highCount = matrix.filter((item) => item.level === 'high').length;
  const mediumCount = matrix.filter((item) => item.level === 'medium').length;
  const assetInventory = buildVisualAssetInventory(product, normalizedReport);
  const videoFramePlan = buildVisualVideoFramePlan(normalizedReport, product, assetInventory);
  const reportWithEvidenceContext = {
    ...normalizedReport,
    assetInventory,
    videoFramePlan
  };
  const evidenceSnapshots = buildVisualEvidenceSnapshots(reportWithEvidenceContext, product, assetInventory, videoFramePlan);
  const riskEvidenceCards = buildVisualRiskEvidenceCards(reportWithEvidenceContext, product, matrix, evidenceSnapshots);
  const manualReviewChecklist = buildVisualManualReviewChecklist(reportWithEvidenceContext, product, matrix, assetInventory, videoFramePlan, evidenceSnapshots);
  return {
    ...normalizedReport,
    schema: 'ad-workbench.visual-risk',
    localPrecheck: normalizedReport.localPrecheck || summarizeVisualPrecheck(normalizedReport),
    precheckComparison: normalizedReport.precheckComparison || [],
    assetInventory,
    videoFramePlan,
    evidenceSnapshots,
    riskEvidenceCards,
    manualReviewChecklist,
    modelCandidates: normalizedReport.modelCandidates || buildVisualModelCandidatesReport({ model: normalizedReport.model }, getAiClientConfig('visual'), normalizedReport.model),
    decision: highCount
      ? 'replace_or_reshoot'
      : mediumCount
        ? 'manual_review'
        : 'usable_with_records',
    decisionLabel: highCount
      ? '建议替换或重拍'
      : mediumCount
        ? '需要人工复核'
        : '可留证使用',
    riskMatrix: matrix,
    evidenceRequired: buildVisualEvidenceRequirements({
      ...normalizedReport,
      assetInventory,
      videoFramePlan,
      evidenceSnapshots
    }, product),
    reshootBrief: buildReshootBrief(normalizedReport, product),
    reviewFocus: matrix
      .filter((item) => item.level !== 'low')
      .map((item) => `${item.label}: ${item.action}`)
      .slice(0, 6)
  };
}

function buildVisualRiskMatrix(report = {}, product = {}) {
  const findingEntries = [
    ['watermark', visualRiskLabel('watermark'), report.findings?.watermark],
    ['subtitle', visualRiskLabel('subtitle'), report.findings?.subtitle],
    ['brandLogo', visualRiskLabel('brandLogo'), report.findings?.brandLogo],
    ['onScreenText', visualRiskLabel('onScreenText'), report.findings?.onScreenText],
    ['subject', visualRiskLabel('subject'), report.findings?.subject],
    ['scene', visualRiskLabel('scene'), report.findings?.scene],
    ['shotChange', visualRiskLabel('shotChange'), report.findings?.shotChange]
  ];
  return findingEntries.map(([key, label, finding]) => {
    const status = String(finding?.status || 'unknown').toLowerCase();
    const level = status === 'visible' || status === 'unclear'
      ? 'high'
      : status === 'possible' || status === 'multiple' || status === 'unknown'
        ? 'medium'
        : 'low';
    return {
      key,
      label,
      status,
      level,
      detail: finding?.detail || '',
      evidence: toTextList(finding?.evidence).slice(0, 3),
      action: visualRiskAction(key, level, product)
    };
  });
}

function visualRiskAction(key, level, product = {}) {
  if (level === 'low') return '保留源文件和授权记录，发布前抽查。';
  const actions = {
    watermark: '检查角标、下载痕迹和平台水印；命中时更换干净源文件或重拍。',
    subtitle: '核对字幕、贴纸和口播转写；避免复用第三方字幕样式或未授权文字。',
    brandLogo: '核对品牌、店铺和第三方 logo 授权范围；无授权时遮挡不等于合规，优先重拍。',
    onScreenText: '检查极限词、功效词、销量背书和导流话术，保留可证明依据。',
    subject: `确认主体确为 ${product.title || '当前商品'}，避免竞品同款素材混入。`,
    scene: '确认场景为自有拍摄或授权场景，避免照搬竞品布景和构图。',
    shotChange: '视频需检查镜头节奏、剪辑模板、音乐和转场是否来自授权工程。'
  };
  return actions[key] || '交由人工复核，补齐授权与证据。';
}

function buildVisualEvidenceRequirements(report = {}, product = {}) {
  return compact([
    '素材源文件或授权素材库记录',
    '商品授权或商家后台导出记录',
    report.assetInventory?.length && '素材清单、来源页面或本地导入记录',
    product.shop && `店铺/品牌授权范围：${product.shop}`,
    report.assetAccess?.accessible === false && '补充视觉模型可访问的授权素材 URL 或本地素材导入记录',
    report.assetAccess?.httpStatus && `素材可访问性检查：HTTP ${report.assetAccess.httpStatus}`,
    report.sourceUrl && `当前素材地址：${report.sourceUrl}`,
    report.mediaType === 'video' && '视频工程文件、音乐/字体授权和关键帧截图',
    report.videoFramePlan?.length && '按抽帧计划留存首帧、卖点、使用过程、转场和末帧截图',
    '最终发布版本截图和审核人记录'
  ]).slice(0, 8);
}

function buildReshootBrief(report = {}, product = {}) {
  const points = product.sellingPoints?.length ? product.sellingPoints : deriveSellingPoints(product);
  return {
    goal: `为 ${product.title || '当前商品'} 制作可授权留档的原创素材。`,
    mustShow: compact([product.title, ...points.slice(0, 3)]).slice(0, 4),
    avoid: [
      '第三方平台水印、角标和下载痕迹',
      '未授权品牌 logo、店铺标识、演员肖像和音乐',
      '无法证明的绝对化功效、销量和对比效果'
    ],
    checklist: [
      '画面不出现平台水印或下载痕迹',
      '商品主体、使用场景和卖点与授权商品一致',
      '文字承诺有后台数据、质检或授权文件支撑',
      '导出前保留源文件、截图、审核人和时间'
    ],
    deliverables: report.mediaType === 'video'
      ? ['原始视频/工程文件', '关键帧截图', '音乐/字体/素材授权摘要', '最终发布版本']
      : ['无水印原图', '设计源文件', '素材授权摘要', '最终发布版本'],
    shotIdeas: report.mediaType === 'video'
      ? ['开场痛点近景', '真实使用过程', '产品细节特写', '证据或参数展示', '清晰 CTA 收口']
      : ['干净主图', '真实使用场景', '三个卖点标签', '证据/参数角标', '明确 CTA 区域']
  };
}

function parseJsonObject(content) {
  if (typeof content === 'object' && content) return content;
  const raw = String(content || '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response was not valid JSON.');
    return JSON.parse(match[0]);
  }
}

function normalizeAiInsight(input) {
  const list = (value) => Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
    : splitPoints(value || '').slice(0, 5);
  return {
    audienceInsight: String(input.audienceInsight || '').trim(),
    purchaseDrivers: list(input.purchaseDrivers),
    creativeAngles: list(input.creativeAngles),
    differentiation: list(input.differentiation),
    contentWarnings: list(input.contentWarnings),
    recommendedHook: String(input.recommendedHook || '').trim(),
    evidenceNeeded: list(input.evidenceNeeded)
  };
}

function toTextList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (value === null || value === undefined) return [];
  return splitPoints(value).map((item) => String(item).trim()).filter(Boolean);
}

function generateAdConcept(product, mediaAnalysis, options = {}) {
  const format = options.format || (mediaAnalysis.mediaType === 'video' ? 'short_video' : 'poster');
  const tone = options.tone || 'direct';
  const duration = Number(options.duration || 20);
  const points = product.sellingPoints.length ? product.sellingPoints : deriveSellingPoints(product);
  const cta = product.price > 0
    ? `现在领券，${formatPrice(product.price)}入手`
    : '现在查看同款方案';

  if (format === 'poster') {
    return {
      format,
      title: `${product.title} | 原创推广图方案`,
      headline: buildHeadline(product, points, tone),
      subheadline: `${points.slice(0, 3).join(' / ')}，适合${product.audience}`,
      layout: [
        '顶部：真实使用场景大图，保留足够留白承载主标题。',
        '中部：三个卖点用图标标签呈现，避免堆砌大段文字。',
        '底部：价格锚点、销量背书和购买按钮形成闭环。'
      ],
      copyBlocks: [
        `别再忍受${extractPain(product)}，换一个更省心的办法。`,
        `${points[0] || product.title}，把“想买”变成“现在就用得上”。`,
        `${formatSales(product.sales)}人已经下单，今天把选择成本降下来。`
      ],
      prompt: buildImagePrompt(product, points),
      cta,
      complianceChecklist: buildComplianceChecklist(product)
    };
  }

  return {
    format,
    title: `${product.title} | ${duration}秒原创短视频脚本`,
    headline: buildHeadline(product, points, tone),
    storyboard: buildStoryboard(product, points, duration),
    voiceover: buildVoiceover(product, points, cta),
    captions: buildCaptions(product, points),
    productionNotes: [
      '用自有产品或授权样品重新拍摄，不复用竞品画面。',
      '前三秒必须出现痛点或强结果，字幕保持短句。',
      '结尾用明确权益或场景召回，不承诺无法证明的功效。'
    ],
    cta,
    complianceChecklist: buildComplianceChecklist(product)
  };
}

function attachAdQuality(product, mediaAnalysis, ad = {}) {
  return {
    ...ad,
    quality: buildAdQualityReport(product, mediaAnalysis, ad)
  };
}

function buildAdQualityReport(product, mediaAnalysis = {}, ad = {}) {
  const checks = [];
  const add = (status, title, detail, suggestion = '', weight = 8) => {
    checks.push({ status, title, detail, suggestion, weight });
  };
  const creativeText = collectCreativeText(product, mediaAnalysis, ad);
  const sellingPoints = product.sellingPoints?.length ? product.sellingPoints : deriveSellingPoints(product);
  const adSections = countAdSections(ad);
  const titleHits = sellingPoints.filter((point) => creativeText.includes(point)).length;
  const hasCta = Boolean(String(ad.cta || '').trim()) || /点击|查看|下单|入手|领取|购买/.test(creativeText);
  const hasEvidenceCue = /截图|记录|授权|证据|后台|API|销量|数据|检测|报告/.test(creativeText);
  const hasOriginalCue = /原创|自有|授权|重拍|真实场景|不复用|不复制|不搬运/.test(creativeText);
  const textLength = creativeText.replace(/\s+/g, '').length;
  const repeatedTerms = findRepeatedCreativeTerms(creativeText);

  add(
    titleHits >= Math.min(2, sellingPoints.length) ? 'pass' : 'warn',
    '卖点覆盖',
    `已覆盖 ${titleHits}/${sellingPoints.length || 0} 个核心卖点。`,
    '至少把 2 个核心卖点落到标题、口播、字幕或版式中。',
    14
  );
  add(
    adSections >= (ad.format === 'poster' ? 4 : 5) ? 'pass' : 'warn',
    '结构完整度',
    `当前方案包含 ${adSections} 个可交付模块。`,
    '补齐开场、场景、卖点、证据、CTA 和合规核对模块。',
    12
  );
  add(
    hasCta ? 'pass' : 'warn',
    '行动号召',
    hasCta ? '已包含明确行动号召。' : '未检测到明确行动号召。',
    '补充查看详情、领取权益、进入店铺或咨询客服等合规 CTA。',
    10
  );
  add(
    hasOriginalCue ? 'pass' : 'warn',
    '原创生产提示',
    hasOriginalCue ? '已提示使用自有或授权素材重拍。' : '缺少原创生产或授权素材提示。',
    '明确要求自有拍摄、授权素材、干净源文件和不复刻第三方画面。',
    14
  );
  add(
    hasEvidenceCue ? 'pass' : 'warn',
    '证据链提示',
    hasEvidenceCue ? '已包含数据或授权证据链提示。' : '缺少销量、授权或效果证据留存提示。',
    '把销量、效果、授权和后台导出记录列入发布前证据清单。',
    12
  );
  add(
    textLength >= 80 ? 'pass' : 'warn',
    '表达充分度',
    `当前方案文本约 ${textLength} 字。`,
    '增加场景、利益点、镜头动作或海报版式说明，避免输出过薄。',
    8
  );
  add(
    repeatedTerms.length <= 2 ? 'pass' : 'warn',
    '重复表达',
    repeatedTerms.length ? `重复词较多：${repeatedTerms.slice(0, 4).join('、')}` : '未发现明显重复堆砌。',
    '减少重复高频词，换成场景、动作、证据或用户语言。',
    7
  );

  const visualRiskLevel = normalizeRiskLevel(mediaAnalysis.visualRisk?.riskLevel);
  if (visualRiskLevel === 'high') {
    add('fail', '素材风险联动', '视觉风险为高，当前创意不建议直接进入发布制作。', '先替换或重拍风险素材，再重新生成方案。', 22);
  } else if (visualRiskLevel === 'medium') {
    add('warn', '素材风险联动', '视觉风险为中，需要人工复核后再制作。', '核对水印、品牌露出、字幕和授权凭证。', 14);
  } else {
    add('pass', '素材风险联动', '未发现高等级视觉风险。', '', 8);
  }

  const penalty = checks.reduce((sum, check) => {
    if (check.status === 'pass') return sum;
    return sum + (check.status === 'fail' ? Math.round(check.weight * 1.5) : check.weight);
  }, 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const blockingIssues = checks.filter((check) => check.status === 'fail').length;
  const warningIssues = checks.filter((check) => check.status === 'warn').length;
  const level = blockingIssues || score < 65 ? 'high' : score < 85 ? 'medium' : 'low';
  const dimensions = buildAdQualityDimensions({
    titleHits,
    sellingPointCount: sellingPoints.length,
    adSections,
    format: ad.format,
    hasCta,
    hasEvidenceCue,
    hasOriginalCue,
    textLength,
    repeatedTerms,
    visualRiskLevel
  });
  return {
    schema: 'ad-workbench.creative-quality',
    score,
    grade: gradeAdQuality(score, blockingIssues),
    level,
    status: blockingIssues ? 'needs_rework' : warningIssues ? 'needs_review' : 'ready',
    statusLabel: blockingIssues ? '需要重做' : warningIssues ? '需要复核' : '可进入复核',
    summary: summarizeAdQuality(score, blockingIssues, warningIssues),
    dimensions,
    checks,
    improvementTips: checks
      .filter((check) => check.status !== 'pass' && check.suggestion)
      .map((check) => check.suggestion)
      .slice(0, 6),
    rewriteBrief: buildAdRewriteBrief(product, mediaAnalysis, ad, checks, sellingPoints),
    publishReadiness: {
      creativeReady: score >= 80 && !blockingIssues,
      needsHumanReview: warningIssues > 0 || blockingIssues > 0,
      blockingIssues,
      warningIssues,
      gate: blockingIssues || score < 70
        ? 'blocked'
        : warningIssues || score < 85
          ? 'review'
          : 'ready'
    }
  };
}

function gradeAdQuality(score, blockingIssues = 0) {
  if (blockingIssues || score < 65) return 'D';
  if (score < 75) return 'C';
  if (score < 88) return 'B';
  if (score < 96) return 'A';
  return 'S';
}

function buildAdQualityDimensions(input = {}) {
  const targetSections = input.format === 'poster' ? 4 : 5;
  const pointTarget = Math.max(1, Math.min(2, input.sellingPointCount || 0));
  const dimensions = [
    {
      key: 'sellingPoints',
      label: '卖点覆盖',
      score: Math.min(100, Math.round((input.titleHits / pointTarget) * 100)),
      note: `覆盖 ${input.titleHits}/${input.sellingPointCount || 0} 个核心卖点`
    },
    {
      key: 'structure',
      label: '结构完整',
      score: Math.min(100, Math.round((input.adSections / targetSections) * 100)),
      note: `交付模块 ${input.adSections}/${targetSections}`
    },
    {
      key: 'originality',
      label: '原创生产',
      score: input.hasOriginalCue ? 92 : 58,
      note: input.hasOriginalCue ? '已提示自有/授权素材' : '缺少原创生产提示'
    },
    {
      key: 'evidence',
      label: '证据链',
      score: input.hasEvidenceCue ? 90 : 55,
      note: input.hasEvidenceCue ? '已出现证据或授权提示' : '缺少证据留存提示'
    },
    {
      key: 'compliance',
      label: '合规闸门',
      score: input.visualRiskLevel === 'high' ? 35 : input.visualRiskLevel === 'medium' ? 72 : 90,
      note: input.visualRiskLevel === 'high'
        ? '视觉风险高'
        : input.visualRiskLevel === 'medium'
          ? '需人工复核素材风险'
          : '未联动到高风险素材'
    },
    {
      key: 'readability',
      label: '表达可读',
      score: Math.max(45, Math.min(100, (input.textLength >= 80 ? 92 : 68) - Math.min(30, (input.repeatedTerms?.length || 0) * 8))),
      note: input.repeatedTerms?.length ? `重复词：${input.repeatedTerms.slice(0, 3).join('、')}` : `文本约 ${input.textLength || 0} 字`
    }
  ];
  return dimensions.map((item) => ({
    ...item,
    score: clamp(Math.round(item.score), 0, 100),
    status: item.score >= 85 ? 'pass' : item.score >= 70 ? 'warn' : 'fail'
  }));
}

function buildAdRewriteBrief(product, mediaAnalysis = {}, ad = {}, checks = [], sellingPoints = []) {
  const failedChecks = checks.filter((check) => check.status === 'fail');
  const warningChecks = checks.filter((check) => check.status === 'warn');
  const priorityChecks = [...failedChecks, ...warningChecks].slice(0, 4);
  return {
    goal: `把 ${product.title || '当前商品'} 的方案改成可复核、可留证、可制作的原创广告。`,
    priorityActions: priorityChecks.map((check) => check.suggestion || check.detail).filter(Boolean),
    mustKeep: compact([
      ad.headline && `保留核心标题方向：${ad.headline}`,
      ...sellingPoints.slice(0, 3).map((point) => `核心卖点：${point}`),
      mediaAnalysis.visualStyle && `视觉风格：${mediaAnalysis.visualStyle}`
    ]).slice(0, 5),
    mustAdd: compact([
      !checks.some((check) => check.title === '证据链提示' && check.status === 'pass') && '补充销量、效果、授权或后台导出证据留存点',
      !checks.some((check) => check.title === '原创生产提示' && check.status === 'pass') && '补充自有拍摄/授权素材/不复用第三方画面的制作要求',
      !checks.some((check) => check.title === '行动号召' && check.status === 'pass') && '补充清晰但不过度承诺的 CTA',
      mediaAnalysis.visualRisk?.riskLevel === 'high' && '先替换或重拍高风险素材，再继续改写'
    ]),
    prompt: compact([
      '请基于当前商品数据重写广告方案。',
      '保留真实卖点，不复制第三方素材表达。',
      '补齐开场、场景、卖点、证据、CTA 和合规核对。',
      '输出必须方便人工复核和留证。'
    ]).join(' ')
  };
}

function countAdSections(ad = {}) {
  return [
    ad.headline,
    ad.subheadline,
    ad.prompt,
    ad.cta,
    ...(ad.copyBlocks || []),
    ...(ad.layout || []),
    ...(ad.storyboard || []),
    ...(ad.voiceover || []),
    ...(ad.captions || []),
    ...(ad.productionNotes || []),
    ...(ad.complianceChecklist || [])
  ].filter(Boolean).length;
}

function findRepeatedCreativeTerms(text) {
  const normalized = String(text || '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, ' ');
  const tokens = normalized
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !/^\d+$/.test(item));
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count >= 4)
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token);
}

function summarizeAdQuality(score, blockingIssues, warningIssues) {
  if (blockingIssues) return `创意质量 ${score} 分，存在 ${blockingIssues} 个阻断项，需要先重做。`;
  if (warningIssues) return `创意质量 ${score} 分，还有 ${warningIssues} 个发布前复核项。`;
  return `创意质量 ${score} 分，结构完整，可进入人工复核。`;
}

function auditCompliance(product, mediaAnalysis, ad, options = {}) {
  const source = String(options.source || product.platform || '').toLowerCase();
  const creativeText = collectCreativeText(product, mediaAnalysis, ad);
  const complianceHits = findRiskTerms(creativeText, product);
  const sensitiveHits = complianceHits.filter((item) => item.kind === 'sensitiveTerms');
  const brandHits = complianceHits.filter((item) => item.kind === 'brandRules');
  const credentialMatches = Array.isArray(options.credentials)
    ? options.credentials.map((item) => normalizeAuthorizationCredential(item)).filter(Boolean)
    : [];
  const materialRightMatches = Array.isArray(options.materialRights)
    ? options.materialRights.map((item) => normalizeMaterialRightRecord(item)).filter(Boolean)
    : [];
  const flaggedTerms = [];
  const checks = [];

  const addCheck = (check) => {
    checks.push({
      status: check.status,
      severity: check.severity || 'low',
      title: check.title,
      detail: check.detail,
      suggestion: check.suggestion || '',
      evidence: check.evidence || []
    });
  };

  if (product.sourceNotice) {
    addCheck({
      status: 'warn',
      severity: 'medium',
      title: '数据源仍是占位或样例',
      detail: product.sourceNotice,
      suggestion: '上线前请切换到开放平台、商家后台导出、达人授权或内部投放数据。'
    });
  } else if ((source === 'csv' || source === 'authorized_text' || source === 'edge_extension') && !credentialMatches.length) {
    addCheck({
      status: 'warn',
      severity: 'medium',
      title: source === 'csv'
        ? 'CSV 数据需要授权凭证'
        : source === 'edge_extension'
          ? '浏览器插件数据需要授权凭证'
          : '文本/HTML 导入需要授权凭证',
      detail: source === 'csv'
        ? 'CSV 可用于商家后台导出或内部数据，但系统无法自动确认来源。'
        : source === 'edge_extension'
          ? 'Edge 插件读取的是当前浏览器里已经渲染的页面内容，但系统无法自动确认页面授权范围。'
          : '文本/HTML 解析适合处理授权页面复制内容，但系统无法自动确认复制来源。',
      suggestion: '导出方案时同步保存后台截图、复制或导出时间和账号授权记录。'
    });
  } else if (source === 'sample') {
    addCheck({
      status: 'warn',
      severity: 'medium',
      title: '样例数据仅适合验证流程',
      detail: '当前方案可以用于产品原型演示，不能直接作为真实投放依据。',
      suggestion: '发布前用授权商品数据重新生成，并保留原始数据来源。'
    });
  } else {
    addCheck({
      status: 'pass',
      severity: 'low',
      title: '数据来源已标记',
      detail: `当前商品标记为${platformNames[product.platform] || product.platform}来源。`,
      suggestion: '继续保留 API 返回记录或商家授权文件。'
    });
  }

  if (credentialMatches.length) {
    addCheck({
      status: 'pass',
      severity: 'low',
      title: '已关联授权凭证',
      detail: `找到 ${credentialMatches.length} 条本机授权凭证：${credentialMatches.slice(0, 3).map((item) => item.title).join('、')}。`,
      suggestion: '导出或发布前继续核对凭证范围、统计时间和素材授权边界。',
      evidence: credentialMatches.slice(0, 3).map((item) => compact([
        item.title,
        credentialSourceTypeLabel(item.sourceType),
        item.reference
      ]).join(' / '))
    });
  } else if (source === 'csv' || source === 'authorized_text' || source === 'edge_extension' || source === 'authorized_history') {
    addCheck({
      status: 'warn',
      severity: 'medium',
      title: '未关联授权凭证台账',
      detail: '当前来源需要人工留存授权或后台导出记录，但本机台账中尚未匹配到凭证。',
      suggestion: '在投放建议中登记页面截图、后台导出、开放平台返回记录或授权文件摘要。'
    });
  }

  const mediaUrl = product.mediaUrl || product.imageUrl || mediaAnalysis.sourceUrl;
  const visualRiskLevel = String(mediaAnalysis.visualRisk?.riskLevel || '').toLowerCase();
  const visualDecision = String(mediaAnalysis.visualRisk?.decision || '').toLowerCase();
  const materialNeedsLedger = Boolean(mediaUrl)
    && (/unsplash\.com|googleapis\.com|alicdn\.com|douyin|taobao/i.test(mediaUrl)
      || visualRiskLevel === 'high'
      || visualRiskLevel === 'medium'
      || visualDecision === 'replace');
  if (materialRightMatches.length) {
    const materialWarnings = materialRightMatches.flatMap((item) => item.scopeWarnings || []);
    const hasBlockingMaterialWarning = materialRightMatches.some((item) =>
      item.expiryStatus?.status === 'expired' || item.brandScope?.status === 'forbidden'
    );
    addCheck({
      status: hasBlockingMaterialWarning ? 'fail' : materialWarnings.length ? 'warn' : 'pass',
      severity: hasBlockingMaterialWarning ? 'high' : materialWarnings.length ? 'medium' : 'low',
      title: '已关联素材版权台账',
      detail: materialWarnings.length
        ? `找到 ${materialRightMatches.length} 条素材版权记录，但存在范围/到期提醒：${materialWarnings.slice(0, 3).join('；')}`
        : `找到 ${materialRightMatches.length} 条素材版权记录：${materialRightMatches.slice(0, 3).map((item) => item.title).join('、')}。`,
      suggestion: materialWarnings.length
        ? '发布前先处理到期、品牌授权状态或范围不匹配问题，再作为证据留存。'
        : '发布前继续核对素材类型、授权范围、到期时间和投放平台是否覆盖当前计划。',
      evidence: materialRightMatches.slice(0, 3).map((item) => compact([
        item.title,
        materialAssetTypeLabel(item.assetType),
        materialSourceTypeLabel(item.sourceType),
        materialScopeLabel(item.licenseScope),
        item.scopeSummary,
        item.expiryStatus?.label,
        item.attachmentRefs?.length ? `附件引用 ${item.attachmentRefs.length} 条` : '',
        item.reference
      ]).join(' / '))
    });
    if (materialWarnings.length) {
      addCheck({
        status: hasBlockingMaterialWarning ? 'fail' : 'warn',
        severity: hasBlockingMaterialWarning ? 'high' : 'medium',
        title: '素材授权范围需要复核',
        detail: materialWarnings.slice(0, 5).join('；'),
        suggestion: '补充新的授权记录、延长期限、确认品牌授权范围或更换可明确授权的素材。',
        evidence: materialRightMatches.flatMap((item) => item.scopeWarnings || []).slice(0, 5)
      });
    }
  } else if (materialNeedsLedger) {
    addCheck({
      status: 'warn',
      severity: visualRiskLevel === 'high' ? 'high' : 'medium',
      title: '未关联素材版权台账',
      detail: '当前素材包含外部来源或视觉风险提示，但本机台账中尚未匹配到图片、视频、音乐、字体、肖像或拍摄授权摘要。',
      suggestion: '在投放建议中登记素材版权记录；仅保存素材名称、来源、授权范围和引用，不保存原始素材文件。'
    });
  }

  if (!mediaUrl) {
    addCheck({
      status: 'fail',
      severity: 'medium',
      title: '缺少素材来源',
      detail: '当前商品没有图片或视频地址，无法核对素材授权。',
      suggestion: '补充自有拍摄素材、品牌素材库地址或可验证的授权素材链接。'
    });
  } else if (/unsplash\.com|googleapis\.com|alicdn\.com|douyin|taobao/i.test(mediaUrl)) {
    addCheck({
      status: 'warn',
      severity: 'medium',
      title: '外部素材需留存授权证明',
      detail: '检测到图片或视频来自外部域名，投放前需要确认版权、肖像、音乐和平台水印风险。',
      suggestion: '优先用自有或已授权素材重新拍摄；若使用开放图库，保存许可页面和下载记录。'
    });
  } else {
    addCheck({
      status: 'pass',
      severity: 'low',
      title: '素材来源可追踪',
      detail: '当前商品包含可追踪的素材地址。',
      suggestion: '发布前仍需确认图片、视频、音乐、字体和人物肖像授权。'
    });
  }

  if (mediaAnalysis.visualRisk) {
    const visualRisk = mediaAnalysis.visualRisk;
    const visualEvidence = compact([
      visualRisk.summary,
      ...(visualRisk.evidence || []),
      visualRisk.findings?.watermark?.detail,
      visualRisk.findings?.brandLogo?.detail,
      visualRisk.findings?.onScreenText?.detail
    ]).slice(0, 5);
    if (visualRisk.status === 'error') {
      addCheck({
        status: 'warn',
        severity: 'medium',
        title: '视觉模型分析未完成',
        detail: visualRisk.message || '视觉风险分析暂未成功。',
        suggestion: visualRisk.hint || '请确认模型支持图片/视频输入，并检查素材 URL 是否可访问。',
        evidence: visualEvidence
      });
    } else if (visualRisk.riskLevel === 'high') {
      addCheck({
        status: 'warn',
        severity: 'high',
        title: '视觉素材风险偏高',
        detail: visualRisk.summary || '视觉模型判断素材存在较明显的水印、字幕、品牌露出或画面文字风险。',
        suggestion: '优先更换为自有拍摄或已授权的干净素材，去除平台水印、第三方 logo 和可疑画面文字。',
        evidence: visualEvidence
      });
    } else if (visualRisk.riskLevel === 'medium') {
      addCheck({
        status: 'warn',
        severity: 'medium',
        title: '视觉素材需要人工复核',
        detail: visualRisk.summary || '视觉预检提示仍需确认水印、字幕、品牌露出和画面文字。',
        suggestion: '发布前由审核人核对原始素材、授权凭证和视觉模型证据。',
        evidence: visualEvidence
      });
    } else {
      addCheck({
        status: 'pass',
        severity: 'low',
        title: '视觉素材风险较低',
        detail: visualRisk.summary || '视觉分析未发现明显水印、字幕或品牌风险。',
        evidence: visualEvidence
      });
    }

    const watermarkStatus = String(visualRisk.findings?.watermark?.status || '').toLowerCase();
    const logoStatus = String(visualRisk.findings?.brandLogo?.status || '').toLowerCase();
    if (watermarkStatus === 'visible' || logoStatus === 'visible') {
      addCheck({
        status: 'warn',
        severity: 'high',
        title: '画面出现明显水印或品牌标识',
        detail: compact([visualRisk.findings?.watermark?.detail, visualRisk.findings?.brandLogo?.detail]).join('；') || '视觉分析发现水印或第三方标识。',
        suggestion: '不要直接使用带水印或第三方标识的素材；请重拍、替换授权源文件或取得明确授权。'
      });
    }
  }

  if (!ad) {
    addCheck({
      status: 'warn',
      severity: 'low',
      title: '尚未生成广告方案',
      detail: '当前只能审核商品和素材结构，无法检查最终文案。',
      suggestion: '生成广告方案后再次运行审核。'
    });
  } else {
    addCheck({
      status: 'pass',
      severity: 'low',
      title: '广告方案已纳入审核',
      detail: `已检查${ad.format === 'poster' ? '海报图方案' : '短视频脚本'}中的标题、口播、字幕和行动号召。`
    });
  }

  addRuleAuditCheck(addCheck, sensitiveHits, {
    kind: 'sensitiveTerms',
    hitTitle: '检测到高风险营销表达',
    emptyTitle: '未命中常见极限词',
    emptyDetail: '当前文案未命中常见高风险营销表达。',
    highSuggestion: '改成可证明、可量化、不过度承诺的表达。',
    warningSuggestion: '把命中词改成更稳妥的说法，并补充证据或范围限定。'
  });

  addRuleAuditCheck(addCheck, brandHits, {
    kind: 'brandRules',
    hitTitle: '检测到品牌规则命中',
    emptyTitle: '未命中品牌规则',
    emptyDetail: '当前文案和视觉说明未命中已保存的品牌规则。',
    highSuggestion: '确认品牌授权后再使用相关表述或画面元素。',
    warningSuggestion: '替换为授权品牌、合作款或自有素材表述。'
  });

  if (flaggedTerms.length) {
    const highTerms = flaggedTerms.filter((item) => item.severity === 'high');
    addCheck({
      status: highTerms.length ? 'fail' : 'warn',
      severity: highTerms.length ? 'high' : 'medium',
      title: '检测到高风险营销表达',
      detail: `命中词：${flaggedTerms.map((item) => item.term).join('、')}。`,
      suggestion: '改成可证明、可量化、不过度承诺的表达，例如“更适合日常使用”“多人选择”“帮助改善体验”。'
    });
  } else {
    addCheck({
      status: 'pass',
      severity: 'low',
      title: '未命中常见极限词',
      detail: '未发现“最强”“第一”“治愈”等常见高风险表达。'
    });
  }

  if (/健康|护理|个护|按摩|母婴/i.test(product.category) || /热敷|按摩|酸痛|放松|护发|儿童|母婴/.test(creativeText)) {
    addCheck({
      status: 'warn',
      severity: 'medium',
      title: '功效与特殊人群表述需复核',
      detail: '商品或文案涉及健康护理、个护、母婴或身体感受类表达。',
      suggestion: '避免医疗功效承诺；儿童、母婴、护发、按摩类卖点需以说明书、检测报告或平台资质为依据。'
    });
  } else {
    addCheck({
      status: 'pass',
      severity: 'low',
      title: '未发现特殊功效场景',
      detail: '当前文案未明显涉及医疗、母婴或强功效承诺。'
    });
  }

  if (/销量|人已|人买|人选择|下单|热卖|爆品/.test(creativeText)) {
    addCheck({
      status: product.sales > 0 ? 'warn' : 'fail',
      severity: product.sales > 0 ? 'low' : 'medium',
      title: '销量背书需要证据链',
      detail: product.sales > 0
        ? `当前销量字段为 ${product.sales}，可作为草稿依据。`
        : '文案使用了销量或热卖背书，但商品缺少销量字段。',
      suggestion: '保留平台后台截图、API 返回记录和统计时间，投放页展示口径需一致。'
    });
  } else {
    addCheck({
      status: 'pass',
      severity: 'low',
      title: '未使用销量背书',
      detail: '当前文案没有明显使用销量、热卖或下单人数作为转化依据。'
    });
  }

  if (/前后对比|效果|一眼看见|省时|降温|速干|防晒|UPF/i.test(creativeText)) {
    addCheck({
      status: 'warn',
      severity: 'low',
      title: '效果展示需要可证实',
      detail: '文案包含效果展示、对比或功能结果表达。',
      suggestion: '拍摄时使用真实场景，不夸大前后差异；涉及防晒、速干、降温等指标需准备检测或说明依据。'
    });
  } else {
    addCheck({
      status: 'pass',
      severity: 'low',
      title: '效果表达较克制',
      detail: '未检测到明显的强结果或前后对比表达。'
    });
  }

  const score = calculateComplianceScore(checks);
  const level = score >= 85 ? 'low' : score >= 65 ? 'medium' : 'high';
  const blockingIssues = checks.filter((check) => check.status === 'fail').length;

  return {
    score,
    level,
    summary: summarizeAudit(level, blockingIssues, checks),
    flaggedTerms: complianceHits,
    checks,
    evidenceChecklist: [
      '商品数据来源记录：开放平台返回、商家后台导出或授权文件。',
      '素材授权记录：图片、视频、音乐、字体、人物肖像和样品拍摄记录。',
      '效果与销量证据：检测报告、后台截图、统计周期和投放页展示口径。',
      '最终发布留档：脚本、分镜、海报提示词、审核人和发布时间。'
    ],
    credentialMatches: credentialMatches.map((item) => ({
      id: item.id,
      title: item.title,
      sourceType: item.sourceType,
      platform: item.platform,
      category: item.category,
      reference: item.reference,
      capturedAt: item.capturedAt,
      reviewer: item.reviewer
    })),
    materialRightMatches: materialRightMatches.map((item) => ({
      id: item.id,
      title: item.title,
      assetType: item.assetType,
      sourceType: item.sourceType,
      licenseScope: item.licenseScope,
      scopeSummary: item.scopeSummary,
      brandScope: item.brandScope,
      channelScope: item.channelScope,
      regionScope: item.regionScope,
      campaignScope: item.campaignScope,
      platform: item.platform,
      category: item.category,
      reference: item.reference,
      attachmentRefs: item.attachmentRefs,
      startsAt: item.startsAt,
      expiresAt: item.expiresAt,
      expiryStatus: item.expiryStatus,
      scopeWarnings: item.scopeWarnings || [],
      capturedAt: item.capturedAt,
      reviewer: item.reviewer
    })),
    rewriteTips: buildRewriteTips(complianceHits)
  };
}

function credentialSourceTypeLabel(value) {
  const labels = {
    official_api: '官方开放平台',
    merchant_export: '商家后台导出',
    page_screenshot: '页面截图',
    creator_authorization: '达人/商家授权',
    internal_data: '内部投放数据',
    authorization_file: '授权文件',
    other: '其他凭证'
  };
  return labels[value] || value || '凭证';
}

function materialAssetTypeLabel(value) {
  const labels = {
    image: '图片',
    video: '视频',
    music: '音乐',
    font: '字体',
    portrait: '肖像',
    logo: 'Logo',
    product_shoot: '产品拍摄',
    other: '其他素材'
  };
  return labels[value] || value || '素材';
}

function materialSourceTypeLabel(value) {
  const labels = {
    self_produced: '自有制作',
    brand_library: '品牌素材库',
    merchant_authorized: '商家授权',
    stock_license: '图库/素材库许可',
    creator_authorized: '达人/创作者授权',
    platform_material: '平台素材',
    agency_produced: '代理商制作',
    other: '其他来源'
  };
  return labels[value] || value || '来源';
}

function materialScopeLabel(value) {
  const labels = {
    all_ads: '全广告投放',
    ecommerce_ads: '电商广告',
    social_ads: '社媒广告',
    single_campaign: '单次活动',
    internal_review: '内部复核',
    other: '其他范围'
  };
  return labels[value] || value || '授权范围';
}

function collectCreativeText(product, mediaAnalysis, ad) {
  const parts = [
    product.title,
    product.category,
    product.shop,
    product.audience,
    ...product.sellingPoints,
    mediaAnalysis.hook,
    mediaAnalysis.creativePattern,
    mediaAnalysis.visualStyle,
    ...(mediaAnalysis.persuasionAngles || [])
  ];

  if (mediaAnalysis.visualRisk) {
    parts.push(
      mediaAnalysis.visualRisk.summary,
      ...(mediaAnalysis.visualRisk.evidence || []),
      ...(mediaAnalysis.visualRisk.recommendations || []),
      ...(mediaAnalysis.visualRisk.contentWarnings || [])
    );
    Object.values(mediaAnalysis.visualRisk.findings || {}).forEach((finding) => {
      parts.push(finding.detail, ...(finding.evidence || []));
    });
  }

  if (ad) {
    parts.push(
      ad.title,
      ad.headline,
      ad.subheadline,
      ad.prompt,
      ad.cta,
      ...(ad.copyBlocks || []),
      ...(ad.voiceover || []),
      ...(ad.captions || []),
      ...(ad.layout || []),
      ...(ad.productionNotes || [])
    );
    (ad.storyboard || []).forEach((scene) => {
      parts.push(scene.time, scene.shot, scene.action, scene.text);
    });
  }

  return parts.filter(Boolean).join('\n');
}

function findRiskTerms(text, product = {}) {
  const normalizedText = normalizeComparable(text);
  if (!normalizedText) return [];
  const merged = mergeComplianceRules();
  const matches = [];
  for (const rule of [...merged.sensitiveTerms, ...merged.brandRules]) {
    if (!ruleAppliesToProduct(rule, product)) continue;
    const term = String(rule.term || '').trim();
    const needle = normalizeComparable(term);
    if (!needle) continue;
    if (!normalizedText.includes(needle)) continue;
    matches.push({
      term,
      severity: rule.severity || 'medium',
      replacement: String(rule.replacement || '').trim(),
      note: String(rule.note || '').trim(),
      kind: rule.kind || 'sensitiveTerms',
      source: rule.source || 'custom',
      ruleId: String(rule.id || ''),
      brandAuthorizationStatus: rule.kind === 'brandRules' ? normalizeBrandRuleAuthorizationStatus(rule.brandAuthorizationStatus) : '',
      brandScope: rule.kind === 'brandRules' ? sanitizeComplianceBrandScope(rule.brandScope || {}) : emptyComplianceBrandScope(),
      brandScopeSummary: rule.kind === 'brandRules' ? complianceBrandScopeSummary(rule.brandScope || {}) : '',
      brandScopeWarnings: rule.kind === 'brandRules' ? complianceBrandScopeWarnings(rule, product) : [],
      platforms: rule.platforms || [],
      categories: rule.categories || []
    });
  }
  return matches.sort((a, b) => {
    const weight = { high: 3, medium: 2, low: 1 };
    const scoreDiff = (weight[b.severity] || 0) - (weight[a.severity] || 0);
    if (scoreDiff) return scoreDiff;
    return b.term.length - a.term.length;
  });
}

function ruleAppliesToProduct(rule, product = {}) {
  const platforms = Array.isArray(rule.platforms) ? rule.platforms : [];
  const categories = Array.isArray(rule.categories) ? rule.categories : [];
  const productPlatform = normalizeComparable(product.platform || '');
  const productCategory = normalizeComparable(product.category || '');
  const platformOk = !platforms.length || platforms.map(normalizeComparable).includes(productPlatform);
  const categoryOk = !categories.length || categories.some((item) => productCategory.includes(normalizeComparable(item)));
  return platformOk && categoryOk;
}

function addRuleAuditCheck(addCheck, hits, options = {}) {
  const list = Array.isArray(hits) ? hits : [];
  if (!list.length) {
    addCheck({
      status: 'pass',
      severity: 'low',
      title: options.emptyTitle || '未命中规则',
      detail: options.emptyDetail || '当前文案未命中已保存的规则。'
    });
    return;
  }

  if (options.kind === 'brandRules') {
    const forbiddenHits = list.filter((item) => item.brandAuthorizationStatus === 'forbidden');
    const pendingHits = list.filter((item) => item.brandAuthorizationStatus === 'pending_review');
    const riskHits = list.filter((item) => !item.brandAuthorizationStatus || item.brandAuthorizationStatus === 'risk');
    const authorizedHits = list.filter((item) => item.brandAuthorizationStatus === 'authorized');
    const highRiskHits = list.filter((item) => item.severity === 'high' && item.brandAuthorizationStatus !== 'authorized');
    const scopeWarnings = list.flatMap((item) => item.brandScopeWarnings || []);
    const hasBlockingScope = scopeWarnings.some((item) => /已过期|不在品牌授权平台|不在品牌授权类目/.test(item));
    const hasBlocking = forbiddenHits.length > 0 || highRiskHits.length > 0 || hasBlockingScope;
    const hasReviewRisk = pendingHits.length > 0 || riskHits.length > 0 || scopeWarnings.length > 0;
    const status = hasBlocking ? 'fail' : hasReviewRisk ? 'warn' : 'pass';
    const severity = hasBlocking ? 'high' : hasReviewRisk ? 'medium' : 'low';
    const title = forbiddenHits.length
      ? '检测到不可用品牌词'
      : pendingHits.length
        ? '品牌词授权待复核'
        : riskHits.length
          ? options.hitTitle || '检测到品牌规则命中'
          : '品牌词已登记授权状态';
    const suggestion = forbiddenHits.length
      ? '移除不可用品牌词或更换为已确认授权的自有/合作品牌表达，并补齐证据。'
      : pendingHits.length
        ? '先确认品牌授权范围、投放平台和素材使用边界，再进入发布复核。'
        : riskHits.length
          ? options.warningSuggestion || '替换为授权品牌、合作款或自有素材表述。'
          : '已授权品牌词，仍需核对授权范围、投放平台、素材露出方式和证据留存。';
    addCheck({
      status,
      severity,
      title,
      detail: `命中品牌词：${list.map((item) => `${item.term}（${complianceBrandAuthorizationStatusLabel(item.brandAuthorizationStatus)}）`).join('、')}。`,
      suggestion,
      evidence: list.slice(0, 5).map((item) => compact([
        item.term,
        complianceBrandAuthorizationStatusLabel(item.brandAuthorizationStatus),
        item.brandScopeSummary,
        item.replacement,
        item.note
      ]).join(' / '))
    });
    if (authorizedHits.length && (forbiddenHits.length || pendingHits.length || riskHits.length)) {
      addCheck({
        status: 'pass',
        severity: 'low',
        title: '部分品牌词已登记授权',
        detail: `已登记授权状态的品牌词：${authorizedHits.map((item) => item.term).join('、')}。`,
        suggestion: '保留授权凭证、素材版权台账和投放范围记录，供发布前人工复核。'
      });
    }
    if (scopeWarnings.length) {
      addCheck({
        status: hasBlockingScope ? 'fail' : 'warn',
        severity: hasBlockingScope ? 'high' : 'medium',
        title: '品牌授权范围需要复核',
        detail: scopeWarnings.slice(0, 5).join('；'),
        suggestion: '核对品牌授权平台、类目、渠道、地区、活动和有效期；范围不匹配时补充授权记录或调整表达。',
        evidence: list.slice(0, 5).map((item) => compact([
          item.term,
          item.brandScopeSummary,
          ...(item.brandScopeWarnings || []).slice(0, 2)
        ]).join(' / '))
      });
    }
    return;
  }

  const highHits = list.filter((item) => item.severity === 'high');
  addCheck({
    status: highHits.length ? 'fail' : 'warn',
    severity: highHits.length ? 'high' : 'medium',
    title: options.hitTitle || '规则命中',
    detail: `命中词：${list.map((item) => item.term).join('、')}。`,
    suggestion: highHits.length
      ? options.highSuggestion || '先替换成可证明、可量化的说法，再进入投放。'
      : options.warningSuggestion || '把命中词改成更稳妥的说法，并补充证据或范围限定。',
    evidence: list.slice(0, 5).map((item) => compact([item.term, item.replacement, item.note]).join(' / '))
  });
}

function complianceBrandAuthorizationStatusLabel(value) {
  const labels = {
    authorized: '已授权',
    pending_review: '待复核',
    forbidden: '不可使用',
    risk: '需复核'
  };
  return labels[normalizeBrandRuleAuthorizationStatus(value)] || '需复核';
}

function calculateComplianceScore(checks) {
  const weights = {
    low: 6,
    medium: 14,
    high: 28
  };
  const penalty = checks.reduce((total, check) => {
    if (check.status === 'pass') return total;
    const multiplier = check.status === 'fail' ? 1.35 : 1;
    return total + Math.round((weights[check.severity] || weights.low) * multiplier);
  }, 0);
  return Math.max(0, 100 - penalty);
}

function summarizeAudit(level, blockingIssues, checks) {
  if (blockingIssues) return `发现 ${blockingIssues} 个阻断项，建议先修改再进入投放制作。`;
  const warnings = checks.filter((check) => check.status === 'warn').length;
  if (level === 'low') return warnings ? `整体风险较低，但还有 ${warnings} 个发布前留档项。` : '整体风险较低，可进入人工复核。';
  if (level === 'medium') return `整体风险中等，建议处理 ${warnings} 个提示项后再发布。`;
  return '整体风险偏高，需要补齐授权、证据或文案修改。';
}

function buildRewriteTips(flaggedTerms) {
  if (!flaggedTerms.length) {
    return [
      '继续使用具体场景、明确利益点和可证明证据，避免绝对化承诺。',
      '把“销量好”写成带统计口径的事实，把“效果好”写成真实使用体验。'
    ];
  }
  return flaggedTerms.map((item) => {
    const alternatives = {
      '最强': '更适合日常使用',
      '最优': '更合适的选择',
      '第一': '更多人选择',
      '顶级': '高规格',
      '国家级': '符合相关标准',
      '全网最优': '限时优惠',
      '100%': '尽量提升',
      '百分百': '尽量提升',
      '永久': '长期使用',
      '保证': '帮助提升',
      '根治': '帮助缓解',
      '治愈': '帮助改善',
      '疗效': '使用感受',
      '无副作用': '温和配方',
      '品牌logo': '授权素材',
      '第三方标志': '自有素材',
      '店铺标识': '授权渠道',
      '平台水印': '干净素材',
      '品牌露出': '授权展示',
      '同款': '相似风格',
      '联名': '合作款',
      '大牌': '高质感'
    };
    const replacement = item.replacement || alternatives[item.term] || (item.kind === 'brandRules' ? '授权品牌名称' : '可证明表达');
    return `将“${item.term}”改为“${replacement}”一类更稳妥的说法。`;
  });
}

function buildStoryboard(product, points, duration) {
  const segments = duration <= 15
    ? [3, 4, 4, 4]
    : [3, 5, 5, 4, Math.max(3, duration - 17)];
  const scenes = [
    {
      time: `0-${segments[0]}s`,
      shot: '痛点近景',
      action: `${product.audience}遇到${extractPain(product)}，画面快速给出问题。`,
      text: `${extractPain(product)}？`
    },
    {
      time: `${segments[0]}-${segments[0] + segments[1]}s`,
      shot: '产品出现',
      action: `产品进入画面，展示${points[0] || product.title}。`,
      text: points[0] || product.title
    },
    {
      time: `${segments[0] + segments[1]}-${segments[0] + segments[1] + segments[2]}s`,
      shot: '使用过程',
      action: `用连续动作展示${points.slice(0, 3).join('、')}。`,
      text: points.slice(0, 2).join(' + ')
    },
    {
      time: `${segments[0] + segments[1] + segments[2]}-${segments[0] + segments[1] + segments[2] + segments[3]}s`,
      shot: '结果对比',
      action: '前后状态放在同一构图内，强调省时、省空间或舒适度提升。',
      text: '效果一眼看见'
    }
  ];
  if (segments.length > 4) {
    scenes.push({
      time: `${duration - segments[4]}-${duration}s`,
      shot: '权益收口',
      action: `展示价格、销量背书与下单入口：${formatPrice(product.price)} / ${formatSales(product.sales)}人下单。`,
      text: '现在入手'
    });
  }
  return scenes;
}

function buildVoiceover(product, points, cta) {
  return [
    `如果你也在为${extractPain(product)}头疼，先看这个。`,
    `${product.title}主打${points.slice(0, 2).join('和')}，日常使用不用额外折腾。`,
    `对${product.audience}来说，它解决的是一个每天都会遇到的小麻烦。`,
    `${cta}。`
  ];
}

function buildCaptions(product, points) {
  return [
    `痛点：${extractPain(product)}`,
    points[0] || product.title,
    points[1] || '真实场景可见',
    `${formatSales(product.sales)}人选择`,
    '点击查看详情'
  ];
}

function buildShotList(product, mediaType) {
  if (mediaType === 'video') {
    return [
      '3秒痛点开场',
      '手部/人物真实使用',
      '产品细节特写',
      '前后对比',
      '价格权益与购买入口'
    ];
  }
  return [
    '产品主体清晰可见',
    '真实使用环境',
    '卖点标签不超过三个',
    '价格与销量背书',
    '品牌/店铺露出'
  ];
}

function chooseVisualStyle(product) {
  const byCategory = {
    '家居收纳': '干净厨房/小户型真实场景，高亮整理前后差异',
    '个护家电': '明亮浴室或梳妆台，突出质感、风速和发丝状态',
    '母婴玩具': '柔和自然光、亲子互动、低饱和安全感',
    '运动户外': '户外日光、动作感、轻量便携细节',
    '宠物用品': '温暖居家场景，宠物自然互动',
    '健康护理': '办公室/卧室放松场景，干净可信',
    '厨房小电': '台面近景、新鲜食材、快速完成',
    '旅行用品': '行李箱/酒店台面，强调有序和防水',
    '家居装饰': '夜间室内氛围，光影变化突出',
    '运动服饰': '训练场景、面料细节、身体活动'
  };
  return byCategory[product.category] || '真实场景、清晰主体、短句卖点';
}

function buildHook(product, primaryPoint, priceSignal) {
  const pain = extractPain(product);
  if (priceSignal.includes('低客单')) return `${formatPrice(product.price)}解决${pain}`;
  return `${product.audience}最容易忽略的${pain}，用${primaryPoint || product.title}解决`;
}

function buildHeadline(product, points, tone) {
  const point = points[0] || product.title;
  if (tone === 'premium') return `${product.title}，把日常体验做细一点`;
  if (tone === 'urgent') return `${formatSales(product.sales)}人买过的${point}`;
  return `${point}，让${extractNeed(product)}更轻松`;
}

function buildImagePrompt(product, points) {
  return [
    `原创电商广告海报，商品是${product.title}`,
    `场景：${chooseVisualStyle(product)}`,
    `画面需要体现：${points.slice(0, 3).join('、')}`,
    '主体清晰，真实光线，留出中文标题区域，不能出现第三方品牌商标或平台水印'
  ].join('；');
}

function buildComplianceChecklist(product) {
  return [
    `确认${platformNames[product.platform] || product.platform}数据来源已授权或来自官方开放接口。`,
    '确认图片、视频、音乐、字体、人物肖像均为自有或已授权。',
    '避免使用“第一”“最强”“治愈”等无法证明或广告法高风险表达。',
    '若使用销量背书，保留平台后台截图或 API 返回记录作为证据。'
  ];
}

function scoreProduct(product) {
  const salesScore = Math.min(60, Math.log10(Math.max(10, product.sales)) * 12);
  const commissionScore = Math.min(20, Number(product.commissionRate || 0) * 1.2);
  const priceScore = product.price > 0 && product.price <= 200 ? 12 : 7;
  const mediaScore = product.mediaUrl ? 8 : 2;
  return Math.round(salesScore + commissionScore + priceScore + mediaScore);
}

function normalizeProduct(input) {
  const sellingPoints = Array.isArray(input.sellingPoints)
    ? input.sellingPoints.filter(Boolean)
    : splitPoints(input.sellingPoints || input.points || '');
  return {
    id: String(input.id || stableId(input.title || 'product')),
    platform: String(input.platform || 'sample').toLowerCase(),
    title: String(input.title || input.name || '未命名商品'),
    category: String(input.category || '未分类'),
    shop: String(input.shop || input.store || '未知店铺'),
    price: Number(input.price || 0),
    sales: Number(input.sales || input.volume || 0),
    commissionRate: Number(input.commissionRate || input.commission_rate || 0),
    imageUrl: String(input.imageUrl || input.image || ''),
    mediaType: String(input.mediaType || inferMediaType(input.mediaUrl || input.imageUrl || '')),
    mediaUrl: String(input.mediaUrl || input.imageUrl || input.image || ''),
    mediaItems: normalizeMediaItems(input.mediaItems || input.mediaList || input.images || input.imageUrls || input.gallery),
    sellingPoints,
    audience: String(input.audience || '目标用户'),
    sourceNotice: input.sourceNotice || '',
    salesTrend: normalizeSalesTrend(input.salesTrend || input.salesHistory || input.dailySales || input.trend)
  };
}

function normalizeMediaItems(value) {
  const list = Array.isArray(value) ? value : splitPoints(value || '');
  return list
    .map((item, index) => {
      if (typeof item === 'string') {
        const url = item.trim();
        if (!url) return null;
        return {
          url,
          type: inferMediaType(url),
          label: `素材 ${index + 1}`
        };
      }
      const url = String(item?.url || item?.mediaUrl || item?.imageUrl || item?.src || '').trim();
      if (!url) return null;
      return {
        url,
        type: String(item?.type || item?.mediaType || inferMediaType(url)),
        label: String(item?.label || item?.title || item?.alt || `素材 ${index + 1}`),
        thumbnailUrl: String(item?.thumbnailUrl || item?.thumbUrl || item?.posterUrl || item?.imageUrl || ''),
        posterUrl: String(item?.posterUrl || item?.imageUrl || '')
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeSalesTrend(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'number' || typeof item === 'string') return Number(String(item).replace(/[^\d.-]/g, ''));
        return parseSalesHistoryNumber(item?.sales ?? item?.sale ?? item?.value ?? item?.count ?? item?.volume ?? 0);
      })
      .filter((item) => Number.isFinite(item) && item >= 0)
      .slice(-30);
  }
  const text = String(value || '').trim();
  if (!text) return [];
  return text
    .split(/[|,，;；\s]+/)
    .map((item) => Number(item.replace(/[^\d.-]/g, '')))
    .filter((item) => Number.isFinite(item) && item >= 0)
    .slice(-30);
}

function deriveSellingPoints(product) {
  const fromTitle = product.title
    .replace(/[，,。.!！]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  return fromTitle.length ? fromTitle : ['高频需求', '易展示', '转化链路短'];
}

function extractPain(product) {
  const map = {
    '个护家电': '早晨打理太赶',
    '家居收纳': '台面杂乱不好拿',
    '母婴玩具': '孩子总想看屏幕',
    '运动户外': '出门怕晒或装备太重',
    '宠物用品': '宠物喝水少',
    '健康护理': '久坐肩颈紧绷',
    '厨房小电': '健康饮品准备麻烦',
    '旅行用品': '行李洗漱用品凌乱',
    '家居装饰': '房间拍照缺氛围',
    '运动服饰': '运动出汗闷热'
  };
  return map[product.category] || '日常使用不方便';
}

function extractNeed(product) {
  const map = {
    '个护家电': '出门前造型',
    '家居收纳': '厨房整理',
    '母婴玩具': '亲子陪伴',
    '运动户外': '户外通勤',
    '宠物用品': '宠物照顾',
    '健康护理': '午休恢复',
    '厨房小电': '轻食准备',
    '旅行用品': '出行整理',
    '家居装饰': '空间布置',
    '运动服饰': '训练日常'
  };
  return map[product.category] || '购买决策';
}

function splitPoints(value) {
  if (!value) return [];
  return String(value)
    .split(/[|、,，;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferMediaType(url) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(String(url)) ? 'video' : 'image';
}

function formatSales(sales) {
  if (!sales) return '多位用户';
  if (sales >= 10000) return `${(sales / 10000).toFixed(sales >= 100000 ? 0 : 1)}万`;
  return `${sales}`;
}

function formatPrice(price) {
  if (!price) return '优惠价';
  return `¥${Number(price).toFixed(price % 1 ? 1 : 0)}`;
}

function formatTaobaoTimestamp(date) {
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function signTaobao(params, secret) {
  const base = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('');
  return createHash('md5')
    .update(`${secret}${base}${secret}`, 'utf8')
    .digest('hex')
    .toUpperCase();
}

function signHmacSha256(params, secret) {
  const base = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('');
  return createHmac('sha256', secret).update(base).digest('hex');
}

function stableId(value) {
  return createHash('sha1').update(String(value)).digest('hex').slice(0, 10);
}

function ensureHttps(value) {
  if (!value) return '';
  if (String(value).startsWith('//')) return `https:${value}`;
  return String(value).replace(/^http:/, 'https:');
}

function compact(items) {
  return items.filter((item) => item !== undefined && item !== null && item !== false && String(item).trim() !== '');
}

function createHttpError(status, message, code = 'REQUEST_ERROR', hint = '') {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  error.code = code;
  error.hint = hint;
  return error;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = normalize(resolve(publicDir, `.${pathname}`));
  const relativePath = relative(publicDir, filePath);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    sendJson(res, 403, { error: 'FORBIDDEN' });
    return;
  }
  if (!existsSync(filePath) || !(await stat(filePath)).isFile()) {
    sendJson(res, 404, { error: 'NOT_FOUND' });
    return;
  }
  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, withSecurityHeaders({
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  }, { csp: true }));
  createReadStream(filePath).pipe(res);
}

function withSecurityHeaders(headers = {}, options = {}) {
  return {
    ...securityHeaders,
    ...(options.csp ? { 'Content-Security-Policy': contentSecurityPolicy } : {}),
    ...headers
  };
}

function sendJson(res, status, payload) {
  res.writeHead(status, withSecurityHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  }));
  res.end(JSON.stringify(payload, null, 2));
}

function sendJsonDownload(res, status, payload, filename) {
  res.writeHead(status, withSecurityHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="${safeDownloadFileName(filename)}"`,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  }));
  res.end(JSON.stringify(payload, null, 2));
}

function safeDownloadFileName(value) {
  return String(value || 'export.json')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/[\r\n]+/g, '')
    .slice(0, 120);
}

function formatDateStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
}

function sendOptions(res) {
  res.writeHead(204, withSecurityHeaders({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  }));
  res.end();
}
