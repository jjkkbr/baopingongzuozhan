const state = {
  products: [],
  selected: null,
  analysis: null,
  ad: null,
  audit: null,
  creativeQuality: null,
  batchSelectedIds: new Set(),
  batchJobs: [],
  activeBatchJobId: '',
  batchActiveCount: 0,
  batchQueue: null,
  batchTotal: 0,
  batchQuery: '',
  batchStatus: 'all',
  batchIncludeArchived: false,
  batchDetailQuery: '',
  batchDetailStatus: 'all',
  batchDetailCategory: 'all',
  sourceMode: 'sample',
  platform: 'all',
  aiConfigured: false,
  complianceRules: null,
  complianceRuleDraft: null,
  complianceRuleKind: 'sensitiveTerms',
  complianceRuleDirty: false,
  auditRecords: [],
  authorizationCredentials: [],
  materialRights: []
};

const GUIDE_STORAGE_KEY = 'adWorkbenchGuideCompleted';
let batchPollTimer = null;
let batchSearchTimer = null;
let activityToken = 0;
let activityHideTimer = null;

const els = {
  source: document.querySelector('#source'),
  keyword: document.querySelector('#keyword'),
  limit: document.querySelector('#limit'),
  refreshBtn: document.querySelector('#refreshBtn'),
  guideBtn: document.querySelector('#guideBtn'),
  openOutputBtn: document.querySelector('#openOutputBtn'),
  openExtensionBtn: document.querySelector('#openExtensionBtn'),
  authModeBtn: document.querySelector('#authModeBtn'),
  importBtn: document.querySelector('#importBtn'),
  importHistoryBtn: document.querySelector('#importHistoryBtn'),
  parseTextBtn: document.querySelector('#parseTextBtn'),
  loadExtensionBtn: document.querySelector('#loadExtensionBtn'),
  extensionQualityReport: document.querySelector('#extensionQualityReport'),
  csvInput: document.querySelector('#csvInput'),
  aiStatus: document.querySelector('#aiStatus'),
  aiPreset: document.querySelector('#aiPreset'),
  aiBaseUrl: document.querySelector('#aiBaseUrl'),
  aiModel: document.querySelector('#aiModel'),
  aiTimeout: document.querySelector('#aiTimeout'),
  aiApiKey: document.querySelector('#aiApiKey'),
  clearAiKey: document.querySelector('#clearAiKey'),
  visualAiStatus: document.querySelector('#visualAiStatus'),
  visualAiBaseUrl: document.querySelector('#visualAiBaseUrl'),
  visualAiModel: document.querySelector('#visualAiModel'),
  visualAiApiKey: document.querySelector('#visualAiApiKey'),
  clearVisualAiKey: document.querySelector('#clearVisualAiKey'),
  saveAiConfigBtn: document.querySelector('#saveAiConfigBtn'),
  testAiConfigBtn: document.querySelector('#testAiConfigBtn'),
  testVisualAiConfigBtn: document.querySelector('#testVisualAiConfigBtn'),
  aiConfigNote: document.querySelector('#aiConfigNote'),
  sourceNote: document.querySelector('#sourceNote'),
  productCount: document.querySelector('#productCount'),
  productList: document.querySelector('#productList'),
  batchSelectionStatus: document.querySelector('#batchSelectionStatus'),
  batchSelectAllBtn: document.querySelector('#batchSelectAllBtn'),
  batchClearBtn: document.querySelector('#batchClearBtn'),
  mediaStage: document.querySelector('#mediaStage'),
  mediaThumbs: document.querySelector('#mediaThumbs'),
  selectedTitle: document.querySelector('#selectedTitle'),
  selectedScore: document.querySelector('#selectedScore'),
  selectedPrice: document.querySelector('#selectedPrice'),
  selectedSales: document.querySelector('#selectedSales'),
  selectedCommission: document.querySelector('#selectedCommission'),
  selectedCategory: document.querySelector('#selectedCategory'),
  sellingPoints: document.querySelector('#sellingPoints'),
  trendPeriod: document.querySelector('#trendPeriod'),
  trendChart: document.querySelector('#trendChart'),
  format: document.querySelector('#format'),
  tone: document.querySelector('#tone'),
  analyzeBtn: document.querySelector('#analyzeBtn'),
  visualBtn: document.querySelector('#visualBtn'),
  generateBtn: document.querySelector('#generateBtn'),
  auditBtn: document.querySelector('#auditBtn'),
  analysisBox: document.querySelector('#analysisBox'),
  auditScore: document.querySelector('#auditScore'),
  auditBox: document.querySelector('#auditBox'),
  outputContent: document.querySelector('#outputContent'),
  exportBtn: document.querySelector('#exportBtn'),
  batchQueueState: document.querySelector('#batchQueueState'),
  batchGenerateBtn: document.querySelector('#batchGenerateBtn'),
  batchAuditBtn: document.querySelector('#batchAuditBtn'),
  batchSearchInput: document.querySelector('#batchSearchInput'),
  batchStatusFilter: document.querySelector('#batchStatusFilter'),
  batchIncludeArchived: document.querySelector('#batchIncludeArchived'),
  batchLimitNote: document.querySelector('#batchLimitNote'),
  batchHistory: document.querySelector('#batchHistory'),
  batchDetail: document.querySelector('#batchDetail'),
  ruleLibraryState: document.querySelector('#ruleLibraryState'),
  ruleSaveBtn: document.querySelector('#ruleSaveBtn'),
  ruleResetBtn: document.querySelector('#ruleResetBtn'),
  ruleImportBtn: document.querySelector('#ruleImportBtn'),
  ruleExportBtn: document.querySelector('#ruleExportBtn'),
  ruleImportFile: document.querySelector('#ruleImportFile'),
  ruleImportPreview: document.querySelector('#ruleImportPreview'),
  ruleDefaultCount: document.querySelector('#ruleDefaultCount'),
  ruleCustomCount: document.querySelector('#ruleCustomCount'),
  ruleDefaultList: document.querySelector('#ruleDefaultList'),
  ruleCustomList: document.querySelector('#ruleCustomList'),
  ruleTermInput: document.querySelector('#ruleTermInput'),
  ruleSeverityInput: document.querySelector('#ruleSeverityInput'),
  ruleBrandStatusField: document.querySelector('#ruleBrandStatusField'),
  ruleBrandStatusInput: document.querySelector('#ruleBrandStatusInput'),
  ruleBrandScopeRows: [...document.querySelectorAll('.rule-brand-scope-row')],
  ruleBrandNamesInput: document.querySelector('#ruleBrandNamesInput'),
  ruleBrandChannelsInput: document.querySelector('#ruleBrandChannelsInput'),
  ruleBrandRegionsInput: document.querySelector('#ruleBrandRegionsInput'),
  ruleBrandExpiresInput: document.querySelector('#ruleBrandExpiresInput'),
  ruleBrandCampaignInput: document.querySelector('#ruleBrandCampaignInput'),
  ruleBrandReferenceInput: document.querySelector('#ruleBrandReferenceInput'),
  ruleReplacementInput: document.querySelector('#ruleReplacementInput'),
  ruleNoteInput: document.querySelector('#ruleNoteInput'),
  rulePlatformInput: document.querySelector('#rulePlatformInput'),
  ruleCategoryInput: document.querySelector('#ruleCategoryInput'),
  ruleAddBtn: document.querySelector('#ruleAddBtn'),
  ruleSnapshotList: document.querySelector('#ruleSnapshotList'),
  auditExportBtn: document.querySelector('#auditExportBtn'),
  auditHistory: document.querySelector('#auditHistory'),
  credentialTitle: document.querySelector('#credentialTitle'),
  credentialType: document.querySelector('#credentialType'),
  credentialReference: document.querySelector('#credentialReference'),
  credentialReviewer: document.querySelector('#credentialReviewer'),
  credentialAddBtn: document.querySelector('#credentialAddBtn'),
  credentialExportBtn: document.querySelector('#credentialExportBtn'),
  credentialHistory: document.querySelector('#credentialHistory'),
  materialRightTitle: document.querySelector('#materialRightTitle'),
  materialRightType: document.querySelector('#materialRightType'),
  materialRightSource: document.querySelector('#materialRightSource'),
  materialRightScope: document.querySelector('#materialRightScope'),
  materialRightReference: document.querySelector('#materialRightReference'),
  materialRightAttachments: document.querySelector('#materialRightAttachments'),
  materialRightExpiresAt: document.querySelector('#materialRightExpiresAt'),
  materialRightBrandNames: document.querySelector('#materialRightBrandNames'),
  materialRightBrandStatus: document.querySelector('#materialRightBrandStatus'),
  materialRightChannels: document.querySelector('#materialRightChannels'),
  materialRightRegions: document.querySelector('#materialRightRegions'),
  materialRightCampaign: document.querySelector('#materialRightCampaign'),
  materialRightReviewer: document.querySelector('#materialRightReviewer'),
  materialRightAddBtn: document.querySelector('#materialRightAddBtn'),
  materialRightExportBtn: document.querySelector('#materialRightExportBtn'),
  materialRightHistory: document.querySelector('#materialRightHistory'),
  ruleKinds: [...document.querySelectorAll('.rule-kind')],
  guideModal: document.querySelector('#guideModal'),
  guideCloseBtn: document.querySelector('#guideCloseBtn'),
  guideDoneBtn: document.querySelector('#guideDoneBtn'),
  guideOpenOutputBtn: document.querySelector('#guideOpenOutputBtn'),
  guideOpenExtensionBtn: document.querySelector('#guideOpenExtensionBtn'),
  activityToast: document.querySelector('#activityToast'),
  activityTitle: document.querySelector('#activityTitle'),
  activityDetail: document.querySelector('#activityDetail'),
  railNavLinks: [...document.querySelectorAll('.rail-item')],
  opsNavLinks: [...document.querySelectorAll('[data-ops-nav]')],
  segments: [...document.querySelectorAll('.segment')],
  opsTabs: [...document.querySelectorAll('[data-ops-tab]')],
  opsPanels: [...document.querySelectorAll('[data-ops-panel]')]
};

boot();

function boot() {
  els.refreshBtn.addEventListener('click', loadProducts);
  els.guideBtn.addEventListener('click', () => openGuide({ manual: true }));
  els.openOutputBtn.addEventListener('click', () => openLocalDirectory('output'));
  els.openExtensionBtn.addEventListener('click', () => openLocalDirectory('extension'));
  els.authModeBtn.addEventListener('click', focusAuthorizedImport);
  els.guideCloseBtn.addEventListener('click', closeGuide);
  els.guideDoneBtn.addEventListener('click', completeGuide);
  els.guideOpenOutputBtn.addEventListener('click', () => openLocalDirectory('output'));
  els.guideOpenExtensionBtn.addEventListener('click', () => openLocalDirectory('extension'));
  els.guideModal.addEventListener('click', (event) => {
    if (event.target === els.guideModal) closeGuide();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.guideModal.hidden) closeGuide();
  });
  els.keyword.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loadProducts();
  });
  els.source.addEventListener('change', loadProducts);
  els.importBtn.addEventListener('click', importCsv);
  els.importHistoryBtn.addEventListener('click', importSalesHistory);
  els.parseTextBtn.addEventListener('click', importAuthorizedText);
  els.loadExtensionBtn.addEventListener('click', loadExtensionProducts);
  els.aiPreset.addEventListener('change', applyAiPreset);
  els.saveAiConfigBtn.addEventListener('click', saveAiConfig);
  els.testAiConfigBtn.addEventListener('click', testAiConfig);
  els.testVisualAiConfigBtn.addEventListener('click', testVisualAiConfig);
  els.ruleSaveBtn.addEventListener('click', saveComplianceRules);
  els.ruleResetBtn.addEventListener('click', resetComplianceRules);
  els.ruleExportBtn.addEventListener('click', exportComplianceRules);
  els.ruleImportBtn.addEventListener('click', () => els.ruleImportFile.click());
  els.ruleImportFile.addEventListener('change', importComplianceRulesFromFile);
  els.ruleAddBtn.addEventListener('click', addComplianceRuleFromForm);
  els.ruleDefaultList.addEventListener('change', handleComplianceRuleDefaultChange);
  els.ruleCustomList.addEventListener('input', handleComplianceRuleCustomInput);
  els.ruleCustomList.addEventListener('change', handleComplianceRuleCustomInput);
  els.ruleCustomList.addEventListener('click', handleComplianceRuleCustomAction);
  els.ruleSnapshotList?.addEventListener('click', handleComplianceRuleSnapshotAction);
  els.ruleKinds.forEach((button) => {
    button.addEventListener('click', () => switchComplianceRuleKind(button.dataset.ruleKind));
  });
  els.analyzeBtn.addEventListener('click', runAnalysis);
  els.visualBtn.addEventListener('click', runVisualAnalysis);
  els.generateBtn.addEventListener('click', generateAd);
  els.auditBtn.addEventListener('click', runAudit);
  els.auditExportBtn.addEventListener('click', exportAuditRecords);
  els.credentialAddBtn.addEventListener('click', addAuthorizationCredential);
  els.credentialExportBtn.addEventListener('click', exportAuthorizationCredentials);
  els.materialRightAddBtn.addEventListener('click', addMaterialRight);
  els.materialRightExportBtn.addEventListener('click', exportMaterialRights);
  els.exportBtn.addEventListener('click', exportPlan);
  els.opsTabs.forEach((button) => {
    button.addEventListener('click', () => switchOpsPanel(button.dataset.opsTab));
  });
  els.opsNavLinks.forEach((link) => {
    link.addEventListener('click', () => switchOpsPanel(link.dataset.opsNav));
  });
  els.railNavLinks.forEach((link) => {
    link.addEventListener('click', () => activateRailNavigation(link));
  });
  els.batchSelectAllBtn.addEventListener('click', selectAllBatchProducts);
  els.batchClearBtn.addEventListener('click', clearBatchSelection);
  els.batchGenerateBtn.addEventListener('click', runBatchGeneration);
  els.batchAuditBtn.addEventListener('click', runBatchAudit);
  els.batchSearchInput.addEventListener('input', () => {
    state.batchQuery = els.batchSearchInput.value.trim();
    window.clearTimeout(batchSearchTimer);
    batchSearchTimer = window.setTimeout(loadBatchJobs, 220);
  });
  els.batchStatusFilter.addEventListener('change', () => {
    state.batchStatus = els.batchStatusFilter.value || 'all';
    loadBatchJobs();
  });
  els.batchIncludeArchived.addEventListener('change', () => {
    state.batchIncludeArchived = els.batchIncludeArchived.checked;
    loadBatchJobs();
  });
  els.segments.forEach((button) => {
    button.addEventListener('click', () => {
      state.platform = button.dataset.platform;
      els.segments.forEach((item) => item.classList.toggle('is-active', item === button));
      loadProducts();
    });
  });
  renderEmpty();
  renderBatchPanel();
  loadAiConfig();
  loadComplianceRules();
  loadAuditRecords();
  loadAuthorizationCredentials();
  loadMaterialRights();
  loadProducts();
  loadBatchJobs();
  maybeOpenGuide();
}

async function loadAiConfig() {
  try {
    const data = await api('/api/ai-config');
    renderAiConfig(data);
  } catch (error) {
    els.aiConfigNote.textContent = error instanceof Error ? error.message : String(error);
  }
}

function applyAiPreset() {
  const presets = {
    dashscope: {
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-plus'
    },
    'dashscope-coding': {
      baseUrl: 'https://coding.dashscope.aliyuncs.com/v1',
      model: 'qwen3-coder-plus'
    }
  };
  const preset = presets[els.aiPreset.value];
  if (!preset) return;
  ensureModelOption(preset.model);
  els.aiBaseUrl.value = preset.baseUrl;
  els.aiModel.value = preset.model;
  if (!els.visualAiBaseUrl.value.trim()) els.visualAiBaseUrl.value = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  if (!els.visualAiModel.value.trim()) els.visualAiModel.value = 'qwen-vl-plus';
  els.aiConfigNote.textContent = els.aiPreset.value === 'dashscope-coding'
    ? '已切换为阿里百炼 Coding 专属接口，适用于 sk-sp 开头的套餐 Key。'
    : '已切换为阿里百炼通用 OpenAI 兼容接口。';
  els.aiConfigNote.classList.remove('is-error');
}

async function saveAiConfig() {
  setBusy(els.saveAiConfigBtn, true);
  try {
    const data = await api('/api/ai-config', {
      method: 'POST',
      body: JSON.stringify({
        baseUrl: els.aiBaseUrl.value.trim(),
        model: els.aiModel.value.trim(),
        visualBaseUrl: els.visualAiBaseUrl.value.trim(),
        visualModel: els.visualAiModel.value.trim(),
        timeoutMs: Number(els.aiTimeout.value || 20000),
        apiKey: els.aiApiKey.value.trim(),
        visualApiKey: els.visualAiApiKey.value.trim(),
        clearApiKey: els.clearAiKey.checked,
        clearVisualApiKey: els.clearVisualAiKey.checked
      })
    });
    els.aiApiKey.value = '';
    els.visualAiApiKey.value = '';
    els.clearAiKey.checked = false;
    els.clearVisualAiKey.checked = false;
    renderAiConfig(data);
    els.aiConfigNote.textContent = data.hasKey
      ? `已记住，当前模型：${data.model}，Key：${data.keyHint}。下次打开不用重复输入。`
      : '已保存基础配置，但还没有 API Key。';
  } catch (error) {
    showAiConfigError(error);
  } finally {
    setBusy(els.saveAiConfigBtn, false);
  }
}

async function testAiConfig() {
  setBusy(els.testAiConfigBtn, true);
  try {
    const data = await api('/api/ai-config/test', { method: 'POST' });
    els.aiConfigNote.textContent = data.hint ? `${data.message} ${data.hint}` : data.message;
    els.aiConfigNote.classList.toggle('is-error', !data.ok);
  } catch (error) {
    showAiConfigError(error);
  } finally {
    setBusy(els.testAiConfigBtn, false);
  }
}

async function testVisualAiConfig() {
  setBusy(els.testVisualAiConfigBtn, true);
  try {
    const data = await api('/api/ai-config/test-visual', { method: 'POST' });
    els.aiConfigNote.textContent = data.hint ? `视觉模型：${data.message} ${data.hint}` : `视觉模型：${data.message}`;
    els.aiConfigNote.classList.toggle('is-error', !data.ok);
  } catch (error) {
    showAiConfigError(error);
  } finally {
    setBusy(els.testVisualAiConfigBtn, false);
  }
}

function renderAiConfig(config) {
  state.aiConfigured = Boolean(config.hasKey);
  els.aiBaseUrl.value = config.baseUrl || '';
  ensureModelOption(config.model || 'qwen-plus');
  els.aiModel.value = config.model || 'qwen-plus';
  els.visualAiBaseUrl.value = config.visualBaseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  ensureModelOption(config.visualModel || 'qwen-vl-plus', els.visualAiModel);
  els.visualAiModel.value = config.visualModel || 'qwen-vl-plus';
  els.aiPreset.value = inferAiPreset(config.baseUrl, config.model);
  els.aiTimeout.value = config.timeoutMs || 20000;
  els.aiApiKey.placeholder = config.localHasKey || config.keySource === 'environment'
    ? `已记住 ${config.keyHint}，留空继续使用`
    : '首次填写后会自动记住';
  els.visualAiApiKey.placeholder = config.visualLocalHasKey || config.visualKeySource === 'environment'
    ? `已记住 ${config.visualKeyHint}，留空继续使用`
    : config.visualUsesSharedKey
      ? `留空将共用上方 Key ${config.visualKeyHint}`
      : '留空则共用上方 Key';
  els.aiStatus.textContent = config.hasKey ? `已记住 ${config.keyHint}` : '未配置';
  els.aiStatus.classList.toggle('is-ready', Boolean(config.hasKey));
  els.visualAiStatus.textContent = config.visualHasKey ? `视觉 ${config.visualKeyHint || ''}` : '未配置';
  els.visualAiStatus.classList.toggle('is-ready', Boolean(config.visualHasKey));
  els.visualAiStatus.title = config.visualKeySource === 'environment'
    ? '视觉 Key 来自环境变量'
    : config.visualKeySource === 'local'
      ? '视觉 Key 来自本地配置'
      : config.visualKeySource === 'shared'
        ? '视觉模型将共用上方 Key'
        : '尚未配置视觉 Key';
  els.aiStatus.title = config.keySource === 'environment'
    ? '当前 Key 来自环境变量'
    : config.keySource === 'local'
      ? '当前 Key 来自本地配置'
      : '尚未配置 Key';
  els.aiConfigNote.classList.remove('is-error');
  if (config.remembered) {
    els.aiConfigNote.textContent = config.hasKey
      ? `已自动加载上次设置：${config.model} / ${config.keyHint}。`
      : `已自动加载上次模型设置：${config.model}。`;
  }
}

function maybeOpenGuide() {
  if (localStorage.getItem(GUIDE_STORAGE_KEY) === 'done') return;
  window.setTimeout(() => openGuide(), 350);
}

function openGuide() {
  els.guideModal.hidden = false;
  document.body.classList.add('has-modal');
  els.guideDoneBtn.focus();
}

function closeGuide() {
  els.guideModal.hidden = true;
  document.body.classList.remove('has-modal');
}

function completeGuide() {
  localStorage.setItem(GUIDE_STORAGE_KEY, 'done');
  closeGuide();
}

function focusAuthorizedImport() {
  els.csvInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  els.csvInput.focus({ preventScroll: true });
  els.sourceNote.textContent = '授权数据模式已开启：请粘贴商家后台导出、授权文本/HTML，或使用 Edge 插件发送当前已授权页面内容。';
}

function activateRailNavigation(link) {
  const panelName = link.dataset.opsNav;
  if (panelName) switchOpsPanel(panelName);
  setActiveRailLink(link);
}

function setActiveRailLink(activeLink) {
  els.railNavLinks.forEach((link) => {
    link.classList.toggle('is-active', link === activeLink);
  });
}

async function openLocalDirectory(kind) {
  const endpoints = {
    output: '/api/open/output-dir',
    extension: '/api/open/extension-dir'
  };
  const labels = {
    output: '导出目录',
    extension: '插件目录'
  };
  try {
    const data = await api(endpoints[kind], { method: 'POST' });
    els.sourceNote.textContent = data.path
      ? `${data.message} 路径：${data.path}`
      : data.message;
  } catch (error) {
    els.sourceNote.textContent = `${labels[kind]}打开失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

function inferAiPreset(baseUrl, model) {
  const url = String(baseUrl || '');
  const modelName = String(model || '');
  if (url.includes('coding.dashscope.aliyuncs.com') || modelName.includes('coder')) return 'dashscope-coding';
  if (url.includes('dashscope.aliyuncs.com/compatible-mode')) return 'dashscope';
  return 'custom';
}

function ensureModelOption(model, select = els.aiModel) {
  const value = String(model || '').trim();
  if (!value) return;
  const exists = [...select.options].some((option) => option.value === value);
  if (!exists) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
}

function showAiConfigError(error) {
  els.aiConfigNote.textContent = error instanceof Error ? error.message : String(error);
  els.aiConfigNote.classList.add('is-error');
}

async function loadComplianceRules() {
  if (!els.ruleLibraryState) return;
  els.ruleLibraryState.textContent = '加载中';
  try {
    const data = await api('/api/compliance-rules');
    state.complianceRules = data;
    state.complianceRuleDraft = cloneComplianceRuleDraft(data);
    state.complianceRuleDirty = false;
    renderComplianceRules();
  } catch (error) {
    state.complianceRules = null;
    state.complianceRuleDraft = null;
    state.complianceRuleDirty = false;
    renderComplianceRules();
    showError(error);
  }
}

function cloneComplianceRuleDraft(data) {
  return {
    disabledDefaultRuleIds: Array.isArray(data?.disabledDefaultRuleIds)
      ? [...data.disabledDefaultRuleIds]
      : [],
    customRules: {
      sensitiveTerms: cloneComplianceRuleList(data?.customRules?.sensitiveTerms),
      brandRules: cloneComplianceRuleList(data?.customRules?.brandRules)
    }
  };
}

function cloneComplianceRuleList(list) {
  return Array.isArray(list)
    ? list.map((item) => ({ ...item }))
    : [];
}

function createEmptyComplianceRuleDraft() {
  return {
    disabledDefaultRuleIds: [],
    customRules: {
      sensitiveTerms: [],
      brandRules: []
    }
  };
}

function switchComplianceRuleKind(kind) {
  if (!kind || state.complianceRuleKind === kind) return;
  state.complianceRuleKind = kind;
  renderComplianceRules();
}

function renderComplianceRules() {
  if (!els.ruleLibraryState || !els.ruleDefaultList || !els.ruleCustomList) return;
  const rules = state.complianceRules;
  const draft = state.complianceRuleDraft || createEmptyComplianceRuleDraft();
  const kind = state.complianceRuleKind || 'sensitiveTerms';

  if (els.ruleKinds?.length) {
    els.ruleKinds.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.ruleKind === kind);
    });
  }

  if (!rules) {
    els.ruleLibraryState.textContent = '未加载';
    els.ruleLibraryState.title = '';
    els.ruleLibraryState.classList.remove('is-dirty');
    if (els.ruleImportPreview) {
      els.ruleImportPreview.hidden = true;
      els.ruleImportPreview.innerHTML = '';
    }
    els.ruleDefaultCount.textContent = '0';
    els.ruleCustomCount.textContent = '0';
    els.ruleDefaultList.innerHTML = '<div class="empty-copy">暂无规则</div>';
    els.ruleCustomList.innerHTML = '<div class="empty-copy">暂无规则</div>';
    if (els.ruleSnapshotList) els.ruleSnapshotList.innerHTML = '<div class="empty-copy">暂无版本快照</div>';
    els.ruleSaveBtn.disabled = true;
    els.ruleResetBtn.disabled = true;
    els.ruleImportBtn.disabled = false;
    els.ruleExportBtn.disabled = true;
    els.ruleAddBtn.disabled = true;
    return;
  }

  const defaults = rules.defaults?.[kind] || [];
  const customs = draft.customRules?.[kind] || [];
  const disabledIds = new Set(draft.disabledDefaultRuleIds || []);
  const summary = getComplianceRuleSummary();

  els.ruleDefaultCount.textContent = String(defaults.length);
  els.ruleCustomCount.textContent = String(customs.length);
  els.ruleLibraryState.textContent = state.complianceRuleDirty ? '未保存' : `生效 ${summary.activeCount}`;
  els.ruleLibraryState.title = `默认 ${summary.defaultSensitiveCount + summary.defaultBrandCount} / 自定义 ${summary.customSensitiveCount + summary.customBrandCount} / 禁用 ${summary.disabledDefaultCount}`;
  els.ruleLibraryState.classList.toggle('is-dirty', state.complianceRuleDirty);
  if (els.ruleBrandStatusField) els.ruleBrandStatusField.hidden = kind !== 'brandRules';
  els.ruleBrandScopeRows?.forEach((row) => {
    row.hidden = kind !== 'brandRules';
  });

  els.ruleDefaultList.innerHTML = defaults.length
    ? defaults.map((rule) => renderDefaultComplianceRule(rule, disabledIds.has(rule.id))).join('')
    : '<div class="empty-copy">暂无默认规则</div>';
  els.ruleCustomList.innerHTML = customs.length
    ? customs.map((rule) => renderCustomComplianceRule(rule)).join('')
    : '<div class="empty-copy">暂无自定义规则</div>';
  renderComplianceRuleSnapshots();

  els.ruleSaveBtn.disabled = false;
  els.ruleResetBtn.disabled = !summary.defaultSensitiveCount && !summary.defaultBrandCount && !summary.customSensitiveCount && !summary.customBrandCount;
  els.ruleImportBtn.disabled = false;
  els.ruleExportBtn.disabled = false;
  els.ruleAddBtn.disabled = false;
}

function getComplianceRuleSummary() {
  const rules = state.complianceRules || { defaults: { sensitiveTerms: [], brandRules: [] } };
  const draft = state.complianceRuleDraft || createEmptyComplianceRuleDraft();
  const disabledIds = new Set(draft.disabledDefaultRuleIds || []);
  const mergedSensitive = mergeLocalComplianceRuleList(
    'sensitiveTerms',
    rules.defaults?.sensitiveTerms || [],
    draft.customRules?.sensitiveTerms || [],
    disabledIds
  );
  const mergedBrand = mergeLocalComplianceRuleList(
    'brandRules',
    rules.defaults?.brandRules || [],
    draft.customRules?.brandRules || [],
    disabledIds
  );
  return {
    defaultSensitiveCount: rules.defaults?.sensitiveTerms?.length || 0,
    defaultBrandCount: rules.defaults?.brandRules?.length || 0,
    customSensitiveCount: draft.customRules?.sensitiveTerms?.length || 0,
    customBrandCount: draft.customRules?.brandRules?.length || 0,
    activeSensitiveCount: mergedSensitive.length,
    activeBrandCount: mergedBrand.length,
    activeCount: mergedSensitive.length + mergedBrand.length,
    disabledDefaultCount: draft.disabledDefaultRuleIds?.length || 0
  };
}

function mergeLocalComplianceRuleList(kind, defaultRules, customRules, disabledIds) {
  const merged = new Map();
  for (const rule of defaultRules || []) {
    if (disabledIds.has(rule.id)) continue;
    const normalized = normalizeLocalComplianceRule(rule, 'default', kind);
    if (!normalized) continue;
    merged.set(normalizeComplianceRuleKey(normalized.term), normalized);
  }
  for (const rule of customRules || []) {
    const normalized = normalizeLocalComplianceRule(rule, 'custom', kind);
    if (!normalized) continue;
    merged.set(normalizeComplianceRuleKey(normalized.term), normalized);
  }
  return [...merged.values()].filter((rule) => rule.enabled !== false);
}

function normalizeComplianceRuleKey(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '');
}

function normalizeLocalComplianceRule(rule, source = 'custom', kindOverride = '') {
  const term = String(rule?.term || '').trim();
  if (!term) return null;
  const severity = ['low', 'medium', 'high'].includes(String(rule?.severity || '').toLowerCase())
    ? String(rule.severity).toLowerCase()
    : 'medium';
  const kind = String(rule?.kind || kindOverride || state.complianceRuleKind || 'sensitiveTerms');
  return {
    id: String(rule?.id || makeComplianceRuleId(source, term)),
    kind,
    source,
    term,
    severity,
    replacement: String(rule?.replacement || '').trim(),
    note: String(rule?.note || '').trim(),
    brandAuthorizationStatus: kind === 'brandRules'
      ? normalizeBrandAuthorizationStatus(rule?.brandAuthorizationStatus || rule?.authorizationStatus || rule?.brandStatus)
      : '',
    brandScope: kind === 'brandRules'
      ? normalizeBrandScopeInput(rule?.brandScope || rule?.authorizationScope || rule)
      : createEmptyBrandScope(),
    platforms: normalizeScopeInput(rule?.platforms || rule?.platform || ''),
    categories: normalizeScopeInput(rule?.categories || rule?.category || ''),
    enabled: rule?.enabled !== false
  };
}

function createEmptyBrandScope() {
  return {
    brands: [],
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

function normalizeBrandScopeInput(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : { brands: value };
  return {
    brands: normalizeScopeInput(source.brands || source.brandNames || source.brand || source.authorizedBrands || ''),
    platforms: normalizeScopeInput(source.platforms || source.platform || source.platformScope || ''),
    categories: normalizeScopeInput(source.categories || source.category || source.categoryScope || ''),
    channels: normalizeScopeInput(source.channels || source.channelScope || source.channel || source.authorizedChannels || ''),
    regions: normalizeScopeInput(source.regions || source.regionScope || source.region || source.authorizedRegions || ''),
    campaign: String(source.campaign || source.campaignScope || source.activity || '').trim(),
    startsAt: normalizeDateInput(source.startsAt || source.validFrom || source.effectiveAt || ''),
    expiresAt: normalizeDateInput(source.expiresAt || source.validUntil || source.expiredAt || ''),
    reference: String(source.reference || source.credentialRef || source.authorizationRef || '').trim(),
    reviewer: String(source.reviewer || source.owner || source.confirmedBy || '').trim(),
    note: String(source.note || source.description || source.scopeNote || '').trim()
  };
}

function normalizeDateInput(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toISOString().slice(0, 10);
}

function brandScopeSummary(scope = {}) {
  const normalized = normalizeBrandScopeInput(scope);
  return [
    normalized.brands.length ? `品牌：${normalized.brands.join('、')}` : '',
    normalized.channels.length ? `渠道：${normalized.channels.join('、')}` : '',
    normalized.regions.length ? `地区：${normalized.regions.join('、')}` : '',
    normalized.campaign ? `活动：${normalized.campaign}` : '',
    normalized.expiresAt ? `有效期至：${normalized.expiresAt}` : '',
    normalized.reference ? `凭证：${normalized.reference}` : ''
  ].filter(Boolean).join('；');
}

function normalizeBrandAuthorizationStatus(value) {
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

function brandAuthorizationStatusLabel(value) {
  const labels = {
    authorized: '已授权',
    pending_review: '待复核',
    forbidden: '不可用',
    risk: '需复核'
  };
  return labels[normalizeBrandAuthorizationStatus(value)] || '需复核';
}

function normalizeScopeInput(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(/[,\n|，、;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function makeComplianceRuleId(kind, term) {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 7);
  return `${kind}-${stamp}-${random}-${normalizeComplianceRuleKey(term).slice(0, 12)}`;
}

function renderDefaultComplianceRule(rule, disabled) {
  const status = state.complianceRuleKind === 'brandRules'
    ? `<span class="rule-auth-status auth-${escapeAttr(normalizeBrandAuthorizationStatus(rule.brandAuthorizationStatus))}">${escapeHtml(brandAuthorizationStatusLabel(rule.brandAuthorizationStatus))}</span>`
    : '';
  return `
    <article class="rule-item default ${disabled ? 'is-disabled' : ''}" data-rule-id="${escapeAttr(rule.id)}">
      <div class="rule-default-top">
        <label class="inline-check rule-toggle">
          <input type="checkbox" data-action="toggle-default" data-rule-id="${escapeAttr(rule.id)}" ${disabled ? '' : 'checked'} />
          <span>${disabled ? '禁用' : '启用'}</span>
        </label>
        <div class="rule-badge-row">
          ${status}
          <span class="rule-badge risk-${escapeAttr(rule.severity)}">${escapeHtml(riskLabel(rule.severity))}</span>
        </div>
      </div>
      <div class="rule-default-body">
        <strong>${escapeHtml(rule.term)}</strong>
        ${rule.replacement ? `<span>${escapeHtml(rule.replacement)}</span>` : ''}
        ${rule.note ? `<small>${escapeHtml(rule.note)}</small>` : ''}
      </div>
    </article>
  `;
}

function renderCustomComplianceRule(rule) {
  const enabled = rule.enabled !== false;
  const brandScope = normalizeBrandScopeInput(rule.brandScope || {});
  const scopeSummary = brandScopeSummary(brandScope);
  const authSelect = state.complianceRuleKind === 'brandRules'
    ? `
        <div class="rule-brand-scope">
          <select class="rule-input rule-auth-select" data-field="brandAuthorizationStatus" data-rule-id="${escapeAttr(rule.id)}">
            ${brandAuthorizationStatusOptions(rule.brandAuthorizationStatus)}
          </select>
          <input class="rule-input" type="text" data-field="brandScope.brands" data-rule-id="${escapeAttr(rule.id)}" value="${escapeAttr(brandScope.brands.join(','))}" placeholder="授权品牌" />
          <input class="rule-input" type="text" data-field="brandScope.channels" data-rule-id="${escapeAttr(rule.id)}" value="${escapeAttr(brandScope.channels.join(','))}" placeholder="授权渠道" />
          <input class="rule-input" type="text" data-field="brandScope.regions" data-rule-id="${escapeAttr(rule.id)}" value="${escapeAttr(brandScope.regions.join(','))}" placeholder="授权地区" />
          <input class="rule-input" type="date" data-field="brandScope.expiresAt" data-rule-id="${escapeAttr(rule.id)}" value="${escapeAttr(brandScope.expiresAt || '')}" title="有效期至" />
          <input class="rule-input" type="text" data-field="brandScope.campaign" data-rule-id="${escapeAttr(rule.id)}" value="${escapeAttr(brandScope.campaign || '')}" placeholder="授权活动" />
          <input class="rule-input" type="text" data-field="brandScope.reference" data-rule-id="${escapeAttr(rule.id)}" value="${escapeAttr(brandScope.reference || '')}" placeholder="凭证引用" />
          ${scopeSummary ? `<small>${escapeHtml(scopeSummary)}</small>` : ''}
        </div>
      `
    : '';
  return `
    <article class="rule-item custom ${enabled ? '' : 'is-disabled'}" data-rule-id="${escapeAttr(rule.id)}">
      <div class="rule-head">
        <input class="rule-input" type="text" data-field="term" data-rule-id="${escapeAttr(rule.id)}" value="${escapeAttr(rule.term)}" />
        <select class="rule-input" data-field="severity" data-rule-id="${escapeAttr(rule.id)}">
          <option value="low" ${rule.severity === 'low' ? 'selected' : ''}>低风险</option>
          <option value="medium" ${rule.severity === 'medium' ? 'selected' : ''}>中风险</option>
          <option value="high" ${rule.severity === 'high' ? 'selected' : ''}>高风险</option>
        </select>
        <label class="inline-check rule-toggle">
          <input type="checkbox" data-field="enabled" data-rule-id="${escapeAttr(rule.id)}" ${enabled ? 'checked' : ''} />
          <span>${enabled ? '启用' : '停用'}</span>
        </label>
        <button class="icon-button rule-remove" type="button" data-action="delete-custom" data-rule-id="${escapeAttr(rule.id)}" aria-label="删除规则" title="删除规则">×</button>
      </div>
      ${authSelect}
      <div class="rule-meta">
        <input class="rule-input" type="text" data-field="replacement" data-rule-id="${escapeAttr(rule.id)}" value="${escapeAttr(rule.replacement || '')}" placeholder="替换建议" />
        <input class="rule-input" type="text" data-field="note" data-rule-id="${escapeAttr(rule.id)}" value="${escapeAttr(rule.note || '')}" placeholder="备注" />
        <input class="rule-input" type="text" data-field="platforms" data-rule-id="${escapeAttr(rule.id)}" value="${escapeAttr((rule.platforms || []).join(','))}" placeholder="平台范围，可选" />
        <input class="rule-input" type="text" data-field="categories" data-rule-id="${escapeAttr(rule.id)}" value="${escapeAttr((rule.categories || []).join(','))}" placeholder="类目范围，可选" />
      </div>
    </article>
  `;
}

function brandAuthorizationStatusOptions(value) {
  const current = normalizeBrandAuthorizationStatus(value);
  return [
    ['risk', '需复核'],
    ['authorized', '已授权'],
    ['pending_review', '待复核'],
    ['forbidden', '不可用']
  ].map(([optionValue, label]) => (
    `<option value="${optionValue}" ${current === optionValue ? 'selected' : ''}>${label}</option>`
  )).join('');
}

function handleComplianceRuleDefaultChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.dataset.action !== 'toggle-default') return;
  const ruleId = target.dataset.ruleId;
  if (!ruleId || !state.complianceRuleDraft) return;
  const next = new Set(state.complianceRuleDraft.disabledDefaultRuleIds || []);
  if (target.checked) next.delete(ruleId);
  else next.add(ruleId);
  state.complianceRuleDraft.disabledDefaultRuleIds = [...next];
  state.complianceRuleDirty = true;
  const row = target.closest('.rule-item');
  if (row) row.classList.toggle('is-disabled', !target.checked);
  if (target.nextElementSibling) target.nextElementSibling.textContent = target.checked ? '启用' : '禁用';
  updateRuleLibraryState();
}

function handleComplianceRuleCustomInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
  const field = target.dataset.field;
  const ruleId = target.dataset.ruleId;
  if (!field || !ruleId || !state.complianceRuleDraft) return;
  const list = state.complianceRuleDraft.customRules?.[state.complianceRuleKind] || [];
  const rule = list.find((item) => item.id === ruleId);
  if (!rule) return;
  if (field === 'enabled') {
    rule.enabled = target.checked;
    const row = target.closest('.rule-item');
    if (row) row.classList.toggle('is-disabled', !target.checked);
    if (target.nextElementSibling) target.nextElementSibling.textContent = target.checked ? '启用' : '停用';
  } else if (field.startsWith('brandScope.')) {
    const scopeField = field.split('.')[1];
    rule.brandScope = normalizeBrandScopeInput(rule.brandScope || {});
    if (['brands', 'platforms', 'categories', 'channels', 'regions'].includes(scopeField)) {
      rule.brandScope[scopeField] = normalizeScopeInput(target.value);
    } else if (scopeField === 'startsAt' || scopeField === 'expiresAt') {
      rule.brandScope[scopeField] = normalizeDateInput(target.value);
    } else {
      rule.brandScope[scopeField] = target.value;
    }
  } else {
    rule[field] = field === 'platforms' || field === 'categories'
      ? normalizeScopeInput(target.value)
      : target.value;
  }
  state.complianceRuleDirty = true;
  updateRuleLibraryState();
}

function handleComplianceRuleCustomAction(event) {
  const button = event.target.closest('[data-action=\"delete-custom\"]');
  if (!button) return;
  const ruleId = button.dataset.ruleId;
  if (!ruleId || !state.complianceRuleDraft) return;
  const list = state.complianceRuleDraft.customRules?.[state.complianceRuleKind] || [];
  state.complianceRuleDraft.customRules[state.complianceRuleKind] = list.filter((item) => item.id !== ruleId);
  state.complianceRuleDirty = true;
  renderComplianceRules();
}

function addComplianceRuleFromForm() {
  if (!state.complianceRuleDraft) return;
  const term = els.ruleTermInput.value.trim();
  if (!term) {
    els.ruleTermInput.focus();
    return;
  }
  const kind = state.complianceRuleKind;
  const list = state.complianceRuleDraft.customRules[kind] || [];
  const normalizedTerm = normalizeComplianceRuleKey(term);
  const nextRule = {
    id: makeComplianceRuleId(kind, term),
    kind,
    source: 'custom',
    term,
    severity: els.ruleSeverityInput.value || 'medium',
    replacement: els.ruleReplacementInput.value.trim(),
    note: els.ruleNoteInput.value.trim(),
    brandAuthorizationStatus: kind === 'brandRules'
      ? normalizeBrandAuthorizationStatus(els.ruleBrandStatusInput?.value || 'risk')
      : '',
    brandScope: kind === 'brandRules'
      ? {
          brands: normalizeScopeInput(els.ruleBrandNamesInput?.value || ''),
          channels: normalizeScopeInput(els.ruleBrandChannelsInput?.value || ''),
          regions: normalizeScopeInput(els.ruleBrandRegionsInput?.value || ''),
          expiresAt: normalizeDateInput(els.ruleBrandExpiresInput?.value || ''),
          campaign: els.ruleBrandCampaignInput?.value.trim() || '',
          reference: els.ruleBrandReferenceInput?.value.trim() || ''
        }
      : createEmptyBrandScope(),
    platforms: normalizeScopeInput(els.rulePlatformInput?.value || ''),
    categories: normalizeScopeInput(els.ruleCategoryInput?.value || ''),
    enabled: true
  };
  const index = list.findIndex((item) => normalizeComplianceRuleKey(item.term) === normalizedTerm);
  if (index >= 0) {
    list[index] = {
      ...list[index],
      ...nextRule,
      id: list[index].id
    };
  } else {
    list.push(nextRule);
  }
  state.complianceRuleDirty = true;
  clearComplianceRuleForm();
  renderComplianceRules();
}

function clearComplianceRuleForm() {
  els.ruleTermInput.value = '';
  els.ruleSeverityInput.value = 'medium';
  if (els.ruleBrandStatusInput) els.ruleBrandStatusInput.value = 'risk';
  if (els.ruleBrandNamesInput) els.ruleBrandNamesInput.value = '';
  if (els.ruleBrandChannelsInput) els.ruleBrandChannelsInput.value = '';
  if (els.ruleBrandRegionsInput) els.ruleBrandRegionsInput.value = '';
  if (els.ruleBrandExpiresInput) els.ruleBrandExpiresInput.value = '';
  if (els.ruleBrandCampaignInput) els.ruleBrandCampaignInput.value = '';
  if (els.ruleBrandReferenceInput) els.ruleBrandReferenceInput.value = '';
  els.ruleReplacementInput.value = '';
  els.ruleNoteInput.value = '';
  if (els.rulePlatformInput) els.rulePlatformInput.value = '';
  if (els.ruleCategoryInput) els.ruleCategoryInput.value = '';
}

async function saveComplianceRules() {
  if (!state.complianceRuleDraft) return;
  setBusy(els.ruleSaveBtn, true);
  try {
    const payload = {
      disabledDefaultRuleIds: [...new Set(state.complianceRuleDraft.disabledDefaultRuleIds || [])],
      customRules: {
        sensitiveTerms: (state.complianceRuleDraft.customRules?.sensitiveTerms || []).map((rule) => normalizeLocalComplianceRule(rule, 'custom', 'sensitiveTerms')).filter(Boolean),
        brandRules: (state.complianceRuleDraft.customRules?.brandRules || []).map((rule) => normalizeLocalComplianceRule(rule, 'custom', 'brandRules')).filter(Boolean)
      }
    };
    const data = await api('/api/compliance-rules', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.complianceRules = data;
    state.complianceRuleDraft = cloneComplianceRuleDraft(data);
    state.complianceRuleDirty = false;
    renderComplianceRules();
    if (state.selected) {
      await auditCurrentPlan();
      renderAudit();
    }
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.ruleSaveBtn, false);
  }
}

async function resetComplianceRules() {
  if (!state.complianceRuleDraft) return;
  if (!window.confirm('恢复默认规则？')) return;
  setBusy(els.ruleResetBtn, true);
  try {
    const data = await api('/api/compliance-rules', {
      method: 'POST',
      body: JSON.stringify({ reset: true })
    });
    state.complianceRules = data;
    state.complianceRuleDraft = cloneComplianceRuleDraft(data);
    state.complianceRuleDirty = false;
    renderComplianceRules();
    if (state.selected) {
      await auditCurrentPlan();
      renderAudit();
    }
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.ruleResetBtn, false);
  }
}

async function exportComplianceRules() {
  setBusy(els.ruleExportBtn, true);
  try {
    const data = await api('/api/compliance-rules/export');
    downloadJson(data, `compliance-rules-${dateStamp()}.json`);
    els.sourceNote.textContent = '规则库已导出为 JSON 文件。';
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.ruleExportBtn, false);
  }
}

async function importComplianceRulesFromFile(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  setBusy(els.ruleImportBtn, true);
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const mode = window.confirm('是否覆盖当前自定义规则？\n确定：覆盖导入；取消：合并导入。') ? 'replace' : 'merge';
    const preview = await api('/api/compliance-rules/preview-import', {
      method: 'POST',
      body: JSON.stringify({
        mode,
        rules: payload
      })
    });
    renderComplianceRuleImportPreview(preview);
    const totalChanges = countComplianceRuleImportChanges(preview);
    const confirmText = totalChanges
      ? `导入预览已生成，本次将产生 ${totalChanges} 项变化。是否继续${mode === 'replace' ? '覆盖' : '合并'}导入？`
      : `导入预览未发现规则语义变化。是否仍继续${mode === 'replace' ? '覆盖' : '合并'}导入？`;
    if (!window.confirm(confirmText)) {
      els.sourceNote.textContent = '已取消规则导入，当前规则库未改变。';
      return;
    }
    const data = await api('/api/compliance-rules/import', {
      method: 'POST',
      body: JSON.stringify({
        mode,
        rules: payload
      })
    });
    state.complianceRules = data;
    state.complianceRuleDraft = cloneComplianceRuleDraft(data);
    state.complianceRuleDirty = false;
    renderComplianceRules();
    if (state.selected) {
      await auditCurrentPlan();
      renderAudit();
    }
    els.sourceNote.textContent = `规则库已${mode === 'replace' ? '覆盖' : '合并'}导入，当前生效 ${data.summary?.activeCount || 0} 条。`;
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.ruleImportBtn, false);
  }
}

function renderComplianceRuleImportPreview(preview) {
  if (!els.ruleImportPreview) return;
  const summary = preview?.diff?.summary || {};
  const modeLabel = preview?.mode === 'replace' ? '覆盖导入' : '合并导入';
  const items = [
    ['新增', summary.added || 0],
    ['覆盖', summary.overwritten || 0],
    ['范围变化', summary.scopeChanged || 0],
    ['授权变化', summary.authorizationChanged || 0],
    ['授权范围', summary.brandScopeChanged || 0],
    ['覆盖移除', summary.removedByReplace || 0],
    ['默认禁用变化', (summary.disabledDefaultAdded || 0) + (summary.disabledDefaultRemoved || 0)]
  ];
  const detailRows = [
    ...formatRuleDiffRows(preview?.diff?.byKind?.sensitiveTerms, '敏感词'),
    ...formatRuleDiffRows(preview?.diff?.byKind?.brandRules, '品牌词')
  ].slice(0, 8);
  els.ruleImportPreview.hidden = false;
  els.ruleImportPreview.innerHTML = `
    <div class="rule-preview-head">
      <strong>${escapeHtml(modeLabel)}预览</strong>
      <span>v${escapeHtml(preview?.currentVersion || 1)} → v${escapeHtml(preview?.nextVersion || '')}</span>
    </div>
    <div class="rule-preview-grid">
      ${items.map(([label, count]) => `
        <span>
          <em>${escapeHtml(count)}</em>
          ${escapeHtml(label)}
        </span>
      `).join('')}
    </div>
    ${detailRows.length
      ? `<div class="rule-preview-list">${detailRows.map((item) => `<small>${escapeHtml(item)}</small>`).join('')}</div>`
      : '<small class="rule-preview-empty">未发现新增、覆盖、范围或授权状态变化。</small>'}
  `;
}

function formatRuleDiffRows(diff = {}, label = '') {
  const rows = [];
  for (const rule of diff.added || []) rows.push(`${label}新增：${rule.term}${formatRuleDiffSuffix(rule)}`);
  for (const item of diff.overwritten || []) rows.push(`${label}覆盖：${item.before?.term || item.after?.term}${formatRuleChangeDetail(item)}`);
  for (const item of diff.scopeChanged || []) rows.push(`${label}平台/类目变化：${item.before?.term || item.after?.term}${formatRuleScopeChange(item)}`);
  for (const item of diff.authorizationChanged || []) {
    rows.push(`${label}授权变化：${item.before?.term || item.after?.term}（${brandAuthorizationStatusLabel(item.before?.brandAuthorizationStatus)} → ${brandAuthorizationStatusLabel(item.after?.brandAuthorizationStatus)}）`);
  }
  for (const item of diff.brandScopeChanged || []) {
    rows.push(`${label}授权范围变化：${item.before?.term || item.after?.term}${formatBrandScopeChange(item)}`);
  }
  for (const rule of diff.removedByReplace || []) rows.push(`${label}覆盖移除：${rule.term}`);
  return rows;
}

function formatRuleDiffSuffix(rule = {}) {
  const parts = [
    rule.severity ? riskLabel(rule.severity) : '',
    rule.brandAuthorizationStatus ? brandAuthorizationStatusLabel(rule.brandAuthorizationStatus) : '',
    rule.brandScopeSummary || ''
  ].filter(Boolean);
  return parts.length ? `（${parts.join(' / ')}）` : '';
}

function formatRuleChangeDetail(item = {}) {
  const before = item.before || {};
  const after = item.after || {};
  const changes = [];
  if (before.severity !== after.severity) changes.push(`${riskLabel(before.severity)}→${riskLabel(after.severity)}`);
  if ((before.replacement || '') !== (after.replacement || '')) changes.push(`替换：${before.replacement || '空'}→${after.replacement || '空'}`);
  if ((before.note || '') !== (after.note || '')) changes.push('备注变化');
  return changes.length ? `（${changes.join('；')}）` : '';
}

function formatRuleScopeChange(item = {}) {
  const before = item.before || {};
  const after = item.after || {};
  const beforeScope = [
    before.platforms?.length ? `平台 ${before.platforms.join(',')}` : '',
    before.categories?.length ? `类目 ${before.categories.join(',')}` : ''
  ].filter(Boolean).join(' / ') || '全局';
  const afterScope = [
    after.platforms?.length ? `平台 ${after.platforms.join(',')}` : '',
    after.categories?.length ? `类目 ${after.categories.join(',')}` : ''
  ].filter(Boolean).join(' / ') || '全局';
  return `（${beforeScope} → ${afterScope}）`;
}

function formatBrandScopeChange(item = {}) {
  const before = item.before?.brandScopeSummary || '未设置';
  const after = item.after?.brandScopeSummary || '未设置';
  return `（${before} → ${after}）`;
}

function countComplianceRuleImportChanges(preview) {
  const summary = preview?.diff?.summary || {};
  return [
    'added',
    'overwritten',
    'scopeChanged',
    'authorizationChanged',
    'brandScopeChanged',
    'removedByReplace',
    'disabledDefaultAdded',
    'disabledDefaultRemoved'
  ].reduce((total, key) => total + Number(summary[key] || 0), 0);
}

function renderComplianceRuleSnapshots() {
  if (!els.ruleSnapshotList) return;
  const snapshots = Array.isArray(state.complianceRules?.snapshots)
    ? [...state.complianceRules.snapshots].reverse()
    : [];
  els.ruleSnapshotList.innerHTML = snapshots.length
    ? snapshots.map((snapshot) => renderComplianceRuleSnapshot(snapshot)).join('')
    : '<div class="empty-copy">暂无版本快照；保存、导入、重置或回滚前会自动生成。</div>';
}

function renderComplianceRuleSnapshot(snapshot = {}) {
  const summary = snapshot.summary || {};
  return `
    <article class="rule-snapshot" data-version="${escapeAttr(snapshot.version)}">
      <div>
        <strong>v${escapeHtml(snapshot.version || '')}</strong>
        <span>${escapeHtml(snapshot.note || '规则快照')}</span>
        <small>${escapeHtml(formatSnapshotTime(snapshot.at))}</small>
      </div>
      <em>自定义 ${Number(summary.customSensitiveCount || 0) + Number(summary.customBrandCount || 0)} / 禁用 ${summary.disabledDefaultCount || 0}</em>
      <button class="text-button ghost" type="button" data-action="rollback-rule" data-version="${escapeAttr(snapshot.version)}">回滚</button>
    </article>
  `;
}

function formatSnapshotTime(value) {
  if (!value) return '时间未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN', { hour12: false });
}

async function handleComplianceRuleSnapshotAction(event) {
  const button = event.target.closest('[data-action="rollback-rule"]');
  if (!button) return;
  const version = button.dataset.version;
  if (!version) return;
  if (!window.confirm(`回滚到规则库版本 v${version}？当前状态会先保存为快照。`)) return;
  setBusy(button, true);
  try {
    const data = await api('/api/compliance-rules/rollback', {
      method: 'POST',
      body: JSON.stringify({ version })
    });
    state.complianceRules = data;
    state.complianceRuleDraft = cloneComplianceRuleDraft(data);
    state.complianceRuleDirty = false;
    if (els.ruleImportPreview) {
      els.ruleImportPreview.hidden = true;
      els.ruleImportPreview.innerHTML = '';
    }
    renderComplianceRules();
    if (state.selected) {
      await auditCurrentPlan();
      renderAudit();
    }
    els.sourceNote.textContent = `规则库已回滚到快照 v${version}，当前版本 v${data.version}。`;
  } catch (error) {
    showError(error);
  } finally {
    setBusy(button, false);
  }
}

function updateRuleLibraryState() {
  if (!els.ruleLibraryState) return;
  if (!state.complianceRules || !state.complianceRuleDraft) {
    els.ruleLibraryState.textContent = '未加载';
    els.ruleLibraryState.title = '';
    els.ruleLibraryState.classList.remove('is-dirty');
    return;
  }
  const summary = getComplianceRuleSummary();
  els.ruleLibraryState.textContent = state.complianceRuleDirty ? '未保存' : `生效 ${summary.activeCount}`;
  els.ruleLibraryState.title = `默认 ${summary.defaultSensitiveCount + summary.defaultBrandCount} / 自定义 ${summary.customSensitiveCount + summary.customBrandCount} / 禁用 ${summary.disabledDefaultCount}`;
  els.ruleLibraryState.classList.toggle('is-dirty', state.complianceRuleDirty);
}

async function loadProducts() {
  setBusy(els.refreshBtn, true);
  try {
    const params = new URLSearchParams({
      source: els.source.value,
      platform: state.platform,
      keyword: els.keyword.value.trim(),
      limit: els.limit.value || '10'
    });
    const data = await api(`/api/products?${params.toString()}`);
    state.products = data.products;
    state.selected = state.products[0] || null;
    resetBatchSelection();
    state.analysis = null;
    state.ad = null;
    state.audit = null;
    state.creativeQuality = null;
    state.sourceMode = els.source.value;
    renderProducts();
    renderSelected();
    renderAnalysis();
    renderAudit();
    renderOutput();
    renderAuthorizationCredentials();
    renderMaterialRights();
    updateSourceNote();
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.refreshBtn, false);
  }
}

async function importCsv() {
  const csv = els.csvInput.value.trim();
  if (!csv) {
    els.sourceNote.textContent = 'CSV 为空，请粘贴商品导出数据后再导入。';
    return;
  }
  setBusy(els.importBtn, true);
  try {
    const data = await api('/api/import/csv', {
      method: 'POST',
      body: JSON.stringify({ csv })
    });
    state.products = data.products;
    state.selected = state.products[0] || null;
    resetBatchSelection();
    state.analysis = null;
    state.ad = null;
    state.audit = null;
    state.creativeQuality = null;
    state.sourceMode = 'csv';
    renderProducts();
    renderSelected();
    renderAnalysis();
    renderAudit();
    renderOutput();
    renderAuthorizationCredentials();
    renderMaterialRights();
    els.sourceNote.textContent = `已导入 ${data.count} 个商品，榜单按销量排序。`;
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.importBtn, false);
  }
}

async function importSalesHistory() {
  const content = els.csvInput.value.trim();
  if (!content) {
    els.sourceNote.textContent = '请粘贴历史销量 CSV 或授权 API 返回的 JSON 后再导入。';
    return;
  }
  if (!state.products.length) {
    els.sourceNote.textContent = '请先导入商品列表，再合并历史销量。';
    return;
  }
  setBusy(els.importHistoryBtn, true);
  try {
    const payload = parseHistoryInputPayload(content);
    const data = await api('/api/import/sales-history', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        source: 'authorized_history',
        products: state.products
      })
    });
    state.products = data.products || state.products;
    state.selected = state.products.find((product) => product.id === state.selected?.id) || state.products[0] || null;
    renderProducts();
    renderSelected();
    const report = data.report || {};
    els.sourceNote.textContent = report.message || `已处理 ${report.inputRows || 0} 行历史销量。`;
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.importHistoryBtn, false);
  }
}

function parseHistoryInputPayload(value) {
  const text = String(value || '').trim();
  if (/^[\[{]/.test(text)) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? { history: parsed } : parsed;
    } catch {
      return { csv: text };
    }
  }
  return { csv: text };
}

async function importAuthorizedText() {
  const content = els.csvInput.value.trim();
  if (!content) {
    els.sourceNote.textContent = '内容为空，请粘贴你有权使用的商品列表文本、HTML 片段或后台导出内容。';
    return;
  }
  setBusy(els.parseTextBtn, true);
  try {
    const data = await api('/api/import/authorized-text', {
      method: 'POST',
      body: JSON.stringify({
        content,
        platform: state.platform === 'all' ? 'taobao' : state.platform
      })
    });
    state.products = data.products;
    state.selected = state.products[0] || null;
    resetBatchSelection();
    state.analysis = null;
    state.ad = null;
    state.audit = null;
    state.creativeQuality = null;
    state.sourceMode = 'authorized_text';
    renderProducts();
    renderSelected();
    renderAnalysis();
    renderAudit();
    renderOutput();
    renderAuthorizationCredentials();
    renderMaterialRights();
    const warningText = data.warnings?.length ? ` ${data.warnings.join(' ')}` : '';
    els.sourceNote.textContent = `已解析 ${data.count} 个商品。${warningText}`;
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.parseTextBtn, false);
  }
}

async function loadExtensionProducts() {
  setBusy(els.loadExtensionBtn, true);
  try {
    const data = await api('/api/extension/latest');
    if (!data.products?.length) {
      els.sourceNote.textContent = '还没有收到 Edge 插件数据。请在目标商品页面点击插件里的“发送到工作台”。';
      return;
    }
    applyImportedProducts(data.products, {
      sourceMode: 'edge_extension',
      note: `已读取 Edge 插件最近发送的 ${data.count} 个商品。来源页面：${shortenText(data.sourceUrl || '当前浏览器页面', 96)}。`
    });
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.loadExtensionBtn, false);
  }
}

function applyImportedProducts(products, { sourceMode, note }) {
  state.products = products;
  state.selected = state.products[0] || null;
  resetBatchSelection();
  state.analysis = null;
  state.ad = null;
  state.audit = null;
  state.creativeQuality = null;
  state.sourceMode = sourceMode;
  renderProducts();
  renderSelected();
  renderAnalysis();
  renderAudit();
  renderOutput();
  renderAuthorizationCredentials();
  renderMaterialRights();
  els.sourceNote.textContent = note;
  if (sourceMode === 'edge_extension') {
    loadExtensionQualityReport();
  } else {
    renderExtensionQualityReport(null);
  }
}

async function loadExtensionQualityReport() {
  try {
    const data = await api('/api/extension/latest');
    renderExtensionQualityReport(data.qualityReport);
  } catch {
    renderExtensionQualityReport(null);
  }
}

function renderExtensionQualityReport(report) {
  if (!els.extensionQualityReport) return;
  if (!report || !report.recognizedProducts) {
    els.extensionQualityReport.hidden = true;
    els.extensionQualityReport.innerHTML = '';
    return;
  }
  const completeness = report.completeness || {};
  const fields = Object.entries(completeness).map(([key, item]) => `
    <span><strong>${escapeHtml(item.label || key)}</strong>${Math.round(Number(item.rate || 0) * 100)}%</span>
  `).join('');
  const total = Number(report.candidateCards || report.recognizedProducts || 0);
  els.extensionQualityReport.hidden = false;
  els.extensionQualityReport.innerHTML = `
    <div class="quality-head">
      <strong>插件识别质量</strong>
      <em>${Number(report.recognizedProducts || 0)}/${total}</em>
    </div>
    <div class="quality-grid">${fields}</div>
    ${(report.recommendations || []).length ? `<ul>${report.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
  `;
}

async function runAnalysis() {
  if (!state.selected) return;
  switchOpsPanel('insight');
  renderAnalysisPending('正在分析素材', '正在提取素材结构、卖点角度和 AI 洞察。');
  const activity = startActivity('正在分析素材', '正在提取素材结构、卖点角度和 AI 洞察。');
  setBusy(els.analyzeBtn, true);
  try {
    const data = await api('/api/analyze-media', {
      method: 'POST',
      body: JSON.stringify({ product: state.selected })
    });
    state.analysis = data.analysis;
    state.audit = null;
    renderAnalysis();
    renderAudit();
    switchOpsPanel('insight');
    finishActivity(activity, '素材分析完成', '已更新到素材洞察面板。');
  } catch (error) {
    showError(error);
    renderAnalysis();
    failActivity(activity, '素材分析失败', error);
  } finally {
    setBusy(els.analyzeBtn, false);
  }
}

async function runVisualAnalysis() {
  if (!state.selected) return;
  switchOpsPanel('insight');
  if (!state.analysis) {
    renderAnalysisPending('正在进行视觉分析', '正在检查图片/视频中的水印、品牌标识和画面文字。');
  }
  const activity = startActivity('正在进行视觉分析', '正在检查图片/视频中的水印、品牌标识和画面文字。');
  setBusy(els.visualBtn, true);
  try {
    const data = await api('/api/analyze-visual-risk', {
      method: 'POST',
      body: JSON.stringify({ product: state.selected })
    });
    state.analysis = state.analysis
      ? { ...state.analysis, visualRisk: data.visualRisk || data.analysis?.visualRisk }
      : data.analysis;
    state.audit = null;
    renderAnalysis();
    renderAudit();
    switchOpsPanel('insight');
    finishActivity(activity, '视觉分析完成', '视觉风险结果已更新。');
  } catch (error) {
    showError(error);
    renderAnalysis();
    failActivity(activity, '视觉分析失败', error);
  } finally {
    setBusy(els.visualBtn, false);
  }
}

async function generateAd() {
  if (!state.selected) return;
  const needsAnalysis = !state.analysis;
  const activity = startActivity(
    needsAnalysis ? '正在分析并生成方案' : '正在生成广告方案',
    needsAnalysis ? '先完成素材分析，再生成原创文案和分镜。' : '正在生成原创口播、字幕和版式建议。'
  );
  if (needsAnalysis) {
    switchOpsPanel('insight');
    renderAnalysisPending('正在分析素材', '生成前先补齐素材结构和 AI 洞察。');
  }
  setBusy(els.generateBtn, true);
  try {
    if (!state.analysis) {
      const data = await api('/api/analyze-media', {
        method: 'POST',
        body: JSON.stringify({ product: state.selected })
      });
      state.analysis = data.analysis;
    }
    const data = await api('/api/generate-ad', {
      method: 'POST',
      body: JSON.stringify({
        product: state.selected,
        mediaAnalysis: state.analysis,
        options: {
          format: els.format.value,
          tone: els.tone.value,
          duration: 20
        }
      })
    });
    state.ad = data.ad;
    state.creativeQuality = data.quality || data.ad?.quality || null;
    await auditCurrentPlan();
    renderAnalysis();
    renderAudit();
    renderOutput();
    switchOpsPanel('copy');
    finishActivity(activity, '广告方案已生成', '已切换到文案优化面板。');
  } catch (error) {
    showError(error);
    renderAnalysis();
    failActivity(activity, '生成失败', error);
  } finally {
    setBusy(els.generateBtn, false);
  }
}

async function runAudit() {
  if (!state.selected) return;
  const needsAnalysis = !state.analysis;
  const activity = startActivity(
    needsAnalysis ? '正在分析并审核' : '正在合规审核',
    needsAnalysis ? '先补齐素材分析，再检查敏感词、品牌和广告法风险。' : '正在检查敏感词、品牌和广告法风险。'
  );
  if (needsAnalysis) {
    switchOpsPanel('insight');
    renderAnalysisPending('正在分析素材', '审核前先补齐素材结构和 AI 洞察。');
  } else {
    switchOpsPanel('delivery');
    renderAuditPending('正在合规审核', '正在检查敏感词、品牌和广告法风险。');
  }
  setBusy(els.auditBtn, true);
  try {
    if (!state.analysis) {
      const data = await api('/api/analyze-media', {
        method: 'POST',
        body: JSON.stringify({ product: state.selected })
      });
      state.analysis = data.analysis;
      renderAnalysis();
    }
    switchOpsPanel('delivery');
    renderAuditPending('正在合规审核', '正在检查敏感词、品牌和广告法风险。');
    await auditCurrentPlan();
    renderAudit();
    finishActivity(activity, '合规审核完成', '审核结果已更新。');
  } catch (error) {
    showError(error);
    renderAnalysis();
    renderAudit();
    failActivity(activity, '合规审核失败', error);
  } finally {
    setBusy(els.auditBtn, false);
  }
}

async function auditCurrentPlan() {
  const data = await api('/api/audit-compliance', {
    method: 'POST',
    body: JSON.stringify({
      product: state.selected,
      mediaAnalysis: state.analysis,
      ad: state.ad,
      source: state.sourceMode || els.source.value
    })
  });
  state.audit = data.audit;
  await loadAuditRecords();
  return data.audit;
}

async function loadAuthorizationCredentials() {
  if (!els.credentialHistory) return;
  try {
    const data = await api('/api/authorization-credentials?limit=12');
    state.authorizationCredentials = data.credentials || [];
    renderAuthorizationCredentials();
  } catch (error) {
    state.authorizationCredentials = [];
    renderAuthorizationCredentials(error);
  }
}

async function addAuthorizationCredential() {
  if (!state.selected) {
    els.sourceNote.textContent = '请先选择商品，再登记授权凭证。';
    return;
  }
  const title = els.credentialTitle.value.trim();
  if (!title) {
    els.credentialTitle.focus();
    return;
  }
  setBusy(els.credentialAddBtn, true);
  try {
    const productRef = {
      id: state.selected.id,
      title: state.selected.title
    };
    const data = await api('/api/authorization-credentials', {
      method: 'POST',
      body: JSON.stringify({
        title,
        sourceType: els.credentialType.value,
        platform: state.selected.platform || state.sourceMode || '',
        category: state.selected.category || '',
        owner: state.selected.shop || '',
        reference: els.credentialReference.value.trim(),
        reviewer: els.credentialReviewer.value.trim(),
        capturedAt: new Date().toISOString(),
        products: [productRef],
        note: `关联商品：${state.selected.title}`
      })
    });
    state.authorizationCredentials = data.credentials || [data.credential, ...state.authorizationCredentials].filter(Boolean);
    clearCredentialForm();
    renderAuthorizationCredentials();
    if (state.audit) {
      await auditCurrentPlan();
      renderAudit();
    }
    els.sourceNote.textContent = '授权凭证已登记到本机台账。';
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.credentialAddBtn, false);
  }
}

async function exportAuthorizationCredentials() {
  setBusy(els.credentialExportBtn, true);
  try {
    const data = await api('/api/authorization-credentials/export');
    downloadJson(data, `authorization-credentials-${dateStamp()}.json`);
    els.sourceNote.textContent = '授权凭证台账已导出为 JSON 文件。';
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.credentialExportBtn, false);
  }
}

async function loadMaterialRights() {
  if (!els.materialRightHistory) return;
  try {
    const data = await api('/api/material-rights?limit=12');
    state.materialRights = data.records || [];
    renderMaterialRights();
  } catch (error) {
    state.materialRights = [];
    renderMaterialRights(error);
  }
}

async function addMaterialRight() {
  if (!state.selected) {
    els.sourceNote.textContent = '请先选择商品，再登记素材版权记录。';
    return;
  }
  const title = els.materialRightTitle.value.trim();
  if (!title) {
    els.materialRightTitle.focus();
    return;
  }
  setBusy(els.materialRightAddBtn, true);
  try {
    const productRef = {
      id: state.selected.id,
      title: state.selected.title
    };
    const data = await api('/api/material-rights', {
      method: 'POST',
      body: JSON.stringify({
        title,
        assetType: els.materialRightType.value,
        sourceType: els.materialRightSource.value,
        licenseScope: els.materialRightScope.value,
        platform: state.selected.platform || state.sourceMode || '',
        category: state.selected.category || '',
        owner: state.selected.shop || '',
        reference: els.materialRightReference.value.trim(),
        attachmentRefs: splitClientList(els.materialRightAttachments?.value || ''),
        expiresAt: els.materialRightExpiresAt?.value || '',
        brandScope: {
          brands: splitClientList(els.materialRightBrandNames?.value || ''),
          status: els.materialRightBrandStatus?.value || 'not_applicable'
        },
        channelScope: splitClientList(els.materialRightChannels?.value || ''),
        regionScope: splitClientList(els.materialRightRegions?.value || ''),
        campaignScope: els.materialRightCampaign?.value.trim() || '',
        reviewer: els.materialRightReviewer.value.trim(),
        capturedAt: new Date().toISOString(),
        products: [productRef],
        note: `关联商品：${state.selected.title}`
      })
    });
    state.materialRights = data.records || [data.record, ...state.materialRights].filter(Boolean);
    clearMaterialRightForm();
    renderMaterialRights();
    if (state.audit) {
      await auditCurrentPlan();
      renderAudit();
    }
    els.sourceNote.textContent = '素材版权记录已登记到本机台账。';
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.materialRightAddBtn, false);
  }
}

async function exportMaterialRights() {
  setBusy(els.materialRightExportBtn, true);
  try {
    const data = await api('/api/material-rights/export');
    downloadJson(data, `material-rights-${dateStamp()}.json`);
    els.sourceNote.textContent = '素材版权台账已导出为 JSON 文件。';
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.materialRightExportBtn, false);
  }
}

function clearCredentialForm() {
  els.credentialTitle.value = '';
  els.credentialReference.value = '';
  els.credentialReviewer.value = '';
  els.credentialType.value = 'merchant_export';
}

function clearMaterialRightForm() {
  els.materialRightTitle.value = '';
  els.materialRightReference.value = '';
  if (els.materialRightAttachments) els.materialRightAttachments.value = '';
  if (els.materialRightExpiresAt) els.materialRightExpiresAt.value = '';
  if (els.materialRightBrandNames) els.materialRightBrandNames.value = '';
  if (els.materialRightBrandStatus) els.materialRightBrandStatus.value = 'not_applicable';
  if (els.materialRightChannels) els.materialRightChannels.value = '';
  if (els.materialRightRegions) els.materialRightRegions.value = '';
  if (els.materialRightCampaign) els.materialRightCampaign.value = '';
  els.materialRightReviewer.value = '';
  els.materialRightType.value = 'image';
  els.materialRightSource.value = 'self_produced';
  els.materialRightScope.value = 'ecommerce_ads';
}

async function loadAuditRecords() {
  if (!els.auditHistory) return;
  try {
    const data = await api('/api/compliance-audits?limit=12');
    state.auditRecords = data.records || [];
    renderAuditHistory();
  } catch (error) {
    state.auditRecords = [];
    renderAuditHistory(error);
  }
}

async function exportAuditRecords() {
  setBusy(els.auditExportBtn, true);
  try {
    const data = await api('/api/compliance-audits/export');
    downloadJson(data, `compliance-audit-records-${dateStamp()}.json`);
    els.sourceNote.textContent = '审核留痕已导出为 JSON 文件。';
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.auditExportBtn, false);
  }
}

async function exportPlan() {
  if (!state.selected || !state.ad) return;
  setBusy(els.exportBtn, true);
  try {
    if (!state.audit) await auditCurrentPlan();
    const data = await api('/api/export-plan', {
      method: 'POST',
      body: JSON.stringify({
        product: state.selected,
        analysis: state.analysis,
        ad: state.ad,
        quality: state.creativeQuality || state.ad?.quality || null,
        audit: state.audit,
        exportedAt: new Date().toISOString()
      })
    });
    const files = (data.files || []).map((item) => item.filename).filter(Boolean).join('、');
    els.sourceNote.textContent = data.directory
      ? `已导出专业交付包：${data.directory}${files ? `；包含 ${files}` : ''}`
      : `已导出：${data.filepath}`;
  } catch (error) {
    showError(error);
  } finally {
    setBusy(els.exportBtn, false);
  }
}

function switchOpsPanel(panelName) {
  if (!panelName) return;
  els.opsTabs.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.opsTab === panelName);
  });
  els.opsPanels.forEach((panel) => {
    const isActive = panel.dataset.opsPanel === panelName;
    panel.classList.toggle('is-active', isActive);
    panel.hidden = !isActive;
  });
  const relatedNav = els.railNavLinks.find((link) => link.dataset.opsNav === panelName);
  if (relatedNav) setActiveRailLink(relatedNav);
}

function resetBatchSelection() {
  state.batchSelectedIds = new Set(state.selected ? [state.selected.id] : []);
}

function pruneBatchSelection() {
  const availableIds = new Set(state.products.map((product) => product.id));
  state.batchSelectedIds = new Set([...state.batchSelectedIds].filter((id) => availableIds.has(id)));
}

function toggleBatchSelection(productId) {
  if (state.batchSelectedIds.has(productId)) {
    state.batchSelectedIds.delete(productId);
  } else {
    state.batchSelectedIds.add(productId);
  }
  renderProducts();
  renderBatchPanel();
}

function selectAllBatchProducts() {
  state.batchSelectedIds = new Set(state.products.map((product) => product.id));
  renderProducts();
  renderBatchPanel();
}

function clearBatchSelection() {
  state.batchSelectedIds = new Set();
  renderProducts();
  renderBatchPanel();
}

function getBatchSelectedProducts() {
  return state.products.filter((product) => state.batchSelectedIds.has(product.id));
}

function renderBatchSelection() {
  pruneBatchSelection();
  const selectedCount = state.products.filter((product) => state.batchSelectedIds.has(product.id)).length;
  const total = state.products.length;
  const queue = state.batchQueue || {};
  const maxItems = Number(queue.maxItemsPerJob || 0);
  const selectedTooMany = Boolean(maxItems && selectedCount > maxItems);
  const queueFull = isBatchQueueFull(selectedCount);
  els.batchSelectionStatus.textContent = total ? `已选 ${selectedCount}/${total}` : '无商品';
  els.batchSelectAllBtn.disabled = !total;
  els.batchClearBtn.disabled = !selectedCount;
  els.batchGenerateBtn.disabled = !selectedCount || selectedTooMany || queueFull;
  els.batchAuditBtn.disabled = !selectedCount || selectedTooMany || queueFull;
  const buttonTitle = selectedTooMany
    ? `单次最多 ${maxItems} 件，请拆分提交`
    : queueFull
      ? '当前批量队列已接近上限，请稍后再提交'
      : '';
  els.batchGenerateBtn.title = buttonTitle;
  els.batchAuditBtn.title = buttonTitle;
  renderBatchQueueState();
}

async function runBatchGeneration() {
  await createBatchJob('generate', els.batchGenerateBtn);
}

async function runBatchAudit() {
  await createBatchJob('audit', els.batchAuditBtn);
}

async function createBatchJob(mode, button, sourceJobId = '') {
  const products = sourceJobId ? [] : getBatchSelectedProducts();
  if (!sourceJobId && !products.length) {
    els.sourceNote.textContent = '请先选择要批量处理的商品。';
    return;
  }

  setBusy(button, true);
  try {
    const data = await api('/api/batch/jobs', {
      method: 'POST',
      body: JSON.stringify({
        mode,
        sourceJobId,
        source: sourceJobId ? '' : state.sourceMode || els.source.value,
        products,
        options: {
          format: els.format.value,
          tone: els.tone.value,
          duration: 20
        }
      })
    });
    state.activeBatchJobId = data.job?.id || state.activeBatchJobId;
    state.batchQueue = data.queue || state.batchQueue;
    els.sourceNote.textContent = `${data.job?.title || '批量任务'}已加入队列。`;
    await loadBatchJobs();
    startBatchPolling();
  } catch (error) {
    showError(error);
  } finally {
    setBusy(button, false);
  }
}

async function loadBatchJobs() {
  try {
    const params = new URLSearchParams({
      limit: '20',
      status: state.batchStatus || 'all',
      includeArchived: state.batchIncludeArchived ? '1' : '0'
    });
    if (state.batchQuery) params.set('q', state.batchQuery);
    const data = await api(`/api/batch/jobs?${params.toString()}`);
    state.batchJobs = data.jobs || [];
    state.batchQueue = data.queue || null;
    state.batchTotal = Number(data.total || state.batchJobs.length || 0);
    state.batchActiveCount = Number(data.activeCount || data.queue?.activeCount || 0);
    if (!state.activeBatchJobId || !state.batchJobs.some((job) => job.id === state.activeBatchJobId)) {
      state.activeBatchJobId = state.batchJobs[0]?.id || '';
    }
    renderBatchPanel();
    if (state.batchActiveCount || state.batchJobs.some(isActiveBatchJob)) {
      startBatchPolling();
    } else {
      stopBatchPolling();
    }
  } catch (error) {
    els.batchHistory.innerHTML = `<div class="empty-copy">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
    stopBatchPolling();
  }
}

function startBatchPolling() {
  if (batchPollTimer) return;
  batchPollTimer = window.setInterval(loadBatchJobs, 2400);
}

function stopBatchPolling() {
  if (!batchPollTimer) return;
  window.clearInterval(batchPollTimer);
  batchPollTimer = null;
}

function isActiveBatchJob(job) {
  return job?.status === 'queued' || job?.status === 'running';
}

function isBatchQueueFull(nextItems = 0) {
  const queue = state.batchQueue;
  if (!queue) return false;
  const pendingJobs = Number(queue.pendingJobs || 0);
  const maxPendingJobs = Number(queue.maxPendingJobs || 0);
  const pendingItems = Number(queue.pendingItems || 0);
  const maxPendingItems = Number(queue.maxPendingItems || 0);
  const createRemaining = Number(queue.createRemaining ?? 1);
  if (maxPendingJobs && pendingJobs >= maxPendingJobs) return true;
  if (maxPendingItems && pendingItems + Number(nextItems || 0) > maxPendingItems) return true;
  return createRemaining <= 0;
}

function renderBatchPanel() {
  renderBatchSelection();
  renderBatchHistory();
}

function renderBatchQueueState() {
  renderBatchLimitNote();
  const activeCount = state.batchActiveCount || state.batchJobs.filter(isActiveBatchJob).length;
  if (activeCount) {
    els.batchQueueState.textContent = `${activeCount} 个进行中`;
    els.batchQueueState.className = 'batch-pill is-active';
    return;
  }
  const selectedCount = state.products.filter((product) => state.batchSelectedIds.has(product.id)).length;
  els.batchQueueState.textContent = selectedCount ? `已选 ${selectedCount} 件` : '待命';
  els.batchQueueState.className = 'batch-pill';
}

function renderBatchLimitNote() {
  if (!els.batchLimitNote) return;
  const queue = state.batchQueue;
  const selectedCount = state.products.filter((product) => state.batchSelectedIds.has(product.id)).length;
  if (!queue) {
    els.batchLimitNote.textContent = '队列保护：单任务 50 件以内，自动限制并发与创建频率。';
    els.batchLimitNote.className = 'batch-limit-note';
    return;
  }
  const pendingItems = Number(queue.pendingItems || 0);
  const maxPendingItems = Number(queue.maxPendingItems || 0);
  const pendingJobs = Number(queue.pendingJobs || 0);
  const maxPendingJobs = Number(queue.maxPendingJobs || 0);
  const maxItems = Number(queue.maxItemsPerJob || 0);
  const createRemaining = Number(queue.createRemaining ?? queue.maxCreatePerMinute ?? 0);
  const maxCreate = Number(queue.maxCreatePerMinute || 0);
  const selectedTooMany = Boolean(maxItems && selectedCount > maxItems);
  const pendingWouldOverflow = Boolean(maxPendingItems && selectedCount && pendingItems + selectedCount > maxPendingItems);
  const listText = state.batchTotal > state.batchJobs.length ? `；显示 ${state.batchJobs.length}/${state.batchTotal}` : '';
  const summary = [
    maxPendingItems ? `待处理 ${pendingItems}/${maxPendingItems} 件` : `待处理 ${pendingItems} 件`,
    maxPendingJobs ? `任务 ${pendingJobs}/${maxPendingJobs}` : `任务 ${pendingJobs}`,
    maxCreate ? `创建剩余 ${createRemaining}/${maxCreate}` : ''
  ].filter(Boolean).join('；');
  const warning = selectedTooMany
    ? `已选 ${selectedCount} 件，单次最多 ${maxItems} 件，请拆分提交。`
    : pendingWouldOverflow
      ? `已选 ${selectedCount} 件会超过队列上限，请等待任务完成后再提交。`
      : '';
  els.batchLimitNote.textContent = warning || `${summary}${listText}`;
  els.batchLimitNote.className = `batch-limit-note ${warning || isBatchQueueFull(0) ? 'is-warning' : ''}`;
}

function renderBatchHistory() {
  const jobs = state.batchJobs || [];
  if (!jobs.length) {
    els.batchHistory.innerHTML = '<div class="empty-copy">暂无批量任务</div>';
    els.batchDetail.innerHTML = '<div class="empty-copy">暂无任务结果</div>';
    return;
  }

  const selectedJob = jobs.find((job) => job.id === state.activeBatchJobId) || jobs[0];
  state.activeBatchJobId = selectedJob.id;
  els.batchHistory.innerHTML = jobs.map((job) => {
    const isActive = job.id === state.activeBatchJobId;
    const canReaudit = job.mode === 'generate' && job.status === 'completed' && (job.items || []).some((item) => item.ad);
    const canRetry = ['failed', 'cancelled', 'completed'].includes(job.status) && (job.items || []).some((item) => ['failed', 'cancelled'].includes(item.status));
    const canArchive = job.status !== 'archived' && !isActiveBatchJob(job);
    const canRestore = job.status === 'archived';
    return `
      <article class="batch-job-card ${isActive ? 'is-active' : ''} ${batchLevelClass(job)}">
        <button class="batch-job-main" type="button" data-id="${escapeAttr(job.id)}">
          <span class="batch-job-head">
            <strong>${escapeHtml(job.title)}</strong>
            <em>${escapeHtml(batchStatusLabel(job.status))}</em>
          </span>
          <span class="batch-job-meta">
            <span>${escapeHtml(batchProgressText(job))}</span>
            <span>${escapeHtml(formatBatchTime(job.createdAt))}</span>
          </span>
        </button>
        ${canReaudit ? `<button class="text-button ghost batch-reaudit" type="button" data-id="${escapeAttr(job.id)}">复审方案</button>` : ''}
        ${canRetry ? `<button class="text-button ghost batch-action" type="button" data-action="retry" data-id="${escapeAttr(job.id)}">重试</button>` : ''}
        ${canArchive ? `<button class="text-button ghost batch-action" type="button" data-action="archive" data-id="${escapeAttr(job.id)}">归档</button>` : ''}
        ${canRestore ? `<button class="text-button ghost batch-action" type="button" data-action="restore" data-id="${escapeAttr(job.id)}">恢复</button>` : ''}
      </article>
    `;
  }).join('');

  els.batchHistory.querySelectorAll('.batch-job-main').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeBatchJobId = button.dataset.id;
      renderBatchPanel();
    });
  });
  els.batchHistory.querySelectorAll('.batch-reaudit').forEach((button) => {
    button.addEventListener('click', () => {
      createBatchJob('audit', button, button.dataset.id);
    });
  });
  els.batchHistory.querySelectorAll('.batch-action').forEach((button) => {
    button.addEventListener('click', () => runBatchJobAction(button.dataset.id, button.dataset.action, button));
  });
  renderBatchDetail(selectedJob);
}

function renderBatchDetail(job) {
  if (!job) {
    els.batchDetail.innerHTML = '<div class="empty-copy">暂无任务结果</div>';
    return;
  }
  const items = job.items || [];
  els.batchDetail.innerHTML = `
    <div class="batch-detail-head">
      <div>
        <strong>${escapeHtml(job.title)}</strong>
        <span>${escapeHtml(batchProgressText(job))}</span>
      </div>
      <em>${escapeHtml(batchModeLabel(job))}</em>
    </div>
    ${isActiveBatchJob(job) ? `<div class="batch-detail-actions"><button class="text-button ghost batch-detail-action" type="button" data-action="cancel" data-id="${escapeAttr(job.id)}">取消任务</button></div>` : ''}
    ${renderBatchOutputFiles(job.output)}
    ${renderBatchItemFilters(job, items)}
    <div class="batch-item-list">
      ${filterBatchDetailItems(items).map(({ item, index }) => renderBatchItem(item, index)).join('') || '<div class="empty-copy compact">没有匹配的商品</div>'}
    </div>
  `;
  els.batchDetail.querySelectorAll('.batch-detail-action').forEach((button) => {
    button.addEventListener('click', () => runBatchJobAction(button.dataset.id, button.dataset.action, button));
  });
  bindBatchDetailFilters();
}

function renderBatchItemFilters(job, items) {
  const categories = Array.from(new Map(
    items
      .map((item) => item.error)
      .filter(Boolean)
      .map((error) => [error.category || 'system', error.categoryLabel || error.category || '系统异常'])
  ));
  const filteredCount = filterBatchDetailItems(items).length;
  return `
    <div class="batch-detail-filter" aria-label="batch item filters">
      <div class="field-group compact-input">
        <label for="batchDetailSearch">商品筛选</label>
        <input id="batchDetailSearch" type="search" placeholder="商品 / 错误 / 文件" value="${escapeAttr(state.batchDetailQuery)}" />
      </div>
      <div class="field-group compact-input">
        <label for="batchDetailStatus">明细状态</label>
        <select id="batchDetailStatus">
          ${[
            ['all', '全部'],
            ['queued', '待处理'],
            ['running', '处理中'],
            ['completed', '完成'],
            ['failed', '失败'],
            ['cancelled', '已取消']
          ].map(([value, label]) => `<option value="${escapeAttr(value)}" ${state.batchDetailStatus === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
        </select>
      </div>
      <div class="field-group compact-input">
        <label for="batchDetailCategory">错误分类</label>
        <select id="batchDetailCategory">
          <option value="all" ${state.batchDetailCategory === 'all' ? 'selected' : ''}>全部</option>
          ${categories.map(([value, label]) => `<option value="${escapeAttr(value)}" ${state.batchDetailCategory === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
        </select>
      </div>
      <span>${escapeHtml(String(filteredCount))}/${escapeHtml(String(items.length))}</span>
    </div>
  `;
}

function bindBatchDetailFilters() {
  const search = document.querySelector('#batchDetailSearch');
  const status = document.querySelector('#batchDetailStatus');
  const category = document.querySelector('#batchDetailCategory');
  search?.addEventListener('input', () => {
    state.batchDetailQuery = search.value.trim();
    renderBatchPanel();
  });
  status?.addEventListener('change', () => {
    state.batchDetailStatus = status.value || 'all';
    renderBatchPanel();
  });
  category?.addEventListener('change', () => {
    state.batchDetailCategory = category.value || 'all';
    renderBatchPanel();
  });
}

function filterBatchDetailItems(items = []) {
  const query = normalizeSearchText(state.batchDetailQuery);
  const status = state.batchDetailStatus || 'all';
  const category = state.batchDetailCategory || 'all';
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => status === 'all' || item.status === status)
    .filter(({ item }) => category === 'all' || item.error?.category === category)
    .filter(({ item }) => !query || normalizeSearchText([
      item.id,
      item.product?.id,
      item.product?.title,
      item.product?.shop,
      item.product?.category,
      item.status,
      item.error?.categoryLabel,
      item.error?.stageLabel,
      item.error?.code,
      item.error?.message,
      item.error?.hint,
      item.output?.filename,
      item.output?.filepath
    ].filter(Boolean).join(' ')).includes(query));
}

function renderBatchOutputFiles(output = {}) {
  const files = [
    ['汇总', output.summaryFile],
    ['报告', output.reportFile],
    ['总表', output.tableFile],
    ['清单', output.manifestFile]
  ].filter(([, filepath]) => filepath);
  if (!files.length) return '';
  return `
    <div class="batch-file-list">
      ${files.map(([label, filepath]) => `
        <p class="batch-file">
          <strong>${escapeHtml(label)}</strong>
          <span title="${escapeAttr(filepath)}">${escapeHtml(shortenText(filepath, 110))}</span>
        </p>
      `).join('')}
    </div>
  `;
}

async function runBatchJobAction(id, action, button) {
  if (!id || !action) return;
  setBusy(button, true);
  try {
    const data = await api(`/api/batch/jobs/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    state.activeBatchJobId = data.job?.id || state.activeBatchJobId;
    state.batchQueue = data.queue || state.batchQueue;
    await loadBatchJobs();
    if (action === 'cancel') els.sourceNote.textContent = '批量任务已取消，已排队商品不会继续处理。';
    if (action === 'retry') els.sourceNote.textContent = '已为失败或取消的商品创建重试任务。';
    if (action === 'archive') els.sourceNote.textContent = '批量任务已归档，默认列表不再显示。';
    if (action === 'restore') {
      els.sourceNote.textContent = '批量任务已恢复到常规列表。';
      if (state.batchStatus === 'archived') {
        state.batchStatus = 'all';
        els.batchStatusFilter.value = 'all';
        await loadBatchJobs();
      }
    }
  } catch (error) {
    showError(error);
  } finally {
    setBusy(button, false);
  }
}

function renderBatchItem(item, index) {
  const title = item.product?.title || `商品 ${index + 1}`;
  const summary = batchItemSummary(item);
  return `
    <div class="batch-item ${item.status}">
      <span class="batch-item-status">${escapeHtml(batchItemStatusLabel(item.status))}</span>
      <span class="batch-item-body">
        <strong>${escapeHtml(title)}</strong>
        <em>${escapeHtml(summary)}</em>
        ${renderBatchItemErrorMeta(item.error)}
        ${item.output?.filepath ? `<small>${escapeHtml(shortenText(item.output.filepath, 104))}</small>` : ''}
      </span>
    </div>
  `;
}

function renderBatchItemErrorMeta(error) {
  if (!error) return '';
  const tags = [
    error.categoryLabel || '',
    error.stageLabel || '',
    error.retryable ? '建议重试' : ''
  ].filter(Boolean);
  if (!tags.length) return '';
  return `<span class="batch-error-tags">${tags.map((tag) => `<i>${escapeHtml(tag)}</i>`).join('')}</span>`;
}

function batchItemSummary(item) {
  if (item.status === 'failed') {
    const prefix = item.error?.categoryLabel ? `${item.error.categoryLabel}：` : '';
    return `${prefix}${item.error?.message || '处理失败'}`;
  }
  if (item.audit) {
    return `审核 ${item.audit.score} 分 / ${riskLabel(item.audit.level)}`;
  }
  if (item.ad) return '方案已生成';
  return batchItemStatusLabel(item.status);
}

function batchModeLabel(job) {
  if (job.mode === 'generate') return '生成+审核';
  return job.sourceType === 'batch-job' ? '方案复审' : '商品审核';
}

function batchStatusLabel(status) {
  if (status === 'cancelled') return '已取消';
  if (status === 'archived') return '已归档';
  const labels = {
    queued: '排队',
    running: '处理中',
    completed: '已完成',
    failed: '失败'
  };
  return labels[status] || status;
}

function batchItemStatusLabel(status) {
  if (status === 'cancelled') return '已取消';
  const labels = {
    queued: '待处理',
    running: '处理中',
    completed: '完成',
    failed: '失败'
  };
  return labels[status] || status;
}

function batchProgressText(job) {
  const counts = job.counts || {};
  const total = Number(counts.total || job.items?.length || 0);
  const done = Number(counts.completed || 0) + Number(counts.failed || 0);
  const failed = Number(counts.failed || 0);
  return failed ? `${done}/${total} · ${failed} 失败` : `${done}/${total}`;
}

function batchLevelClass(job) {
  if (job.status === 'failed' || Number(job.counts?.failed || 0)) return 'has-warning';
  if (isActiveBatchJob(job)) return 'is-running';
  return 'is-ok';
}

function formatBatchTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function formatShortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function renderProducts() {
  els.productCount.textContent = state.products.length;
  pruneBatchSelection();
  renderBatchSelection();
  if (!state.products.length) {
    els.productList.innerHTML = '<div class="empty-copy">暂无商品</div>';
    return;
  }
  els.productList.innerHTML = state.products.map((product) => `
    <div class="product-card ${state.selected?.id === product.id ? 'is-active' : ''} ${state.batchSelectedIds.has(product.id) ? 'is-batch-selected' : ''}">
      <button class="product-select" type="button" data-id="${escapeAttr(product.id)}" aria-label="${state.batchSelectedIds.has(product.id) ? '移出批量选择' : '加入批量选择'}" aria-pressed="${state.batchSelectedIds.has(product.id) ? 'true' : 'false'}" title="${state.batchSelectedIds.has(product.id) ? '移出批量选择' : '加入批量选择'}">
        <span aria-hidden="true">${state.batchSelectedIds.has(product.id) ? '✓' : '+'}</span>
      </button>
      <button class="product-main" type="button" data-id="${escapeHtml(product.id)}" aria-pressed="${state.selected?.id === product.id ? 'true' : 'false'}">
        <img class="thumb" src="${escapeAttr(product.imageUrl || product.mediaUrl)}" alt="${escapeAttr(product.title)}" loading="lazy" />
        <span class="product-meta">
          <span class="card-head">
            <span class="rank">#${product.rank || ''}</span>
            <span class="platform-pill">${platformName(product.platform)}</span>
          </span>
          <span class="product-title">${escapeHtml(product.title)}</span>
          <span class="product-stats">
            <span>${formatPrice(product.price)}</span>
            <span>${formatSales(product.sales)}销量</span>
            <span>${product.score || 0}分</span>
          </span>
        </span>
      </button>
    </div>
  `).join('');
  els.productList.querySelectorAll('.product-main').forEach((button) => {
    button.addEventListener('click', () => {
      state.selected = state.products.find((product) => product.id === button.dataset.id);
      state.analysis = null;
      state.ad = null;
      state.audit = null;
      state.creativeQuality = null;
      renderProducts();
      renderSelected();
      renderAnalysis();
      renderAudit();
      renderOutput();
      renderAuthorizationCredentials();
      renderMaterialRights();
    });
  });
  els.productList.querySelectorAll('.product-select').forEach((button) => {
    button.addEventListener('click', () => {
      toggleBatchSelection(button.dataset.id);
    });
  });
}

function renderSelected() {
  const product = state.selected;
  if (!product) {
    renderEmpty();
    return;
  }
  els.selectedTitle.textContent = product.title;
  els.selectedScore.textContent = `${product.score || 0}`;
  els.selectedPrice.textContent = formatPrice(product.price);
  els.selectedSales.textContent = formatSales(product.sales);
  els.selectedCommission.textContent = product.commissionRate ? `${product.commissionRate}%` : '--';
  els.selectedCategory.textContent = product.category || '--';
  els.sellingPoints.innerHTML = (product.sellingPoints || []).map((point) => `<span class="tag">${escapeHtml(point)}</span>`).join('');
  renderMedia(product);
  renderMediaThumbs(product);
  renderTrendChart(product);
  if (product.sourceNotice) els.sourceNote.textContent = product.sourceNotice;
}

function renderMedia(product, mediaItem = null) {
  const item = mediaItem || getProductMediaItems(product)[0];
  if (!item?.url) {
    els.mediaStage.innerHTML = '<div class="empty-stage">暂无素材</div>';
    return;
  }
  if (item.type === 'video') {
    els.mediaStage.innerHTML = `<video src="${escapeAttr(item.url)}" poster="${escapeAttr(item.posterUrl || product.imageUrl || '')}" controls muted playsinline></video>`;
    return;
  }
  els.mediaStage.innerHTML = `<img src="${escapeAttr(item.url)}" alt="${escapeAttr(item.label || product.title)}" />`;
}

function renderMediaThumbs(product) {
  if (!els.mediaThumbs) return;
  const mediaItems = getProductMediaItems(product);
  if (!mediaItems.length) {
    els.mediaThumbs.innerHTML = '<div class="media-thumb empty">无素材</div>';
    return;
  }
  els.mediaThumbs.innerHTML = mediaItems.map((item, index) => `
    <button class="media-thumb ${index === 0 ? 'is-active' : ''}" type="button" data-media-index="${index}" aria-label="预览${escapeAttr(item.label)}" aria-pressed="${index === 0 ? 'true' : 'false'}" title="${escapeAttr(item.label)}">
      ${item.type === 'video' ? '<span class="media-type">视频</span>' : ''}
      <img src="${escapeAttr(item.thumbnailUrl || item.posterUrl || item.url)}" alt="${escapeAttr(item.label)}" loading="lazy" />
    </button>
  `).join('');
  els.mediaThumbs.querySelectorAll('.media-thumb').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.mediaIndex || 0);
      const nextItem = mediaItems[index] || mediaItems[0];
      renderMedia(product, nextItem);
      els.mediaThumbs.querySelectorAll('.media-thumb').forEach((item) => {
        const isActive = item === button;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    });
  });
}

function getProductMediaItems(product) {
  const items = [];
  const addItem = (input, fallback = {}) => {
    const rawUrl = typeof input === 'string'
      ? input
      : input?.url || input?.mediaUrl || input?.imageUrl || input?.src || '';
    const url = String(rawUrl || '').trim();
    if (!url || items.some((item) => item.url === url)) return;
    const type = String(
      (typeof input === 'object' && (input.type || input.mediaType)) ||
      fallback.type ||
      inferClientMediaType(url)
    ).toLowerCase();
    items.push({
      url,
      type: type === 'video' ? 'video' : 'image',
      label: String((typeof input === 'object' && (input.label || input.title || input.alt)) || fallback.label || `素材 ${items.length + 1}`),
      thumbnailUrl: String((typeof input === 'object' && (input.thumbnailUrl || input.thumbUrl || input.posterUrl || input.imageUrl)) || fallback.thumbnailUrl || ''),
      posterUrl: String((typeof input === 'object' && (input.posterUrl || input.imageUrl)) || fallback.posterUrl || '')
    });
  };

  addItem(product.mediaUrl, {
    type: product.mediaType,
    label: product.mediaType === 'video' ? '视频素材' : '主图',
    posterUrl: product.imageUrl
  });
  addItem(product.imageUrl, { type: 'image', label: '商品主图' });
  [
    product.mediaItems,
    product.mediaList,
    product.images,
    product.imageUrls,
    product.gallery
  ].forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => addItem(item));
  });
  return items.slice(0, 8);
}

function inferClientMediaType(url) {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(String(url || '')) ? 'video' : 'image';
}

function renderTrendChart(product) {
  if (!els.trendChart) return;
  const rawTrend = Array.isArray(product.salesTrend) ? product.salesTrend : [];
  const values = rawTrend
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item >= 0);
  if (values.length < 2) {
    if (els.trendPeriod) els.trendPeriod.textContent = '无历史';
    els.trendChart.innerHTML = `
      <div class="trend-empty">
        <strong>暂无历史销量数据</strong>
        <span>当前只展示商品总销量。导入 CSV/API 若提供 salesTrend 或 salesHistory 字段，才会绘制真实趋势。</span>
      </div>
    `;
    return;
  }
  if (els.trendPeriod) els.trendPeriod.textContent = `近 ${values.length} 期`;
  const width = 320;
  const height = 118;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const step = width / (values.length - 1);
  const coords = values.map((value, index) => {
    const x = Math.round(index * step);
    const normalized = (value - min) / range;
    const y = Math.round(height - 16 - normalized * (height - 34));
    return `${x},${y}`;
  });
  const area = `0,${height} ${coords.join(' ')} ${width},${height}`;
  els.trendChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="销量趋势图" preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#079a77" stop-opacity="0.24" />
          <stop offset="100%" stop-color="#079a77" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <polyline points="0,92 ${width},92" fill="none" stroke="#e1e9e5" stroke-width="1" />
      <polyline points="0,56 ${width},56" fill="none" stroke="#e1e9e5" stroke-width="1" />
      <polygon points="${area}" fill="url(#trendFill)" />
      <polyline points="${coords.join(' ')}" fill="none" stroke="#079a77" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${coords.map((coord) => {
        const [x, y] = coord.split(',');
        return `<circle cx="${x}" cy="${y}" r="2.5" fill="#079a77" />`;
      }).join('')}
    </svg>
  `;
}

function renderAnalysis() {
  if (!state.analysis) {
    els.analysisBox.innerHTML = '<div class="empty-copy">点击 ◎ 分析素材</div>';
    return;
  }
  const analysis = state.analysis;
  els.analysisBox.innerHTML = `
    <p class="copy-line">${escapeHtml(analysis.hook)}</p>
    <p><strong>结构：</strong>${escapeHtml(analysis.creativePattern)}</p>
    <p><strong>风格：</strong>${escapeHtml(analysis.visualStyle)}</p>
    <ul class="analysis-list">
      ${(analysis.persuasionAngles || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
    ${renderAiInsight(analysis.ai)}
    ${renderVisualRisk(analysis.visualRisk)}
  `;
}

function renderAnalysisPending(title, detail) {
  els.analysisBox.innerHTML = `
    <div class="analysis-pending" role="status" aria-live="polite">
      <span class="activity-spinner" aria-hidden="true"></span>
      <span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(detail)}</small>
      </span>
    </div>
  `;
}

function renderAiInsight(ai) {
  if (!ai) return '';
  if (ai.status === 'not_configured') {
    return `<div class="ai-box muted"><strong>AI 洞察</strong><span>${escapeHtml(ai.message)}</span></div>`;
  }
  if (ai.status === 'error') {
    return `<div class="ai-box warn"><strong>AI 调用失败</strong><span>${escapeHtml(ai.hint ? `${ai.message} ${ai.hint}` : ai.message)}</span></div>`;
  }
  return `
    <div class="ai-box">
      <div class="ai-head">
        <strong>AI 洞察</strong>
        <span>${escapeHtml(ai.model || '')}</span>
      </div>
      ${ai.audienceInsight ? `<p>${escapeHtml(ai.audienceInsight)}</p>` : ''}
      ${ai.recommendedHook ? `<p class="copy-line">${escapeHtml(ai.recommendedHook)}</p>` : ''}
      ${renderMiniList('购买动机', ai.purchaseDrivers)}
      ${renderMiniList('创意角度', ai.creativeAngles)}
      ${renderMiniList('差异化表达', ai.differentiation)}
      ${renderMiniList('发布前证据', ai.evidenceNeeded)}
      ${renderMiniList('风险提醒', ai.contentWarnings, 'warn-list')}
    </div>
  `;
}

function renderVisualRisk(visualRisk) {
  if (!visualRisk) return '';
  const statusText = visualRisk.status === 'ok'
    ? (visualRisk.model || '视觉模型')
    : visualRisk.status === 'not_configured' || visualRisk.status === 'local'
      ? '本地预检'
      : visualRisk.status === 'error'
        ? '调用失败'
        : visualRisk.status || '';
  const riskClass = `risk-${visualRisk.riskLevel || 'medium'}`;
  const warning = visualRisk.message || visualRisk.hint
    ? `<p class="visual-note">${escapeHtml([visualRisk.message, visualRisk.hint].filter(Boolean).join(' '))}</p>`
    : '';
  const findings = visualRisk.findings || {};
  return `
    <div class="visual-box ${riskClass}">
      <div class="visual-head">
        <strong>视觉风险</strong>
        <span>${escapeHtml(statusText)}</span>
      </div>
      <div class="visual-summary">
        <span class="risk-badge ${riskClass}">${escapeHtml(riskLabel(visualRisk.riskLevel || 'medium'))}</span>
        <p>${escapeHtml(visualRisk.summary || '暂无视觉风险总结。')}</p>
      </div>
      ${warning}
      ${renderVisualAssetAccess(visualRisk.assetAccess)}
      ${renderVisualAssetInventory(visualRisk.assetInventory)}
      ${renderVisualModelCandidates(visualRisk.modelCandidates)}
      ${renderVisualComparison(visualRisk.precheckComparison)}
      <div class="visual-grid">
        ${renderVisualFinding('水印', findings.watermark)}
        ${renderVisualFinding('字幕', findings.subtitle)}
        ${renderVisualFinding('主体', findings.subject)}
        ${renderVisualFinding('场景', findings.scene)}
        ${renderVisualFinding('镜头', findings.shotChange)}
        ${renderVisualFinding('品牌', findings.brandLogo)}
        ${renderVisualFinding('画面文字', findings.onScreenText)}
      </div>
      ${renderVisualRiskEvidenceCards(visualRisk.riskEvidenceCards)}
      ${renderVisualRiskMatrix(visualRisk.riskMatrix)}
      ${renderVisualVideoFramePlan(visualRisk.videoFramePlan)}
      ${renderVisualEvidenceSnapshots(visualRisk.evidenceSnapshots)}
      ${renderVisualManualReviewChecklist(visualRisk.manualReviewChecklist)}
      ${renderMiniList('复核重点', visualRisk.reviewFocus)}
      ${renderMiniList('证据要求', visualRisk.evidenceRequired)}
      ${renderVisualReshootBrief(visualRisk.reshootBrief)}
      ${renderMiniList('可见证据', visualRisk.evidence)}
      ${renderMiniList('处理建议', visualRisk.recommendations)}
      ${renderMiniList('风险提醒', visualRisk.contentWarnings, 'warn-list')}
    </div>
  `;
}

function renderVisualAssetInventory(items) {
  if (!items?.length) return '';
  return `
    <div class="visual-inventory">
      <strong>素材清单</strong>
      <div class="visual-inventory-list">
        ${items.slice(0, 8).map((item) => `
          <div class="visual-inventory-row ${item.accessible === false ? 'risk-high' : ''}">
            <div>
              <span>${escapeHtml(item.label || item.roleLabel || '素材')}</span>
              <small title="${escapeAttr(item.displayUrl || item.url || '')}">${escapeHtml(shortenText(item.displayUrl || item.url || '未记录地址', 96))}</small>
            </div>
            <em>${escapeHtml([item.typeLabel, item.sourceKindLabel].filter(Boolean).join(' / '))}</em>
            <p>${escapeHtml(item.recommendation || '保留授权和审核记录。')}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderVisualModelCandidates(candidates) {
  if (!candidates?.length) return '';
  return `
    <div class="visual-models">
      <strong>模型候选</strong>
      <div class="visual-model-list">
        ${candidates.slice(0, 5).map((item) => `
          <div class="visual-model-row ${item.active ? 'is-active' : ''}">
            <div>
              <span>${escapeHtml(item.model || '视觉模型')}</span>
              <small>${escapeHtml(item.useCase || '用于视觉风险复核。')}</small>
            </div>
            <em>${escapeHtml(item.active ? '已使用' : item.sourceLabel || '候选')}</em>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderVisualFinding(title, finding) {
  if (!finding) return '';
  const status = String(finding.status || 'unknown').toLowerCase();
  const statusClass = status.replace(/[^a-z0-9_-]/g, '') || 'unknown';
  const evidence = finding.evidence?.length
    ? `<small>${escapeHtml(finding.evidence.slice(0, 2).join(' / '))}</small>`
    : '';
  return `
    <div class="visual-item">
      <div class="visual-item-head">
        <strong>${escapeHtml(title)}</strong>
        <span class="visual-status status-${escapeAttr(statusClass)}">${escapeHtml(visualStatusLabel(status))}</span>
      </div>
      <p>${escapeHtml(finding.detail || '待确认')}</p>
      ${evidence}
    </div>
  `;
}

function renderVisualAssetAccess(assetAccess) {
  if (!assetAccess) return '';
  const level = assetAccess.accessible ? 'low' : assetAccess.status === 'embedded' ? 'low' : 'high';
  const meta = [
    assetAccess.httpStatus && `HTTP ${assetAccess.httpStatus}`,
    assetAccess.contentType,
    assetAccess.sizeBytes ? `${Math.round(assetAccess.sizeBytes / 1024)}KB` : ''
  ].filter(Boolean).join(' / ');
  return `
    <div class="visual-access risk-${escapeAttr(level)}">
      <div>
        <strong>素材可访问性</strong>
        <p>${escapeHtml(assetAccess.summary || '未执行可访问性检查。')}</p>
        ${assetAccess.detail ? `<small>${escapeHtml(assetAccess.detail)}</small>` : ''}
      </div>
      ${meta ? `<span>${escapeHtml(meta)}</span>` : ''}
    </div>
  `;
}

function renderVisualRiskEvidenceCards(cards) {
  if (!cards?.length) return '';
  const visibleCards = cards.filter((card) => card.level !== 'low').slice(0, 5);
  const renderCards = visibleCards.length ? visibleCards : cards.slice(0, 3);
  return `
    <div class="visual-evidence">
      <strong>风险证据卡</strong>
      <div class="visual-evidence-list">
        ${renderCards.map((card) => `
          <div class="visual-evidence-card risk-${escapeAttr(card.level || 'medium')}">
            <div class="visual-evidence-card-head">
              <span>${escapeHtml(card.label || card.key || '风险项')}</span>
              <em>${escapeHtml(riskLabel(card.level || 'medium'))}</em>
            </div>
            <p>${escapeHtml(card.detail || card.reviewerAction || '待人工复核。')}</p>
            ${card.recordRequired ? `<small>${escapeHtml(card.recordRequired)}</small>` : ''}
            ${renderMiniList('截图目标', card.evidenceSnapshots)}
            ${renderMiniList('证据线索', card.evidence)}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderVisualComparison(items) {
  if (!items?.length) return '';
  return `
    <div class="visual-comparison">
      <strong>本地预检 vs 视觉模型</strong>
      <div class="visual-comparison-list">
        ${items.map((item) => `
          <div class="visual-comparison-row risk-${escapeAttr(item.level || 'medium')}">
            <span>${escapeHtml(item.label || item.key || '风险项')}</span>
            <em>${escapeHtml(visualStatusLabel(item.localStatus))} → ${escapeHtml(visualStatusLabel(item.aiStatus))}</em>
            <small>${escapeHtml(item.note || '判断不一致，建议人工复核。')}</small>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderVisualVideoFramePlan(items) {
  if (!items?.length) return '';
  return `
    <div class="visual-frame-plan">
      <strong>视频抽帧计划</strong>
      <div class="visual-frame-list">
        ${items.map((item) => `
          <div class="visual-frame-row">
            <em>${escapeHtml(item.timecode || '')}</em>
            <div>
              <span>${escapeHtml(item.label || '关键帧')}</span>
              <small>${escapeHtml(item.purpose || '')}</small>
              ${item.riskFocus?.length ? `<small>${escapeHtml(item.riskFocus.join(' / '))}</small>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      <p>这是人工抽帧留档计划，不会自动下载或抓取未授权视频。</p>
    </div>
  `;
}

function renderVisualEvidenceSnapshots(items) {
  if (!items?.length) return '';
  return `
    <div class="visual-snapshots">
      <strong>证据截图留档</strong>
      <div class="visual-snapshot-list">
        ${items.slice(0, 8).map((item) => `
          <div class="visual-snapshot-row status-${escapeAttr(item.status || 'pending')}">
            <div>
              <span>${escapeHtml(item.title || '截图留档')}</span>
              <small>${escapeHtml(item.captureTarget || item.reason || '')}</small>
            </div>
            <em>${escapeHtml(visualSnapshotStatusLabel(item.status))}</em>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderVisualManualReviewChecklist(items) {
  if (!items?.length) return '';
  return `
    <div class="visual-review">
      <strong>人工复核清单</strong>
      <div class="visual-review-list">
        ${items.map((item) => `
          <div class="visual-review-row priority-${escapeAttr(item.priority || 'medium')}">
            <em>${escapeHtml(visualPriorityLabel(item.priority))}</em>
            <div>
              <span>${escapeHtml(item.title || '复核项')}</span>
              <small>${escapeHtml(item.detail || '')}</small>
              ${item.evidenceTarget ? `<small>${escapeHtml(item.evidenceTarget)}</small>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderVisualRiskMatrix(matrix) {
  if (!matrix?.length) return '';
  return `
    <div class="visual-matrix">
      <strong>风险矩阵</strong>
      <div class="visual-matrix-list">
        ${matrix.map((item) => `
          <div class="visual-matrix-row risk-${escapeAttr(item.level || 'medium')}">
            <div>
              <span>${escapeHtml(item.label || item.key || '风险项')}</span>
              <small>${escapeHtml(item.detail || '待确认')}</small>
            </div>
            <em>${escapeHtml(riskLabel(item.level || 'medium'))}</em>
            <p>${escapeHtml(item.action || '人工复核并留存证据。')}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderVisualReshootBrief(brief) {
  if (!brief) return '';
  return `
    <div class="visual-brief">
      <strong>重拍/替换简报</strong>
      ${brief.goal ? `<p>${escapeHtml(brief.goal)}</p>` : ''}
      <div class="visual-brief-grid">
        ${renderMiniList('必须呈现', brief.mustShow)}
        ${renderMiniList('避免出现', brief.avoid, 'warn-list')}
        ${renderMiniList('拍摄建议', brief.shotIdeas)}
        ${renderMiniList('交付留档', brief.deliverables)}
        ${renderMiniList('复核清单', brief.checklist)}
      </div>
    </div>
  `;
}

function renderMiniList(title, items, className = '') {
  if (!items?.length) return '';
  return `
    <div class="mini-list ${className}">
      <strong>${escapeHtml(title)}</strong>
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderAudit() {
  if (!state.audit) {
    els.auditScore.textContent = '--';
    els.auditScore.className = '';
    els.auditBox.innerHTML = '<div class="empty-copy">点击 ✓ 运行合规审核</div>';
    renderAuthorizationCredentials();
    renderMaterialRights();
    renderAuditHistory();
    return;
  }
  const audit = state.audit;
  els.auditScore.textContent = audit.score;
  els.auditScore.className = `risk-${audit.level}`;
  const topChecks = audit.checks
    .filter((check) => check.status !== 'pass')
    .slice(0, 5);
  const visibleChecks = topChecks.length ? topChecks : audit.checks.slice(0, 3);
  els.auditBox.innerHTML = `
    <div class="audit-summary risk-${audit.level}">
      <strong>${riskLabel(audit.level)}</strong>
      <span>${escapeHtml(audit.summary)}</span>
    </div>
    <ul class="audit-list">
      ${visibleChecks.map((check) => `
        <li class="audit-item ${check.status}">
          <span class="audit-status">${statusLabel(check.status)}</span>
          <span>
            <strong>${escapeHtml(check.title)}</strong>
            <em>${escapeHtml(check.detail)}</em>
            ${check.suggestion ? `<small>${escapeHtml(check.suggestion)}</small>` : ''}
          </span>
        </li>
      `).join('')}
    </ul>
    <div class="audit-tips">
      ${audit.rewriteTips.slice(0, 2).map((item) => `<p>${escapeHtml(item)}</p>`).join('')}
    </div>
    ${renderMiniList('规则命中', (audit.flaggedTerms || []).map((item) => `${item.term} / ${item.kind === 'brandRules' ? '品牌词' : '敏感词'}${item.source === 'custom' ? ' / 自定义' : ''}`))}
    ${renderMiniList('关联凭证', (audit.credentialMatches || []).map((item) => `${item.title} / ${credentialSourceTypeLabel(item.sourceType)}`))}
    ${renderMiniList('素材版权', (audit.materialRightMatches || []).map((item) => `${item.title} / ${materialAssetTypeLabel(item.assetType)} / ${materialScopeLabel(item.licenseScope)}`))}
  `;
  renderAuthorizationCredentials();
  renderMaterialRights();
  renderAuditHistory();
}

function renderAuthorizationCredentials(error = null) {
  if (!els.credentialHistory) return;
  const records = state.authorizationCredentials || [];
  const currentId = state.selected?.id || '';
  const matching = currentId
    ? records.filter((record) => (record.products || []).some((product) => product.id === currentId))
    : [];
  els.credentialAddBtn.disabled = !state.selected;
  els.credentialExportBtn.disabled = !records.length;
  if (error) {
    els.credentialHistory.innerHTML = `<div class="empty-copy">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
    return;
  }
  if (!records.length) {
    els.credentialHistory.innerHTML = '<div class="empty-copy">暂无授权凭证</div>';
    return;
  }
  const visible = (matching.length ? matching : records).slice(0, 6);
  const summary = !state.selected
    ? '最近授权凭证台账'
    : matching.length
      ? `当前商品已关联 ${matching.length} 条凭证`
      : '当前商品暂无匹配凭证，显示最近台账';
  els.credentialHistory.innerHTML = `
    <div class="credential-summary ${state.selected && !matching.length ? 'warn' : ''}">${escapeHtml(summary)}</div>
    ${visible.map((record) => renderCredentialRecord(record)).join('')}
  `;
}

function renderCredentialRecord(record) {
  const productText = record.productCount
    ? `${record.productCount} 个商品`
    : '通用凭证';
  return `
    <article class="credential-record">
      <div class="credential-record-head">
        <strong>${escapeHtml(record.title || '未命名凭证')}</strong>
        <span>${escapeHtml(credentialSourceTypeLabel(record.sourceType))}</span>
      </div>
      <div class="credential-record-meta">
        <span>${escapeHtml(platformName(record.platform || ''))}</span>
        <span>${escapeHtml(record.category || '全部类目')}</span>
        <span>${escapeHtml(productText)}</span>
        ${record.reviewer ? `<span>${escapeHtml(record.reviewer)}</span>` : ''}
      </div>
      ${record.reference ? `<p>${escapeHtml(shortenText(record.reference, 120))}</p>` : ''}
      <small>${escapeHtml(formatShortDate(record.capturedAt || record.createdAt))}</small>
    </article>
  `;
}

function renderMaterialRights(error = null) {
  if (!els.materialRightHistory) return;
  const records = state.materialRights || [];
  const currentId = state.selected?.id || '';
  const matching = currentId
    ? records.filter((record) => (record.products || []).some((product) => product.id === currentId))
    : [];
  els.materialRightAddBtn.disabled = !state.selected;
  els.materialRightExportBtn.disabled = !records.length;
  if (error) {
    els.materialRightHistory.innerHTML = `<div class="empty-copy">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
    return;
  }
  if (!records.length) {
    els.materialRightHistory.innerHTML = '<div class="empty-copy">暂无素材版权记录</div>';
    return;
  }
  const visible = (matching.length ? matching : records).slice(0, 6);
  const summary = !state.selected
    ? '最近素材版权台账'
    : matching.length
      ? `当前商品已关联 ${matching.length} 条素材版权记录`
      : '当前商品暂无匹配素材版权，显示最近台账';
  const expiring = records.filter((record) => ['expired', 'expiring_soon'].includes(record.expiryStatus?.status)).length;
  els.materialRightHistory.innerHTML = `
    <div class="credential-summary ${state.selected && !matching.length ? 'warn' : ''}">${escapeHtml(summary)}</div>
    ${expiring ? `<div class="credential-summary warn">${escapeHtml(`有 ${expiring} 条素材授权已过期或即将到期，请发布前复核。`)}</div>` : ''}
    ${visible.map((record) => renderMaterialRightRecord(record)).join('')}
  `;
}

function renderMaterialRightRecord(record) {
  const productText = record.productCount
    ? `${record.productCount} 个商品`
    : '通用素材';
  const scopeText = materialScopeLabel(record.licenseScope);
  const expiry = record.expiryStatus || {};
  const expiryClass = expiry.status === 'expired' ? 'risk-high' : expiry.status === 'expiring_soon' ? 'risk-medium' : 'risk-low';
  const brandStatus = record.brandScope?.statusLabel || materialBrandStatusLabel(record.brandScope?.status);
  const brandNames = record.brandScope?.brands?.length ? record.brandScope.brands.join('、') : '';
  const warnings = record.scopeWarnings || [];
  return `
    <article class="credential-record ${warnings.length ? 'warn' : ''}">
      <div class="credential-record-head">
        <strong>${escapeHtml(record.title || '未命名素材')}</strong>
        <span>${escapeHtml(materialAssetTypeLabel(record.assetType))}</span>
      </div>
      <div class="credential-record-meta">
        <span>${escapeHtml(materialSourceTypeLabel(record.sourceType))}</span>
        <span>${escapeHtml(scopeText)}</span>
        <span class="${escapeAttr(expiryClass)}">${escapeHtml(expiry.label || '未设置到期')}</span>
        <span>${escapeHtml(brandStatus)}</span>
        <span>${escapeHtml(platformName(record.platform || ''))}</span>
        <span>${escapeHtml(record.category || '全部类目')}</span>
        <span>${escapeHtml(productText)}</span>
        ${record.attachmentRefs?.length ? `<span>${escapeHtml(`附件 ${record.attachmentRefs.length}`)}</span>` : ''}
        ${record.reviewer ? `<span>${escapeHtml(record.reviewer)}</span>` : ''}
      </div>
      ${brandNames ? `<p>${escapeHtml(`品牌：${brandNames}`)}</p>` : ''}
      ${record.scopeSummary ? `<p>${escapeHtml(record.scopeSummary)}</p>` : ''}
      ${record.reference ? `<p>${escapeHtml(shortenText(record.reference, 120))}</p>` : ''}
      ${record.attachmentRefs?.length ? `<small>${escapeHtml(`附件引用：${record.attachmentRefs.slice(0, 3).map((item) => item.title || item.reference).filter(Boolean).join('、')}`)}</small>` : ''}
      ${warnings.length ? `<small class="warn-text">${escapeHtml(warnings.slice(0, 3).join('；'))}</small>` : ''}
      <small>${escapeHtml(formatShortDate(record.capturedAt || record.createdAt))}${record.expiresAt ? ` / 到期 ${escapeHtml(formatShortDate(record.expiresAt))}` : ''}</small>
    </article>
  `;
}

function renderAuditHistory(error = null) {
  if (!els.auditHistory) return;
  if (error) {
    els.auditHistory.innerHTML = `<div class="empty-copy">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
    els.auditExportBtn.disabled = true;
    return;
  }
  const records = state.auditRecords || [];
  els.auditExportBtn.disabled = !records.length;
  if (!records.length) {
    els.auditHistory.innerHTML = '<div class="empty-copy">暂无审核记录</div>';
    return;
  }
  els.auditHistory.innerHTML = records.slice(0, 8).map((record) => `
    <article class="audit-record risk-${escapeAttr(record.audit?.level || 'medium')}">
      <div class="audit-record-head">
        <strong>${escapeHtml(record.product?.title || '未命名商品')}</strong>
        <span>${escapeHtml(record.audit?.score ?? '--')}分</span>
      </div>
      <div class="audit-record-meta">
        <span>${escapeHtml(formatShortDate(record.createdAt))}</span>
        <span>${escapeHtml(riskLabel(record.audit?.level || 'medium'))}</span>
        <span>${escapeHtml(record.source || record.product?.platform || '本机')}</span>
      </div>
      <p>${escapeHtml(record.audit?.summary || '')}</p>
      ${record.audit?.flaggedTerms?.length
        ? `<small>命中：${escapeHtml(record.audit.flaggedTerms.slice(0, 3).map((item) => item.term).join('、'))}</small>`
        : '<small>未命中敏感词/品牌规则</small>'}
    </article>
  `).join('');
}

function renderAuditPending(title, detail) {
  els.auditScore.textContent = '...';
  els.auditScore.className = '';
  els.auditBox.innerHTML = `
    <div class="analysis-pending" role="status" aria-live="polite">
      <span class="activity-spinner" aria-hidden="true"></span>
      <span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(detail)}</small>
      </span>
    </div>
  `;
}

function clampClientNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function renderCreativeQuality(quality) {
  if (!quality) return '';
  const gate = quality.publishReadiness?.gate || (quality.publishReadiness?.creativeReady ? 'ready' : 'review');
  const gateLabel = gate === 'ready' ? '可进入复核' : gate === 'blocked' ? '需要重做' : '需要复核';
  const dimensions = Array.isArray(quality.dimensions) ? quality.dimensions : [];
  const checks = Array.isArray(quality.checks) ? quality.checks : [];
  const visibleChecks = checks.filter((check) => check.status !== 'pass').slice(0, 4);
  const fallbackChecks = visibleChecks.length ? visibleChecks : checks.slice(0, 3);
  return `
    <section class="creative-quality risk-${escapeAttr(quality.level || 'medium')}">
      <div class="creative-quality-head">
        <div>
          <strong>创意质量控制</strong>
          <p>${escapeHtml(quality.summary || '已生成创意质量报告。')}</p>
        </div>
        <div class="creative-score">
          <span>${escapeHtml(String(quality.score ?? '--'))}</span>
          <em>${escapeHtml(quality.grade || '')}</em>
        </div>
      </div>
      <div class="creative-quality-meta">
        <span class="risk-badge risk-${escapeAttr(quality.level || 'medium')}">${escapeHtml(riskLabel(quality.level || 'medium'))}</span>
        <span>${escapeHtml(quality.statusLabel || gateLabel)}</span>
        <span>${escapeHtml(gateLabel)}</span>
      </div>
      ${dimensions.length ? `
        <div class="quality-dimensions">
          ${dimensions.map((item) => `
            <div class="quality-dimension status-${escapeAttr(item.status || 'warn')}">
              <div class="quality-dimension-row">
                <strong>${escapeHtml(item.label || item.key || '维度')}</strong>
                <span>${escapeHtml(String(item.score ?? 0))}</span>
              </div>
              <div class="quality-track"><i style="width:${clampClientNumber(item.score, 0, 100)}%"></i></div>
              <small>${escapeHtml(item.note || '')}</small>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${fallbackChecks.length ? `
        <div class="quality-checks">
          <strong>${visibleChecks.length ? '优先处理项' : '通过项摘要'}</strong>
          ${fallbackChecks.map((check) => `
            <div class="quality-check status-${escapeAttr(check.status || 'warn')}">
              <span>${escapeHtml(check.title || '检查项')}</span>
              <p>${escapeHtml(check.detail || '')}</p>
              ${check.suggestion ? `<small>${escapeHtml(check.suggestion)}</small>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${renderCreativeRewriteBrief(quality.rewriteBrief)}
      ${renderMiniList('改进建议', quality.improvementTips)}
    </section>
  `;
}

function renderCreativeRewriteBrief(brief) {
  if (!brief) return '';
  return `
    <div class="quality-rewrite">
      <strong>改写简报</strong>
      ${brief.goal ? `<p>${escapeHtml(brief.goal)}</p>` : ''}
      <div class="quality-rewrite-grid">
        ${renderMiniList('优先动作', brief.priorityActions)}
        ${renderMiniList('必须保留', brief.mustKeep)}
        ${renderMiniList('必须补充', brief.mustAdd, 'warn-list')}
      </div>
      ${brief.prompt ? `<small>${escapeHtml(brief.prompt)}</small>` : ''}
    </div>
  `;
}

function renderOutput() {
  if (!state.ad) {
    els.outputContent.innerHTML = '<div class="empty-copy">点击 ✦ 生成广告方案</div>';
    return;
  }
  const qualityBlock = renderCreativeQuality(state.creativeQuality || state.ad.quality);
  if (state.ad.format === 'poster') {
    els.outputContent.innerHTML = `
      ${qualityBlock}
      <h3>${escapeHtml(state.ad.headline)}</h3>
      <p class="copy-line">${escapeHtml(state.ad.subheadline)}</p>
      ${state.ad.copyBlocks.map((item) => `<p class="copy-line">${escapeHtml(item)}</p>`).join('')}
      <h3>版式</h3>
      <ul class="storyboard">${state.ad.layout.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      <h3>生成提示词</h3>
      <p class="copy-line">${escapeHtml(state.ad.prompt)}</p>
      ${renderChecklist(state.ad.complianceChecklist)}
    `;
    return;
  }
  els.outputContent.innerHTML = `
    ${qualityBlock}
    <h3>${escapeHtml(state.ad.headline)}</h3>
    <ul class="storyboard">
      ${state.ad.storyboard.map((scene) => `
        <li>
          <strong>${escapeHtml(scene.time)}</strong>
          ${escapeHtml(scene.shot)}：${escapeHtml(scene.action)}
          <br><span>${escapeHtml(scene.text)}</span>
        </li>
      `).join('')}
    </ul>
    <h3>口播</h3>
    ${state.ad.voiceover.map((item) => `<p class="copy-line">${escapeHtml(item)}</p>`).join('')}
    <h3>字幕</h3>
    <div class="tag-row">${state.ad.captions.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join('')}</div>
    ${renderChecklist(state.ad.complianceChecklist)}
  `;
}

function renderChecklist(items) {
  return `
    <h3>合规核对</h3>
    <ul class="checklist">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
}

function renderEmpty() {
  els.mediaStage.innerHTML = '<div class="empty-stage">选择一个商品</div>';
  if (els.mediaThumbs) els.mediaThumbs.innerHTML = '<div class="media-thumb empty">待选择</div>';
  els.selectedTitle.textContent = '请选择商品';
  els.selectedScore.textContent = '--';
  els.selectedPrice.textContent = '--';
  els.selectedSales.textContent = '--';
  els.selectedCommission.textContent = '--';
  els.selectedCategory.textContent = '--';
  els.sellingPoints.innerHTML = '';
  if (els.trendPeriod) els.trendPeriod.textContent = '无历史';
  if (els.trendChart) els.trendChart.innerHTML = '';
  renderAnalysis();
  renderAudit();
  renderOutput();
  renderAuthorizationCredentials();
  renderMaterialRights();
}

function updateSourceNote() {
  const source = els.source.value;
  if (state.products.some((product) => product.sourceNotice)) {
    els.sourceNote.textContent = state.products.find((product) => product.sourceNotice).sourceNotice;
    return;
  }
  const notes = {
    sample: '当前为样例数据，适合验证广告生成流程。',
    taobao: '淘宝数据源会优先调用开放平台；未配置密钥时显示样例。',
    douyin: '抖音数据源需要开放平台或抖店授权；未配置令牌时显示样例。'
  };
  els.sourceNote.textContent = notes[source] || '';
}

function platformName(platform) {
  const names = {
    taobao: '淘宝',
    douyin: '抖音',
    csv: 'CSV',
    sample: '样例',
    authorized_text: '授权文本',
    edge_extension: '插件导入',
    authorized_history: '历史销量'
  };
  return names[platform] || platform || '全部平台';
}

function credentialSourceTypeLabel(value) {
  const labels = {
    official_api: '官方开放平台',
    merchant_export: '商家后台导出',
    page_screenshot: '页面截图',
    creator_authorization: '达人/商家授权',
    internal_data: '内部投放数据',
    authorization_file: '授权文件',
    other: '其他'
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

function materialBrandStatusLabel(value) {
  const labels = {
    authorized: '已授权',
    pending_review: '待复核',
    limited: '有限授权',
    forbidden: '不可使用',
    not_applicable: '不涉及品牌'
  };
  return labels[value] || value || '不涉及品牌';
}

function riskLabel(level) {
  const labels = {
    low: '低风险',
    medium: '中风险',
    high: '高风险'
  };
  return labels[level] || level;
}

function statusLabel(status) {
  const labels = {
    pass: '通过',
    warn: '提示',
    fail: '阻断'
  };
  return labels[status] || status;
}

function visualStatusLabel(status) {
  const labels = {
    none: '无',
    possible: '疑似',
    visible: '明显',
    unknown: '未知',
    clear: '清晰',
    unclear: '不清晰',
    single: '单镜头',
    multiple: '多镜头',
    local: '预检',
    no_asset: '无素材'
  };
  return labels[status] || status;
}

function visualSnapshotStatusLabel(status) {
  const labels = {
    ready: '可留档',
    planned: '计划',
    pending: '待补齐'
  };
  return labels[status] || status || '待补齐';
}

function visualPriorityLabel(priority) {
  const labels = {
    high: '高',
    medium: '中',
    low: '低'
  };
  return labels[priority] || priority || '中';
}

function shortenText(value, maxLength) {
  const text = String(value || '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function splitClientList(value) {
  return String(value || '')
    .split(/[|、,，;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeSearchText(value) {
  return String(value || '').normalize('NFKC').toLowerCase().trim();
}

function formatSales(sales) {
  const value = Number(sales || 0);
  if (!value) return '--';
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
  return value.toLocaleString('zh-CN');
}

function formatPrice(price) {
  const value = Number(price || 0);
  if (!value) return '--';
  return `¥${value.toFixed(value % 1 ? 1 : 0)}`;
}

function setBusy(element, busy) {
  element.disabled = busy;
  element.dataset.label ??= element.textContent;
  if (busy) {
    element.classList.add('is-busy');
    if (element.classList.contains('text-button')) element.textContent = '处理中';
  } else {
    element.classList.remove('is-busy');
    if (element.classList.contains('text-button')) element.textContent = element.dataset.label;
  }
}

function startActivity(title, detail) {
  const token = ++activityToken;
  clearTimeout(activityHideTimer);
  els.activityTitle.textContent = title;
  els.activityDetail.textContent = detail;
  els.activityToast.classList.remove('is-done', 'is-error');
  els.activityToast.hidden = false;
  document.body.classList.add('has-activity');
  return token;
}

function finishActivity(token, title, detail) {
  if (token !== activityToken) return;
  els.activityTitle.textContent = title;
  els.activityDetail.textContent = detail;
  els.activityToast.classList.add('is-done');
  activityHideTimer = setTimeout(hideActivity, 1400);
}

function failActivity(token, title, error) {
  if (token !== activityToken) return;
  els.activityTitle.textContent = title;
  els.activityDetail.textContent = error instanceof Error ? error.message : String(error);
  els.activityToast.classList.add('is-error');
  activityHideTimer = setTimeout(hideActivity, 2600);
}

function hideActivity() {
  els.activityToast.hidden = true;
  els.activityToast.classList.remove('is-done', 'is-error');
  document.body.classList.remove('has-activity');
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || '请求失败');
  }
  return data;
}

function showError(error) {
  els.sourceNote.textContent = error instanceof Error ? error.message : String(error);
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dateStamp(date = new Date()) {
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}
