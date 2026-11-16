import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { IPC_CHANNELS } from '../shared/ipc';
import { getAdminStatus, openProcessLocation, scanPorts, terminateProcess } from './portService';

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1240,
    height: 780,
    minWidth: 1024,
    minHeight: 680,
    title: 'Port Active Checker',
    backgroundColor: '#f5f3eb',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle(IPC_CHANNELS.scanPorts, scanPorts);
  ipcMain.handle(IPC_CHANNELS.terminateProcess, (_event, pid, mode) => terminateProcess(pid, mode));
  ipcMain.handle(IPC_CHANNELS.openProcessLocation, (_event, pid) => openProcessLocation(pid));
  ipcMain.handle(IPC_CHANNELS.getAdminStatus, getAdminStatus);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
