const packageJson = require('./package.json');

const baseBuild = packageJson.build ?? {};
const baseWin = baseBuild.win ?? {};
const baseNsis = baseBuild.nsis ?? {};
const productName = baseBuild.productName ?? packageJson.productName ?? '爆品广告工作台';
const version = packageJson.version ?? '0.1.1';

const cscLink = process.env.CSC_LINK || process.env.WIN_CSC_LINK || null;
const cscKeyPassword = process.env.CSC_KEY_PASSWORD || process.env.WIN_CSC_KEY_PASSWORD || null;
const certificateSubjectName =
  process.env.WIN_CSC_CERTIFICATE_SUBJECT_NAME || process.env.CSC_CERTIFICATE_SUBJECT_NAME || null;
const certificateSha1 = process.env.WIN_CSC_CERTIFICATE_SHA1 || process.env.CSC_CERTIFICATE_SHA1 || null;
const requireCodeSigning = process.env.CODE_SIGNING_REQUIRED === '1';

if (requireCodeSigning && !cscLink && !certificateSubjectName && !certificateSha1) {
  throw new Error(
    'CODE_SIGNING_REQUIRED=1，但未提供 Windows 代码签名证书。请设置 WIN_CSC_LINK/CSC_LINK 与 WIN_CSC_KEY_PASSWORD/CSC_KEY_PASSWORD，或提供 WIN_CSC_CERTIFICATE_SUBJECT_NAME / WIN_CSC_CERTIFICATE_SHA1。'
  );
}

const winConfig = {
  ...baseWin,
  icon: baseWin.icon ?? 'build/icon.ico',
  target: baseWin.target ?? ['nsis']
};

if (certificateSubjectName || certificateSha1) {
  winConfig.signtoolOptions = {
    ...(baseWin.signtoolOptions ?? {}),
    ...(certificateSubjectName ? { certificateSubjectName } : {}),
    ...(certificateSha1 ? { certificateSha1 } : {})
  };
}

module.exports = {
  ...baseBuild,
  ...(cscLink || baseBuild.cscLink ? { cscLink: cscLink ?? baseBuild.cscLink } : {}),
  ...(cscKeyPassword || baseBuild.cscKeyPassword ? { cscKeyPassword: cscKeyPassword ?? baseBuild.cscKeyPassword } : {}),
  forceCodeSigning: requireCodeSigning || baseBuild.forceCodeSigning || false,
  win: winConfig,
  nsis: {
    ...baseNsis,
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    menuCategory: baseNsis.menuCategory ?? productName,
    shortcutName: baseNsis.shortcutName ?? productName,
    uninstallDisplayName: baseNsis.uninstallDisplayName ?? `${productName} ${version}`,
    installerIcon: baseNsis.installerIcon ?? 'build/icon.ico',
    uninstallerIcon: baseNsis.uninstallerIcon ?? 'build/icon.ico',
    include: baseNsis.include ?? 'build/installer.nsh',
    artifactName: baseNsis.artifactName ?? '${productName} Setup ${version}.${ext}',
    runAfterFinish: baseNsis.runAfterFinish ?? true,
    selectPerMachineByDefault: baseNsis.selectPerMachineByDefault ?? false
  }
};
