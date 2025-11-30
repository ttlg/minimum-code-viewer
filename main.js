const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const fileWatchers = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e1e'
  });

  mainWindow.loadFile('index.html');

  // Create application menu
  const template = [
    {
      label: 'Peep',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: () => openFolder()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'copy' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function openFolder() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    const tree = buildFileTree(folderPath);
    mainWindow.webContents.send('folder-opened', { path: folderPath, tree });
  }
}

function buildFileTree(dirPath, relativePath = '') {
  const items = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    // Sort: directories first, then files, both alphabetically
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      // Skip common ignored directories
      if (entry.name === 'node_modules' ||
          entry.name === '__pycache__') {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const itemRelativePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        items.push({
          name: entry.name,
          path: fullPath,
          relativePath: itemRelativePath,
          type: 'directory',
          children: buildFileTree(fullPath, itemRelativePath)
        });
      } else {
        items.push({
          name: entry.name,
          path: fullPath,
          relativePath: itemRelativePath,
          type: 'file'
        });
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err);
  }

  return items;
}

// IPC handlers
ipcMain.handle('open-folder-dialog', async () => {
  await openFolder();
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Watch a file for changes
ipcMain.handle('watch-file', async (event, filePath) => {
  if (fileWatchers.has(filePath)) {
    return { success: true };
  }

  try {
    let lastMtime = null;

    const listener = (curr, prev) => {
      // Check if file was actually modified
      if (curr.mtime.getTime() !== prev.mtime.getTime()) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          mainWindow.webContents.send('file-changed', { path: filePath, content });
        } catch (err) {
          console.error(`Error reading changed file ${filePath}:`, err);
        }
      }
    };

    fs.watchFile(filePath, { interval: 300 }, listener);
    fileWatchers.set(filePath, listener);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Unwatch a file
ipcMain.handle('unwatch-file', async (event, filePath) => {
  const listener = fileWatchers.get(filePath);
  if (listener) {
    fs.unwatchFile(filePath, listener);
    fileWatchers.delete(filePath);
  }
  return { success: true };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
