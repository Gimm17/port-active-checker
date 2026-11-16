import type { ScanResult, TerminateMode, TerminateResult } from '../shared/types';

declare global {
  interface Window {
    portApi: {
      scanPorts: () => Promise<ScanResult>;
      terminateProcess: (pid: number, mode: TerminateMode) => Promise<TerminateResult>;
      openProcessLocation: (pid: number) => Promise<{ ok: boolean; message: string }>;
      getAdminStatus: () => Promise<boolean>;
    };
  }
}

export {};
