const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Config ──────────────────────────────────────────────────────────
const APP_URL = 'https://orbit-xi-nine.vercel.app';
const WINDOW_STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

let mainWindow = null;
let tray = null;

// ── Window state persistence ────────────────────────────────────────
function loadWindowState() {
  try {
    if (fs.existsSync(WINDOW_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(WINDOW_STATE_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return { width: 1280, height: 800 };
}

function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  const state = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized: mainWindow.isMaximized(),
  };
  try {
    fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ── Create main window ──────────────────────────────────────────────
function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#FFFFFF',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.loadURL(APP_URL);

  // Save state on resize/move
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('close', saveWindowState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Tray ────────────────────────────────────────────────────────────
function createTray() {
  // Use a template image for macOS menu bar
  const iconPath = path.join(__dirname, 'trayTemplate.png');
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    // Fallback: create a simple 16x16 icon
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Andromeda');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Andromeda',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'CmdOrCtrl+Q',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    } else {
      createWindow();
    }
  });
}

// ── IPC: Native notifications ───────────────────────────────────────
ipcMain.on('show-notification', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body });
    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    notification.show();
  }
});

// ── App lifecycle ───────────────────────────────────────────────────
app.on('ready', () => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // On macOS, keep the app running in the tray
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
});
