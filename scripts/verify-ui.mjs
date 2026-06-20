import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9333 + Math.floor(Math.random() * 1000);
const targetUrl = process.argv[2] || 'http://localhost:4173';
const rootDir = resolve(import.meta.dirname, '..');
const profileDir = resolve(rootDir, `.edge-profile-${Date.now()}`);
const screenshotPath = resolve(rootDir, 'output-screenshot.png');

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

  const target = await createTarget('about:blank');
  const client = await connectCdp(target.webSocketDebuggerUrl);
  const logs = [];

  client.on('Runtime.consoleAPICalled', (event) => {
    logs.push(`${event.type}: ${event.args?.map((arg) => arg.value || arg.description).join(' ')}`);
  });
  client.on('Runtime.exceptionThrown', (event) => {
    logs.push(`exception: ${event.exceptionDetails?.text || 'runtime exception'}`);
  });

  await client.send('Runtime.enable');
  await client.send('Page.enable');
  await client.send('Network.enable');
  const securityHeaders = await readSecurityHeaders(targetUrl);
  assertSecurityHeaders(securityHeaders);
  const localApiSecurity = await readLocalApiSecurity(targetUrl);
  assertLocalApiSecurity(localApiSecurity);
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false
  });
  const loadPromise = waitForEvent(client, 'Page.loadEventFired', 15000).catch(() => null);
  await client.send('Page.navigate', { url: targetUrl });
  await loadPromise;

  const loaded = await client.evaluate(`
    new Promise((resolve) => {
      const started = Date.now();
      const check = () => {
        const count = document.querySelectorAll('.product-card').length;
        if (count > 0 || Date.now() - started > 12000) {
          resolve({
            count,
            title: document.querySelector('#selectedTitle')?.textContent || '',
            note: document.querySelector('#sourceNote')?.textContent || ''
          });
          return;
        }
        setTimeout(check, 120);
      };
      check();
    })
  `);

  if (loaded.count < 1) {
    throw new Error(`Product cards did not render. Note: ${loaded.note}. Logs: ${logs.join(' | ')}`);
  }

  const ruleLibrary = await client.evaluate(`
    new Promise((resolve) => {
      const started = Date.now();
      const check = () => {
        const defaultItems = document.querySelectorAll('#ruleDefaultList .rule-item').length;
        const customItems = document.querySelectorAll('#ruleCustomList .rule-item').length;
        const state = document.querySelector('#ruleLibraryState')?.textContent || '';
        if (defaultItems > 0 || Date.now() - started > 12000) {
          resolve({
            state,
            defaultItems,
            customItems,
            defaultCount: document.querySelector('#ruleDefaultCount')?.textContent || '',
            customCount: document.querySelector('#ruleCustomCount')?.textContent || '',
            hasImportPreview: Boolean(document.querySelector('#ruleImportPreview')),
            hasSnapshotList: Boolean(document.querySelector('#ruleSnapshotList')),
            hasBrandStatusInput: Boolean(document.querySelector('#ruleBrandStatusInput')),
            brandScopeFields: ['#ruleBrandNamesInput', '#ruleBrandChannelsInput', '#ruleBrandRegionsInput', '#ruleBrandExpiresInput', '#ruleBrandCampaignInput', '#ruleBrandReferenceInput']
              .every((selector) => Boolean(document.querySelector(selector)))
          });
          return;
        }
        setTimeout(check, 120);
      };
      check();
    })
  `);

  if (ruleLibrary.defaultItems < 1) {
    throw new Error(`Rule library did not render. State: ${ruleLibrary.state}. Logs: ${logs.join(' | ')}`);
  }
  if (!ruleLibrary.hasImportPreview || !ruleLibrary.hasSnapshotList || !ruleLibrary.hasBrandStatusInput || !ruleLibrary.brandScopeFields) {
    throw new Error(`Rule preview/rollback controls did not render. Result: ${JSON.stringify(ruleLibrary)}. Logs: ${logs.join(' | ')}`);
  }

  const complianceApiCheck = await client.evaluate(`
    (async () => {
      const exportedRules = await fetch('/api/compliance-rules/export').then((response) => response.json());
      const importPayload = {
        mode: 'merge',
        rules: {
          schema: 'ad-workbench.compliance-rules',
          customRules: {
            sensitiveTerms: [
              {
                id: 'verify-sensitive-term',
                term: '验证测试词',
                severity: 'medium',
                replacement: '稳妥表达',
                note: 'UI 自动验证临时规则',
                enabled: true
              }
            ],
            brandRules: []
          }
        }
      };
      const imported = await fetch('/api/compliance-rules/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importPayload)
      }).then((response) => response.json());
      const brandSeed = await fetch('/api/compliance-rules/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'merge',
          rules: {
            customRules: {
              sensitiveTerms: [],
              brandRules: [
                {
                  id: 'verify-brand-rule',
                  term: '验证品牌词',
                  severity: 'medium',
                  replacement: '授权品牌表达',
                  note: '品牌状态验证',
                  brandAuthorizationStatus: 'authorized',
                  brandScope: {
                    brands: ['验证品牌'],
                    channels: ['taobao'],
                    regions: ['cn'],
                    campaign: '验证活动A',
                    expiresAt: '2026-12-31',
                    reference: 'verify-brand-auth-001'
                  },
                  enabled: true
                }
              ]
            }
          }
        })
      }).then((response) => response.json());
      const preview = await fetch('/api/compliance-rules/preview-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'merge',
          rules: {
            customRules: {
              sensitiveTerms: [
                {
                  id: 'verify-preview-sensitive',
                  term: '预览新增词',
                  severity: 'low',
                  replacement: '预览替换',
                  enabled: true
                }
              ],
              brandRules: [
                {
                  id: 'verify-brand-rule',
                  term: '验证品牌词',
                  severity: 'high',
                  replacement: '暂停使用',
                  note: '品牌状态变化验证',
                  brandAuthorizationStatus: 'forbidden',
                  brandScope: {
                    brands: ['验证品牌', '新品牌'],
                    channels: ['douyin'],
                    regions: ['global'],
                    campaign: '验证活动B',
                    expiresAt: '2026-07-15',
                    reference: 'verify-brand-auth-002'
                  },
                  enabled: true
                }
              ]
            }
          }
        })
      }).then((response) => response.json());
      const importedPreview = await fetch('/api/compliance-rules/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'merge',
          rules: {
            customRules: {
              sensitiveTerms: [
                {
                  id: 'verify-preview-sensitive',
                  term: '预览新增词',
                  severity: 'low',
                  replacement: '预览替换',
                  enabled: true
                }
              ],
              brandRules: [
                {
                  id: 'verify-brand-rule',
                  term: '验证品牌词',
                  severity: 'high',
                  replacement: '暂停使用',
                  note: '品牌状态变化验证',
                  brandAuthorizationStatus: 'forbidden',
                  brandScope: {
                    brands: ['验证品牌', '新品牌'],
                    channels: ['douyin'],
                    regions: ['global'],
                    campaign: '验证活动B',
                    expiresAt: '2026-07-15',
                    reference: 'verify-brand-auth-002'
                  },
                  enabled: true
                }
              ]
            }
          }
        })
      }).then((response) => response.json());
      const rollbackTarget = importedPreview.snapshots?.find((snapshot) =>
        Number(snapshot.version) === Number(brandSeed.version)
      ) || importedPreview.snapshots?.at(-1);
      const rolledBack = await fetch('/api/compliance-rules/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: rollbackTarget?.version })
      }).then((response) => response.json());
      const auditResult = await fetch('/api/audit-compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'sample',
          product: {
            id: 'verify-product',
            platform: 'sample',
            title: '验证测试词 商品',
            category: '验证类目',
            shop: '验证店铺',
            price: 99,
            sales: 100,
            imageUrl: 'https://example.test/image.jpg',
            mediaUrl: 'https://example.test/image.jpg',
            sellingPoints: ['验证测试词'],
            audience: '验证用户'
          },
          mediaAnalysis: {
            hook: '验证测试词',
            creativePattern: '本地验证',
            visualStyle: '干净主图',
            persuasionAngles: ['验证测试词']
          },
          ad: {
            format: 'poster',
            headline: '验证测试词',
            subheadline: '',
            copyBlocks: ['验证测试词'],
            layout: [],
            prompt: '',
            complianceChecklist: []
          }
        })
      }).then((response) => response.json());
      const auditRecords = await fetch('/api/compliance-audits?limit=5').then((response) => response.json());
      const exportedAudits = await fetch('/api/compliance-audits/export').then((response) => response.json());
      await fetch('/api/compliance-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true })
      });
      return {
        exportedSchema: exportedRules.schema,
        importedHasRule: Boolean((imported.customRules?.sensitiveTerms || []).some((rule) => rule.term === '验证测试词')),
        previewSchema: preview.schema,
        previewAdded: Number(preview.diff?.summary?.added || 0),
        previewOverwritten: Number(preview.diff?.summary?.overwritten || 0),
        previewAuthorizationChanged: Number(preview.diff?.summary?.authorizationChanged || 0),
        previewBrandScopeChanged: Number(preview.diff?.summary?.brandScopeChanged || 0),
        previewBrandScopeSummary: preview.diff?.byKind?.brandRules?.brandScopeChanged?.[0]?.after?.brandScopeSummary || '',
        importedPreviewSnapshots: importedPreview.snapshots?.length || 0,
        rollbackRemovedPreviewRule: !(rolledBack.customRules?.sensitiveTerms || []).some((rule) => rule.term === '预览新增词'),
        rollbackBrandStatus: (rolledBack.customRules?.brandRules || []).find((rule) => rule.term === '验证品牌词')?.brandAuthorizationStatus || '',
        rollbackBrandScope: (rolledBack.customRules?.brandRules || []).find((rule) => rule.term === '验证品牌词')?.brandScope || {},
        auditHit: Boolean((auditResult.audit?.flaggedTerms || []).some((item) => item.term === '验证测试词')),
        auditRecordReturned: Boolean(auditResult.record?.id),
        auditRecordsCount: auditRecords.records?.length || 0,
        exportedAuditsSchema: exportedAudits.schema,
        exportedAuditsCount: exportedAudits.records?.length || 0
      };
    })()
  `);

  if (complianceApiCheck.exportedSchema !== 'ad-workbench.compliance-rules' || !complianceApiCheck.importedHasRule) {
    throw new Error(`Compliance rule import/export failed. Result: ${JSON.stringify(complianceApiCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (complianceApiCheck.previewSchema !== 'ad-workbench.compliance-rules-import-preview' || complianceApiCheck.previewAdded < 1 || complianceApiCheck.previewOverwritten < 1 || complianceApiCheck.previewAuthorizationChanged < 1 || complianceApiCheck.previewBrandScopeChanged < 1 || !complianceApiCheck.previewBrandScopeSummary.includes('验证活动B') || complianceApiCheck.importedPreviewSnapshots < 1 || !complianceApiCheck.rollbackRemovedPreviewRule || complianceApiCheck.rollbackBrandStatus !== 'authorized' || complianceApiCheck.rollbackBrandScope?.campaign !== '验证活动A') {
    throw new Error(`Compliance rule preview/rollback failed. Result: ${JSON.stringify(complianceApiCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (!complianceApiCheck.auditHit || !complianceApiCheck.auditRecordReturned || complianceApiCheck.auditRecordsCount < 1 || complianceApiCheck.exportedAuditsSchema !== 'ad-workbench.compliance-audit-records' || complianceApiCheck.exportedAuditsCount < 1) {
    throw new Error(`Compliance audit record trail failed. Result: ${JSON.stringify(complianceApiCheck)}. Logs: ${logs.join(' | ')}`);
  }

  const workflowApiCheck = await client.evaluate(`
    (async () => {
      const products = [
        {
          id: 'verify-history-1',
          platform: 'taobao',
          title: '历史销量验证商品',
          category: '验证类目',
          shop: '验证店铺',
          price: 99,
          sales: 100,
          imageUrl: 'https://example.test/history.jpg',
          mediaUrl: 'https://example.test/history.jpg',
          sellingPoints: ['稳定卖点'],
          audience: '验证用户'
        }
      ];
      const history = await fetch('/api/import/sales-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          source: 'verify-history',
          csv: 'productId,date,sales\\\\nverify-history-1,2026-05-21,12\\\\nverify-history-1,2026-05-22,18\\\\nverify-history-1,2026-05-23,28'
        })
      }).then((response) => response.json());

      const importedRules = await fetch('/api/compliance-rules/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'merge',
          rules: {
            customRules: {
              sensitiveTerms: [
                {
                  id: 'verify-scoped-rule',
                  term: '范围验证词',
                  severity: 'high',
                  replacement: '范围内替换',
                  platforms: ['taobao'],
                  categories: ['验证类目'],
                  enabled: true
                }
              ],
              brandRules: []
            }
          }
        })
      }).then((response) => response.json());
      const scopedHit = await fetch('/api/audit-compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'sample',
          product: { ...products[0], platform: 'taobao', category: '验证类目' },
          mediaAnalysis: { hook: '范围验证词', creativePattern: '验证', visualStyle: '验证', persuasionAngles: [] },
          ad: { format: 'poster', headline: '范围验证词', copyBlocks: [] }
        })
      }).then((response) => response.json());
      const scopedMiss = await fetch('/api/audit-compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'sample',
          product: { ...products[0], platform: 'douyin', category: '其他类目' },
          mediaAnalysis: { hook: '范围验证词', creativePattern: '验证', visualStyle: '验证', persuasionAngles: [] },
          ad: { format: 'poster', headline: '范围验证词', copyBlocks: [] }
        })
      }).then((response) => response.json());
      await fetch('/api/compliance-rules/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'merge',
          rules: {
            customRules: {
              sensitiveTerms: [],
              brandRules: [
                {
                  id: 'verify-brand-scope-audit',
                  term: '品牌范围验证词',
                  severity: 'medium',
                  replacement: '授权品牌表达',
                  brandAuthorizationStatus: 'authorized',
                  brandScope: {
                    brands: ['其他品牌'],
                    platforms: ['douyin'],
                    categories: ['其他类目'],
                    channels: ['douyin'],
                    regions: ['cn'],
                    campaign: '审核范围验证',
                    expiresAt: '2026-07-15',
                    reference: 'verify-brand-scope-audit-ref'
                  },
                  enabled: true
                }
              ]
            }
          }
        })
      }).then((response) => response.json());
      const brandScopeAudit = await fetch('/api/audit-compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'sample',
          product: { ...products[0], platform: 'taobao', category: '验证类目', title: '品牌范围验证词 商品' },
          mediaAnalysis: { hook: '品牌范围验证词', creativePattern: '验证', visualStyle: '验证', persuasionAngles: [] },
          ad: { format: 'poster', headline: '品牌范围验证词', copyBlocks: [] }
        })
      }).then((response) => response.json());
      await fetch('/api/compliance-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true })
      });

      const queuedJob = await fetch('/api/batch/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'audit', source: 'verify', products })
      }).then((response) => response.json());
      const cancelled = await fetch('/api/batch/jobs/' + encodeURIComponent(queuedJob.job.id) + '/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      }).then((response) => response.json());
      const retried = await fetch('/api/batch/jobs/' + encodeURIComponent(queuedJob.job.id) + '/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      }).then((response) => response.json());
      const archived = await fetch('/api/batch/jobs/' + encodeURIComponent(queuedJob.job.id) + '/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      }).then((response) => response.json());
      const oversizedProducts = Array.from({ length: 55 }, (_, index) => ({
        ...products[index % products.length],
        id: 'verify-oversize-' + (index + 1),
        title: '批量限流验证商品 ' + (index + 1)
      }));
      const oversizedResponse = await fetch('/api/batch/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'audit', source: 'verify', products: oversizedProducts })
      });
      const oversizedBody = await oversizedResponse.json();
      const archiveSearch = await fetch('/api/batch/jobs?includeArchived=1&status=archived&q=' + encodeURIComponent(queuedJob.job.id))
        .then((response) => response.json());
      const defaultBatchList = await fetch('/api/batch/jobs?limit=20')
        .then((response) => response.json());
      const restored = await fetch('/api/batch/jobs/' + encodeURIComponent(queuedJob.job.id) + '/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      }).then((response) => response.json());
      const defaultAfterRestore = await fetch('/api/batch/jobs?limit=20')
        .then((response) => response.json());

      const extensionImport = await fetch('/api/import/extension-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: 'https://example.test/authorized',
          pageTitle: '授权验证页',
          platform: 'taobao',
          diagnostics: { candidateCards: 2 },
          products: [
            {
              id: 'ext-quality-1',
              platform: 'taobao',
              title: '插件质量验证商品',
              shop: '验证店铺',
              price: 88,
              sales: 120,
              imageUrl: 'https://example.test/ext.jpg',
              mediaItems: [{ url: 'https://example.test/ext.jpg', type: 'image' }],
              salesTrend: [10, 12, 15],
              sourceUrl: 'https://example.test/item'
            }
          ]
        })
      }).then((response) => response.json());

      const credentialCreated = await fetch('/api/authorization-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '验证授权后台导出',
          sourceType: 'merchant_export',
          platform: 'taobao',
          category: '验证类目',
          owner: '验证店铺',
          reference: 'verify-export-20260523.csv',
          reviewer: 'verify',
          products: [{ id: 'verify-history-1', title: '历史销量验证商品' }]
        })
      }).then((response) => response.json());
      const materialRightCreated = await fetch('/api/material-rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '验证主图拍摄授权',
          assetType: 'image',
          sourceType: 'self_produced',
          licenseScope: 'ecommerce_ads',
          platform: 'taobao',
          category: '验证类目',
          owner: '验证店铺',
          reference: 'verify-material-right-20260527',
          attachmentRefs: ['verify-contract-20260609.pdf', 'verify-screenshot-20260609.png'],
          expiresAt: '2026-06-20',
          brandScope: {
            brands: ['历史销量验证商品'],
            status: 'limited',
            restrictions: ['仅限电商广告']
          },
          channelScope: ['taobao', 'douyin'],
          regionScope: ['cn'],
          campaignScope: '验证大促活动',
          reviewer: 'verify',
          products: [{ id: 'verify-history-1', title: '历史销量验证商品' }]
        })
      }).then((response) => response.json());
      const credentialAudit = await fetch('/api/audit-compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'csv',
          product: { ...products[0], platform: 'taobao', category: '验证类目' },
          mediaAnalysis: { hook: '授权验证', creativePattern: '验证', visualStyle: '验证', persuasionAngles: [] },
          ad: { format: 'poster', headline: '授权验证', copyBlocks: [] }
        })
      }).then((response) => response.json());
      const exportedCredentials = await fetch('/api/authorization-credentials/export').then((response) => response.json());
      const exportedMaterialRights = await fetch('/api/material-rights/export').then((response) => response.json());
      const visualRiskCheck = await fetch('/api/analyze-visual-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            id: 'verify-visual-risk',
            platform: 'taobao',
            title: '视觉风险验证商品',
            category: '验证类目',
            shop: '验证店铺',
            price: 99,
            sales: 100,
            mediaType: 'video',
            mediaUrl: 'data:video/mp4;base64,AAAA',
            imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
            mediaItems: [
              { url: 'data:video/mp4;base64,AAAA', type: 'video', label: '验证视频' },
              { url: 'data:image/png;base64,iVBORw0KGgo=', type: 'image', label: '验证封面' }
            ],
            sellingPoints: ['视觉验证卖点'],
            audience: '验证用户'
          }
        })
      }).then((response) => response.json());

      return {
        historyMatched: history.report?.matchedProducts || 0,
        historyTrend: history.products?.[0]?.salesTrend || [],
        rulesVersion: importedRules.version,
        revisionCount: importedRules.revisionHistory?.length || 0,
        scopedHit: Boolean((scopedHit.audit?.flaggedTerms || []).some((item) => item.ruleId === 'verify-scoped-rule')),
        scopedMiss: Boolean((scopedMiss.audit?.flaggedTerms || []).some((item) => item.ruleId === 'verify-scoped-rule')),
        brandScopeAuditHit: Boolean((brandScopeAudit.audit?.flaggedTerms || []).some((item) => item.ruleId === 'verify-brand-scope-audit' && item.brandScopeSummary?.includes('审核范围验证'))),
        brandScopeAuditWarnings: (brandScopeAudit.audit?.flaggedTerms || []).find((item) => item.ruleId === 'verify-brand-scope-audit')?.brandScopeWarnings?.length || 0,
        cancelledStatus: cancelled.job?.status,
        retryJobId: retried.job?.id || '',
        archivedStatus: archived.job?.status,
        restoredStatus: restored.job?.status,
        oversizeStatus: oversizedResponse.status,
        oversizeCode: oversizedBody.error,
        archiveSearchFound: Boolean((archiveSearch.jobs || []).some((job) => job.id === queuedJob.job.id && job.status === 'archived')),
        defaultShowsArchived: Boolean((defaultBatchList.jobs || []).some((job) => job.id === queuedJob.job.id)),
        defaultShowsRestored: Boolean((defaultAfterRestore.jobs || []).some((job) => job.id === queuedJob.job.id && job.status !== 'archived')),
        queueMaxItems: Number(defaultBatchList.queue?.maxItemsPerJob || 0),
        queueMaxPendingItems: Number(defaultBatchList.queue?.maxPendingItems || 0),
        qualitySchema: extensionImport.qualityReport?.schema,
        qualityTrendRate: extensionImport.qualityReport?.completeness?.salesTrend?.rate,
        credentialCreated: Boolean(credentialCreated.credential?.id),
        credentialAuditMatch: Boolean(credentialAudit.audit?.credentialMatches?.length),
        credentialExportSchema: exportedCredentials.schema,
        credentialExportCount: exportedCredentials.credentials?.length || 0,
        materialRightCreated: Boolean(materialRightCreated.record?.id),
        materialAuditMatch: Boolean(credentialAudit.audit?.materialRightMatches?.length),
        materialAttachmentCount: materialRightCreated.record?.attachmentRefs?.length || 0,
        materialBrandStatus: materialRightCreated.record?.brandScope?.status || '',
        materialExpiryStatus: materialRightCreated.record?.expiryStatus?.status || '',
        materialAuditScopeSummary: credentialAudit.audit?.materialRightMatches?.[0]?.scopeSummary || '',
        materialAuditWarnings: credentialAudit.audit?.materialRightMatches?.[0]?.scopeWarnings?.length || 0,
        materialExportSchema: exportedMaterialRights.schema,
        materialExportCount: exportedMaterialRights.records?.length || 0,
        visualSchema: visualRiskCheck.visualRisk?.schema,
        visualInventoryCount: visualRiskCheck.visualRisk?.assetInventory?.length || 0,
        visualFramePlanCount: visualRiskCheck.visualRisk?.videoFramePlan?.length || 0,
        visualSnapshotCount: visualRiskCheck.visualRisk?.evidenceSnapshots?.length || 0,
        visualRiskCardCount: visualRiskCheck.visualRisk?.riskEvidenceCards?.length || 0,
        visualManualReviewCount: visualRiskCheck.visualRisk?.manualReviewChecklist?.length || 0,
        visualModelCandidateCount: visualRiskCheck.visualRisk?.modelCandidates?.length || 0
      };
    })()
  `);

  if (workflowApiCheck.historyMatched !== 1 || workflowApiCheck.historyTrend.length < 3) {
    throw new Error(`Sales history import failed. Result: ${JSON.stringify(workflowApiCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (!workflowApiCheck.scopedHit || workflowApiCheck.scopedMiss || workflowApiCheck.rulesVersion < 2 || workflowApiCheck.revisionCount < 1) {
    throw new Error(`Scoped compliance rules failed. Result: ${JSON.stringify(workflowApiCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (!workflowApiCheck.brandScopeAuditHit || workflowApiCheck.brandScopeAuditWarnings < 1) {
    throw new Error(`Brand scope compliance audit failed. Result: ${JSON.stringify(workflowApiCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (workflowApiCheck.cancelledStatus !== 'cancelled' || !workflowApiCheck.retryJobId || workflowApiCheck.archivedStatus !== 'archived' || workflowApiCheck.restoredStatus === 'archived') {
    throw new Error(`Batch job actions failed. Result: ${JSON.stringify(workflowApiCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (workflowApiCheck.oversizeStatus !== 400 || workflowApiCheck.oversizeCode !== 'BATCH_TOO_MANY_ITEMS' || workflowApiCheck.queueMaxItems !== 50 || workflowApiCheck.queueMaxPendingItems !== 160) {
    throw new Error(`Batch concurrency limits failed. Result: ${JSON.stringify(workflowApiCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (!workflowApiCheck.archiveSearchFound || workflowApiCheck.defaultShowsArchived) {
    throw new Error(`Batch archive search failed. Result: ${JSON.stringify(workflowApiCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (!workflowApiCheck.defaultShowsRestored) {
    throw new Error(`Batch archive restore failed. Result: ${JSON.stringify(workflowApiCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (workflowApiCheck.qualitySchema !== 'ad-workbench.extension-quality-report' || workflowApiCheck.qualityTrendRate !== 1) {
    throw new Error(`Extension quality report failed. Result: ${JSON.stringify(workflowApiCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (!workflowApiCheck.credentialCreated || !workflowApiCheck.credentialAuditMatch || workflowApiCheck.credentialExportSchema !== 'ad-workbench.authorization-credentials' || workflowApiCheck.credentialExportCount < 1) {
    throw new Error(`Authorization credential ledger failed. Result: ${JSON.stringify(workflowApiCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (!workflowApiCheck.materialRightCreated || !workflowApiCheck.materialAuditMatch || workflowApiCheck.materialAttachmentCount < 2 || workflowApiCheck.materialBrandStatus !== 'limited' || !workflowApiCheck.materialExpiryStatus || !workflowApiCheck.materialAuditScopeSummary || workflowApiCheck.materialExportSchema !== 'ad-workbench.material-rights' || workflowApiCheck.materialExportCount < 1) {
    throw new Error(`Material rights ledger failed. Result: ${JSON.stringify(workflowApiCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (workflowApiCheck.visualSchema !== 'ad-workbench.visual-risk' || workflowApiCheck.visualInventoryCount < 2 || workflowApiCheck.visualFramePlanCount < 3 || workflowApiCheck.visualSnapshotCount < 3 || workflowApiCheck.visualRiskCardCount < 3 || workflowApiCheck.visualManualReviewCount < 3 || workflowApiCheck.visualModelCandidateCount < 1) {
    throw new Error(`Visual risk evidence package failed. Result: ${JSON.stringify(workflowApiCheck)}. Logs: ${logs.join(' | ')}`);
  }

  const images = await client.evaluate(`
    new Promise((resolve) => {
      const imgs = [...document.images];
      if (!imgs.length) {
        resolve({ total: 0, loaded: 0, failed: 0 });
        return;
      }
      const done = () => {
        const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0).length;
        const failed = imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
        resolve({ total: imgs.length, loaded, failed });
      };
      const timer = setTimeout(done, 7000);
      Promise.allSettled(imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolveImage) => {
          img.addEventListener('load', resolveImage, { once: true });
          img.addEventListener('error', resolveImage, { once: true });
        });
      })).then(() => {
        clearTimeout(timer);
        done();
      });
    })
  `);

  await client.evaluate(`
    (() => {
      if (window.__analysisFetchWrapped) return;
      window.__analysisFetchWrapped = true;
      const originalFetch = window.fetch.bind(window);
      window.fetch = (...args) => {
        const input = args[0];
        const url = typeof input === 'string' ? input : input?.url || '';
        if (!/\\/api\\/(analyze-media|analyze-visual-risk|generate-ad|audit-compliance)/.test(url)) {
          return originalFetch(...args);
        }
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            originalFetch(...args).then(resolve, reject);
          }, 800);
        });
      };
    })();
  `);

  const analysisCheck = await client.evaluate(`
    new Promise((resolve) => {
      document.querySelector('#analyzeBtn')?.click();
      const started = Date.now();
      let sawActivity = false;
      const check = () => {
        const analysis = document.querySelector('#analysisBox')?.innerText || '';
        const insightPanel = document.querySelector('[data-ops-panel="insight"]');
        const insightTab = [...document.querySelectorAll('[data-ops-tab]')].find((button) => button.textContent?.includes('素材洞察'));
        const insightVisible = Boolean(insightPanel && !insightPanel.hidden);
        const insightActive = Boolean(insightTab && insightTab.classList.contains('is-active'));
        const insightHeading = insightPanel?.querySelector('h2')?.textContent?.trim() || '';
        const activityToast = document.querySelector('#activityToast');
        const activityVisible = Boolean(activityToast && !activityToast.hidden);
        const activityText = [
          document.querySelector('#activityTitle')?.textContent || '',
          document.querySelector('#activityDetail')?.textContent || ''
        ].filter(Boolean).join(' ');
        sawActivity = sawActivity || activityVisible;
        if ((analysis.trim().length > 0 && !analysis.includes('点击 ◎ 分析素材') && insightVisible && insightActive) || Date.now() - started > 12000) {
          resolve({
            analysis,
            insightVisible,
            insightActive,
            insightHeading,
            sawActivity,
            activityVisible,
            activityText,
            selected: document.querySelector('#selectedTitle')?.textContent || ''
          });
          return;
        }
        setTimeout(check, 120);
      };
      check();
    })
  `);

  if (!analysisCheck.analysis.trim().length || analysisCheck.analysis.includes('点击 ◎ 分析素材')) {
    throw new Error(`Insight panel did not render analysis. Analysis: ${analysisCheck.analysis}. Logs: ${logs.join(' | ')}`);
  }
  if (!analysisCheck.insightVisible || !analysisCheck.insightActive) {
    throw new Error(`Insight panel did not become active. Visible: ${analysisCheck.insightVisible}. Active: ${analysisCheck.insightActive}. Logs: ${logs.join(' | ')}`);
  }
  if (!analysisCheck.insightHeading.includes('素材洞察')) {
    throw new Error(`Insight panel heading should be 素材洞察. Heading: ${analysisCheck.insightHeading}. Logs: ${logs.join(' | ')}`);
  }
  if (!analysisCheck.sawActivity) {
    throw new Error(`Activity toast was not shown during analysis. Current text: ${analysisCheck.activityText}. Logs: ${logs.join(' | ')}`);
  }

  const generated = await client.evaluate(`
    new Promise((resolve) => {
      document.querySelector('#generateBtn')?.click();
      const started = Date.now();
      const check = () => {
        const output = document.querySelector('#outputContent')?.innerText || '';
        const copyPanel = document.querySelector('[data-ops-panel="copy"]');
        const copyTab = [...document.querySelectorAll('[data-ops-tab]')].find((button) => button.textContent?.includes('文案优化'));
        const copyVisible = Boolean(copyPanel && !copyPanel.hidden);
        const copyActive = Boolean(copyTab && copyTab.classList.contains('is-active'));
        if (((output.includes('口播') || output.includes('版式')) && copyVisible && copyActive) || Date.now() - started > 12000) {
          resolve({
            output,
            copyVisible,
            copyActive,
            selected: document.querySelector('#selectedTitle')?.textContent || ''
          });
          return;
        }
        setTimeout(check, 120);
      };
      check();
    })
  `);

  if (!generated.output.includes('口播') && !generated.output.includes('版式')) {
    throw new Error(`Ad plan did not render. Output: ${generated.output}. Logs: ${logs.join(' | ')}`);
  }
  if (!generated.copyVisible || !generated.copyActive) {
    throw new Error(`Copy panel did not become active. Visible: ${generated.copyVisible}. Active: ${generated.copyActive}. Logs: ${logs.join(' | ')}`);
  }

  const deliveryCheck = await client.evaluate(`
    (() => {
      document.querySelector('[data-ops-tab="delivery"]')?.click();
      const deliveryPanel = document.querySelector('[data-ops-panel="delivery"]');
      const deliveryTab = document.querySelector('[data-ops-tab="delivery"]');
      const auditPanel = deliveryPanel?.querySelector('#audit');
      const standaloneAudit = document.querySelector('.workspace > .audit-panel');
      return {
        deliveryVisible: Boolean(deliveryPanel && !deliveryPanel.hidden),
        deliveryActive: Boolean(deliveryTab && deliveryTab.classList.contains('is-active')),
        auditInsideDelivery: Boolean(auditPanel),
        standaloneAudit: Boolean(standaloneAudit),
        heading: auditPanel?.querySelector('h2')?.textContent?.trim() || '',
        score: auditPanel?.querySelector('#auditScore')?.textContent?.trim() || ''
      };
    })()
  `);

  if (!deliveryCheck.deliveryVisible || !deliveryCheck.deliveryActive || !deliveryCheck.auditInsideDelivery) {
    throw new Error(`Delivery panel did not contain audit review. Result: ${JSON.stringify(deliveryCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (deliveryCheck.standaloneAudit) {
    throw new Error(`Audit review should not remain as a standalone workspace panel. Result: ${JSON.stringify(deliveryCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (!deliveryCheck.heading.includes('投放建议')) {
    throw new Error(`Delivery panel heading should be 投放建议. Result: ${JSON.stringify(deliveryCheck)}. Logs: ${logs.join(' | ')}`);
  }

  const actionCheck = await client.evaluate(`
    (async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      document.querySelector('#authModeBtn')?.click();
      await sleep(80);
      const authNote = document.querySelector('#sourceNote')?.textContent || '';
      const authFocused = document.activeElement?.id === 'csvInput';

      document.querySelector('a[data-ops-nav="copy"]')?.click();
      await sleep(80);
      const copyPanel = document.querySelector('[data-ops-panel="copy"]');
      const copyTab = document.querySelector('[data-ops-tab="copy"]');
      const outputNav = document.querySelector('a[data-ops-nav="copy"]');
      const copyVisible = Boolean(copyPanel && !copyPanel.hidden);
      const copyActive = Boolean(copyTab && copyTab.classList.contains('is-active'));
      const outputNavActive = Boolean(outputNav && outputNav.classList.contains('is-active'));

      document.querySelector('a[data-ops-nav="delivery"]')?.click();
      await sleep(80);
      const deliveryPanel = document.querySelector('[data-ops-panel="delivery"]');
      const deliveryTab = document.querySelector('[data-ops-tab="delivery"]');
      const auditNav = document.querySelector('a[data-ops-nav="delivery"]');

      const thumbs = [...document.querySelectorAll('#mediaThumbs .media-thumb')];
      thumbs[0]?.click();
      await sleep(40);

      return {
        authFocused,
        authNote,
        copyVisible,
        copyActive,
        outputNavActive,
        deliveryVisible: Boolean(deliveryPanel && !deliveryPanel.hidden),
        deliveryActive: Boolean(deliveryTab && deliveryTab.classList.contains('is-active')),
        auditNavActive: Boolean(auditNav && auditNav.classList.contains('is-active')),
        credentialPanelVisible: Boolean(document.querySelector('.credential-panel')),
        credentialFields: ['#credentialTitle', '#credentialType', '#credentialReference', '#credentialReviewer', '#credentialAddBtn', '#credentialExportBtn']
          .every((selector) => Boolean(document.querySelector(selector))),
        materialRightPanelVisible: Boolean(document.querySelector('[aria-label="material rights"]')),
        materialRightFields: ['#materialRightTitle', '#materialRightType', '#materialRightSource', '#materialRightScope', '#materialRightReference', '#materialRightAttachments', '#materialRightExpiresAt', '#materialRightBrandNames', '#materialRightBrandStatus', '#materialRightChannels', '#materialRightRegions', '#materialRightCampaign', '#materialRightReviewer', '#materialRightAddBtn', '#materialRightExportBtn', '#materialRightHistory']
          .every((selector) => Boolean(document.querySelector(selector))),
        batchFilterFields: ['#batchSearchInput', '#batchStatusFilter', '#batchIncludeArchived', '#batchLimitNote']
          .every((selector) => Boolean(document.querySelector(selector))),
        batchLimitText: document.querySelector('#batchLimitNote')?.textContent || '',
        thumbCount: thumbs.length,
        thumbTags: thumbs.map((thumb) => thumb.tagName),
        firstThumbPressed: thumbs[0]?.getAttribute('aria-pressed') || '',
        firstThumbActive: Boolean(thumbs[0]?.classList.contains('is-active'))
      };
    })()
  `);

  if (!actionCheck.authFocused || !actionCheck.authNote.includes('授权数据模式')) {
    throw new Error(`Auth mode button did not focus authorized import. Result: ${JSON.stringify(actionCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (!actionCheck.copyVisible || !actionCheck.copyActive || !actionCheck.outputNavActive) {
    throw new Error(`Output rail navigation did not open the copy/export panel. Result: ${JSON.stringify(actionCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (!actionCheck.deliveryVisible || !actionCheck.deliveryActive || !actionCheck.auditNavActive) {
    throw new Error(`Audit rail navigation did not open the delivery panel. Result: ${JSON.stringify(actionCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (!actionCheck.credentialPanelVisible || !actionCheck.credentialFields) {
    throw new Error(`Authorization credential panel did not render. Result: ${JSON.stringify(actionCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (!actionCheck.materialRightPanelVisible || !actionCheck.materialRightFields) {
    throw new Error(`Material rights panel did not render. Result: ${JSON.stringify(actionCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (!actionCheck.batchFilterFields || !actionCheck.batchLimitText) {
    throw new Error(`Batch search/archive controls did not render. Result: ${JSON.stringify(actionCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (actionCheck.thumbCount < 1 || !actionCheck.thumbTags.every((tag) => tag === 'BUTTON') || actionCheck.firstThumbPressed !== 'true' || !actionCheck.firstThumbActive) {
    throw new Error(`Media thumbnails should be functional preview buttons. Result: ${JSON.stringify(actionCheck)}. Logs: ${logs.join(' | ')}`);
  }

  const stackCheck = await client.evaluate(`
    (() => {
      const main = document.querySelector('.workspace-main');
      const children = [...(main?.children || [])].map((node) => node.id || [...node.classList].join('.'));
      const hero = document.querySelector('.workspace-main > .hero-panel');
      const product = document.querySelector('.workspace-main > .product-panel');
      const ops = document.querySelector('.workspace-main > #ops');
      const batch = document.querySelector('.workspace-main > #batch');
      const heroRect = hero?.getBoundingClientRect();
      const productRect = product?.getBoundingClientRect();
      const opsRect = ops?.getBoundingClientRect();
      const batchRect = batch?.getBoundingClientRect();
      return {
        children,
        hasMain: Boolean(main),
        opsInsideMain: Boolean(ops),
        batchInsideMain: Boolean(batch),
        standaloneBatch: Boolean(document.querySelector('.workspace > .batch-panel')),
        opsBeforeBatch: Boolean(ops && batch && (ops.compareDocumentPosition(batch) & Node.DOCUMENT_POSITION_FOLLOWING)),
        previewToOpsGap: heroRect && productRect && opsRect
          ? Math.round(opsRect.top - Math.max(heroRect.bottom, productRect.bottom))
          : null,
        opsToBatchGap: opsRect && batchRect
          ? Math.round(batchRect.top - opsRect.bottom)
          : null
      };
    })()
  `);

  if (!stackCheck.hasMain || !stackCheck.opsInsideMain || !stackCheck.batchInsideMain || stackCheck.standaloneBatch || !stackCheck.opsBeforeBatch) {
    throw new Error(`Workspace stack is not ordered correctly. Result: ${JSON.stringify(stackCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (stackCheck.previewToOpsGap === null || stackCheck.previewToOpsGap < 0 || stackCheck.previewToOpsGap > 40) {
    throw new Error(`Creative panel is not directly under the preview area. Result: ${JSON.stringify(stackCheck)}. Logs: ${logs.join(' | ')}`);
  }
  if (stackCheck.opsToBatchGap === null || stackCheck.opsToBatchGap < 0 || stackCheck.opsToBatchGap > 40) {
    throw new Error(`Batch panel is not directly under the creative area. Result: ${JSON.stringify(stackCheck)}. Logs: ${logs.join(' | ')}`);
  }

  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));

  console.log(JSON.stringify({
    ok: true,
    productCards: loaded.count,
    ruleLibrary,
    complianceApi: complianceApiCheck,
    images,
    delivery: deliveryCheck,
    actions: actionCheck,
    stack: stackCheck,
    securityHeaders,
    localApiSecurity,
    selected: generated.selected,
    screenshotPath,
    consoleLogs: logs
  }, null, 2));

  await client.close();
} finally {
  edge.kill();
  setTimeout(() => rm(profileDir, { recursive: true, force: true }).catch(() => null), 500);
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

async function readSecurityHeaders(url) {
  const response = await fetch(url);
  const setCookie = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie().join('; ')
    : response.headers.get('set-cookie') || '';
  return {
    status: response.status,
    sessionCookieSet: setCookie.includes('ad_workbench_session='),
    contentSecurityPolicy: response.headers.get('content-security-policy') || '',
    xContentTypeOptions: response.headers.get('x-content-type-options') || '',
    referrerPolicy: response.headers.get('referrer-policy') || '',
    xFrameOptions: response.headers.get('x-frame-options') || '',
    permissionsPolicy: response.headers.get('permissions-policy') || ''
  };
}

async function readLocalApiSecurity(url) {
  const unsafePost = await fetch(new URL('/api/open/output-dir', url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  const extensionWithoutMarker = await fetch(new URL('/api/import/extension-products', url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products: [] })
  });
  const forbiddenPayload = await unsafePost.json().catch(() => ({}));
  return {
    unsafePostStatus: unsafePost.status,
    extensionWithoutMarkerStatus: extensionWithoutMarker.status,
    error: forbiddenPayload.error || ''
  };
}

function assertSecurityHeaders(headers) {
  const csp = headers.contentSecurityPolicy;
  const requiredCsp = [
    "default-src 'self'",
    "script-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'"
  ];
  const missingCsp = requiredCsp.filter((rule) => !csp.includes(rule));
  if (headers.status < 200 || headers.status >= 300) {
    throw new Error(`Security header check failed: root response status ${headers.status}`);
  }
  if (!headers.sessionCookieSet) {
    throw new Error('Security header check failed: local API session cookie was not set by the workbench page');
  }
  if (missingCsp.length > 0) {
    throw new Error(`Security header check failed: missing CSP rules ${missingCsp.join(', ')}`);
  }
  if (headers.xContentTypeOptions.toLowerCase() !== 'nosniff') {
    throw new Error(`Security header check failed: X-Content-Type-Options=${headers.xContentTypeOptions || '(missing)'}`);
  }
  if (headers.referrerPolicy.toLowerCase() !== 'no-referrer') {
    throw new Error(`Security header check failed: Referrer-Policy=${headers.referrerPolicy || '(missing)'}`);
  }
  if (headers.xFrameOptions.toUpperCase() !== 'DENY') {
    throw new Error(`Security header check failed: X-Frame-Options=${headers.xFrameOptions || '(missing)'}`);
  }
  if (!headers.permissionsPolicy.includes('camera=()') || !headers.permissionsPolicy.includes('microphone=()')) {
    throw new Error(`Security header check failed: Permissions-Policy=${headers.permissionsPolicy || '(missing)'}`);
  }
}

function assertLocalApiSecurity(result) {
  if (result.unsafePostStatus !== 403) {
    throw new Error(`Local API security check failed: unauthenticated POST returned ${result.unsafePostStatus}`);
  }
  if (result.extensionWithoutMarkerStatus !== 403) {
    throw new Error(`Local API security check failed: extension import without marker returned ${result.extensionWithoutMarkerStatus}`);
  }
  if (result.error !== 'LOCAL_API_FORBIDDEN') {
    throw new Error(`Local API security check failed: unexpected forbidden payload ${JSON.stringify(result)}`);
  }
}

async function waitFor(check, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 120));
  }
  throw new Error('Timed out waiting for condition');
}
