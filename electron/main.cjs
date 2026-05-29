// Electron main process for Bloop Maker.
// This is an ADDITIVE desktop wrapper — the web app (npm run dev / build) is unaffected.
// In dev it loads the Vite dev server; when packaged it loads the built dist/index.html.

const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

// Dev server URL is passed in by the `dev:electron` npm script. When packaged this is undefined.
const DEV_SERVER_URL = process.env.ELECTRON_START_URL;
const isDev = !app.isPackaged && !!DEV_SERVER_URL;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a1a2e',
    title: 'Bloop Maker',
    autoHideMenuBar: true, // hide the default menu bar (still accessible via Alt)
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // Web Audio, file inputs, and blob downloads all work with these secure defaults.
    },
  });

  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Open external links (e.g. soundfont download pages) in the user's real browser,
  // not inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// A minimal application menu so standard shortcuts (copy/paste, quit, fullscreen,
// reload, devtools) work natively. The app's own keyboard shortcuts are unaffected.
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [ isMac ? { role: 'close' } : { role: 'quit' } ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    // macOS: re-create a window when the dock icon is clicked and none are open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Quit on Windows/Linux when all windows are closed; stay alive on macOS (convention).
  if (process.platform !== 'darwin') app.quit();
});
