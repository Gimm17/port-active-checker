export type ProcessCategory =
  | 'local-project'
  | 'dev-service'
  | 'windows-app'
  | 'system-protected'
  | 'unknown';

export type RiskLevel = 'safe' | 'guarded' | 'danger' | 'blocked';

export type TerminateMode = 'normal' | 'elevated';

export interface RawConnection {
  LocalAddress: string;
  LocalPort: number;
  OwningProcess: number;
  State: string;
}

export interface RawProcess {
  ProcessId: number;
  Name: string | null;
  ExecutablePath?: string | null;
  CommandLine?: string | null;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  executablePath: string | null;
  commandLine: string | null;
}

export interface Classification {
  category: ProcessCategory;
  categoryLabel: string;
  risk: RiskLevel;
  riskLabel: string;
  canTerminate: boolean;
  terminateReason: string;
  tags: string[];
  isProtected: boolean;
  confidence: 'high' | 'medium' | 'low';
  projectHint?: string;
}

export interface PortEntry extends Classification {
  id: string;
  localAddress: string;
  localPort: number;
  state: string;
  process: ProcessInfo;
  isDevFavorite: boolean;
}

export interface ReadyPort {
  port: number;
  label: string;
  recommendation: string;
  isActive: boolean;
  alternatives: number[];
  activeEntry?: PortEntry;
}

export interface ScanSummary {
  totalActive: number;
  localProjects: number;
  devServices: number;
  windowsApps: number;
  systemProtected: number;
  unknown: number;
  readyFavoritePorts: number;
  blockedFavoritePorts: number;
}

export interface ScanResult {
  scannedAt: string;
  isWindows: boolean;
  isAdmin: boolean;
  ports: PortEntry[];
  readyPorts: ReadyPort[];
  summary: ScanSummary;
  errors: string[];
}

export interface TerminateResult {
  ok: boolean;
  pid: number;
  mode: TerminateMode;
  message: string;
  requiresElevation?: boolean;
  stillRunning?: boolean;
}
