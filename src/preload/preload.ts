import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc';
import type { ScanResult, TerminateMode, TerminateResult } from '../shared/types';

contextBridge.exposeInMainWorld('portApi', {
  scanPorts: (): Promise<ScanResult> => ipcRenderer.invoke(IPC_CHANNELS.scanPorts),
  terminateProcess: (pid: number, mode: TerminateMode): Promise<TerminateResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.terminateProcess, pid, mode),
  openProcessLocation: (pid: number): Promise<{ ok: boolean; message: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.openProcessLocation, pid),
  getAdminStatus: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.getAdminStatus)
});
