// main.js — Main Electron Process
// Single BrowserWindow with <webview> tags for isolated Claude sessions.
// This approach keeps everything in one HTML document — no z-order issues.

const { app, BrowserWindow, ipcMain, Menu, shell, session } = require('electron');
const path = require('path');
const { buildMenu } = require('./menu');

// ─── Anti-Detection: Build a realistic Chrome fingerprint ────────────────────
const CHROME_VERSION = process.versions.chrome;
const CHROME_MAJOR = CHROME_VERSION.split('.')[0];

const SPOOFED_UA = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36`;
const SPOOFED_SEC_CH_UA = `"Chromium";v="${CHROME_MAJOR}", "Google Chrome";v="${CHROME_MAJOR}", "Not-A.Brand";v="24"`;

// Set globally before any windows are created
if (process.platform === 'darwin') {
  app.setName('Claude Connector');
}
app.userAgentFallback = SPOOFED_UA;

// ─── Global State ────────────────────────────────────────────────────────────
let mainWindow = null;

// ─── Anti-Detection: Configure each account session ──────────────────────────
function configureSession(partitionName) {
  const ses = session.fromPartition(partitionName);

  // Replace sec-ch-ua headers with realistic Chrome values
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    headers['sec-ch-ua'] = SPOOFED_SEC_CH_UA;
    headers['sec-ch-ua-mobile'] = '?0';
    headers['sec-ch-ua-platform'] = '"macOS"';
    headers['User-Agent'] = SPOOFED_UA;
    callback({ requestHeaders: headers });
  });

  // Permission handler
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ['clipboard-read', 'clipboard-write', 'notifications'];
    callback(allowed.includes(permission));
  });

  // Auto-intercept downloads to Vault
  ses.on('will-download', (event, item, webContents) => {
    const filename = item.getFilename();
    if (filename.endsWith('.md') || filename.endsWith('.txt')) {
      const downloadPath = path.join(vaultDir, filename);
      item.setSavePath(downloadPath);
      
      item.once('done', (event, state) => {
        if (state === 'completed' && mainWindow) {
          mainWindow.webContents.send('vault:auto-saved', filename);
        }
      });
    }
  });
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

// Configure a new session partition (called from renderer when webview is created)
ipcMain.handle('configure-session', (_event, partitionName) => {
  try {
    configureSession(partitionName);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Read scraper.js content (so renderer can inject it into webviews)
ipcMain.handle('get-scraper-script', () => {
  const fs = require('fs');
  return fs.readFileSync(path.join(__dirname, '../scripts/scraper.js'), 'utf-8');
});

// Read auto-paster.js content
ipcMain.handle('get-paster-script', () => {
  const fs = require('fs');
  return fs.readFileSync(path.join(__dirname, '../scripts/auto-paster.js'), 'utf-8');
});

// Open URL in system browser (for Google OAuth)
ipcMain.handle('open-external', (_event, url) => {
  shell.openExternal(url);
  return { success: true };
});

// ─── Vault Handlers ──────────────────────────────────────────────────────────

const fs = require('fs');
const vaultDir = path.join(__dirname, '../../vault');
if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir);

ipcMain.handle('vault:list', () => {
  try {
    const files = fs.readdirSync(vaultDir).filter(f => f.endsWith('.md'));
    return files.map(f => {
      const stats = fs.statSync(path.join(vaultDir, f));
      return { name: f, size: stats.size, mtime: stats.mtime };
    }).sort((a, b) => b.mtime - a.mtime); // Newest first
  } catch (err) {
    return [];
  }
});

ipcMain.handle('vault:save', (_event, filename, content) => {
  try {
    // Ensure filename ends with .md and sanitize
    const safeName = filename.replace(/[^a-z0-9_.-]/gi, '_');
    const finalName = safeName.endsWith('.md') ? safeName : safeName + '.md';
    fs.writeFileSync(path.join(vaultDir, finalName), content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('vault:read', (_event, filename) => {
  try {
    const content = fs.readFileSync(path.join(vaultDir, filename), 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('vault:delete', (_event, filename) => {
  try {
    fs.unlinkSync(path.join(vaultDir, filename));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

const { nativeImage } = require('electron');
ipcMain.on('vault:drag', (event, filename) => {
  console.log(`[Main] vault:drag triggered for ${filename}`);
  const filePath = path.join(vaultDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`[Main] File does not exist: ${filePath}`);
    return;
  }

  try {
    const iconPath = path.join(__dirname, '../../assets/drag-icon.icns');
    const icon = nativeImage.createFromPath(iconPath);
    
    console.log(`[Main] Calling event.sender.startDrag...`);
    event.sender.startDrag({
      file: filePath,
      icon: icon
    });
    console.log(`[Main] startDrag executed successfully`);
  } catch (err) {
    console.log(`[Main] Error during startDrag:`, err);
  }
});

// ─── App Lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Build native menu (required for Cmd+C/V on macOS)
  const menu = buildMenu();
  Menu.setApplicationMenu(menu);

  // Set macOS dock icon
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, '../../assets/icon.png'));
  }

  // Create the main window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Claude Connector',
    backgroundColor: '#0a0a1a',
    icon: path.join(__dirname, '../../assets/icon.png'),
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true, // Enable <webview> tags
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
