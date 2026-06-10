const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEFAULT_PORT = 4173;
const LOCAL_HOST = '127.0.0.1';
const APP_ICON = path.join(__dirname, 'assets', 'icon.ico');

let mainWindow;
let serverHandle;

app.setName('爆品广告工作台');

app.whenReady().then(async () => {
  try {
    const serverInfo = await startWorkbenchServer();
    createMainWindow(serverInfo.url);
  } catch (error) {
    dialog.showErrorBox('启动失败', error instanceof Error ? error.message : String(error));
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow && serverHandle) {
    createMainWindow(`http://${LOCAL_HOST}:${DEFAULT_PORT}`);
  }
});

app.on('before-quit', () => {
  if (serverHandle?.listening) {
    serverHandle.close();
  }
});

async function startWorkbenchServer() {
  process.env.PORT = String(DEFAULT_PORT);
  process.env.AD_WORKBENCH_USER_DATA_DIR = app.getPath('userData');
  process.env.AD_WORKBENCH_EXTENSION_DIR = app.isPackaged
    ? path.join(process.resourcesPath, 'edge-extension')
    : path.join(__dirname, '..', 'edge-extension');

  const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');
  try {
    const { startServer } = await import(pathToFileURL(serverModulePath).href);
    const info = await startServer({ port: DEFAULT_PORT, host: LOCAL_HOST });
    serverHandle = info.server;
    return info;
  } catch (error) {
    if (error?.code === 'EADDRINUSE' && await isExistingWorkbenchHealthy()) {
      return { url: `http://${LOCAL_HOST}:${DEFAULT_PORT}` };
    }
    throw error;
  }
}

async function isExistingWorkbenchHealthy() {
  try {
    const response = await fetch(`http://${LOCAL_HOST}:${DEFAULT_PORT}/api/health`);
    const data = await response.json();
    return Boolean(response.ok && data.ok);
  } catch {
    return false;
  }
}

function createMainWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 1120,
    minHeight: 760,
    title: '爆品广告工作台',
    icon: APP_ICON,
    backgroundColor: '#f6f7f4',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.loadURL(url);

  mainWindow.webContents.setWindowOpenHandler(({ url: nextUrl }) => {
    shell.openExternal(nextUrl);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, nextUrl) => {
    if (!nextUrl.startsWith(`http://localhost:${DEFAULT_PORT}`) && !nextUrl.startsWith(`http://127.0.0.1:${DEFAULT_PORT}`)) {
      event.preventDefault();
      shell.openExternal(nextUrl);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}
