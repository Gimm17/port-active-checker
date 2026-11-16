import { execFile } from 'node:child_process';
import { shell } from 'electron';
import { buildReadyPorts, DEV_PORT_SET } from '../shared/devPorts';
import { classifyProcess, normalizeRawProcess } from '../shared/classifier';
import { parsePowerShellJson, toArray } from '../shared/powershellJson';
import type {
  PortEntry,
  RawConnection,
  RawProcess,
  ScanResult,
  ScanSummary,
  TerminateMode,
  TerminateResult
} from '../shared/types';

interface PowerShellPayload {
  Connections?: RawConnection | RawConnection[];
  Processes?: RawProcess | RawProcess[];
}

interface PowerShellError extends Error {
  stdout?: string;
  stderr?: string;
  code?: number | string | null;
}

function runPowerShell(script: string, timeout = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      {
        windowsHide: true,
        timeout,
        maxBuffer: 1024 * 1024 * 10
      },
      (error, stdout, stderr) => {
        if (error) {
          const powershellError = error as PowerShellError;
          powershellError.stdout = stdout;
          powershellError.stderr = stderr;
          reject(powershellError);
          return;
        }

        resolve(stdout);
      }
    );
  });
}

function emptySummary(): ScanSummary {
  return {
    totalActive: 0,
    localProjects: 0,
    devServices: 0,
    windowsApps: 0,
    systemProtected: 0,
    unknown: 0,
    readyFavoritePorts: 0,
    blockedFavoritePorts: 0
  };
}

function summarize(entries: PortEntry[], readyPorts: ReturnType<typeof buildReadyPorts>): ScanSummary {
  const summary = emptySummary();
  summary.totalActive = entries.length;
  summary.localProjects = entries.filter((entry) => entry.category === 'local-project').length;
  summary.devServices = entries.filter((entry) => entry.category === 'dev-service').length;
  summary.windowsApps = entries.filter((entry) => entry.category === 'windows-app').length;
  summary.systemProtected = entries.filter((entry) => entry.category === 'system-protected').length;
  summary.unknown = entries.filter((entry) => entry.category === 'unknown').length;
  summary.readyFavoritePorts = readyPorts.filter((entry) => !entry.isActive).length;
  summary.blockedFavoritePorts = readyPorts.filter((entry) => entry.isActive).length;
  return summary;
}

function makePortId(connection: RawConnection): string {
  return `${connection.LocalPort}-${connection.LocalAddress}-${connection.OwningProcess}`;
}

function normalizeConnection(connection: RawConnection): RawConnection {
  return {
    LocalAddress: String(connection.LocalAddress ?? ''),
    LocalPort: Number(connection.LocalPort),
    OwningProcess: Number(connection.OwningProcess),
    State: String(connection.State ?? 'Listen')
  };
}

function buildEntries(connections: RawConnection[], processes: RawProcess[]): PortEntry[] {
  const processByPid = new Map<number, RawProcess>();

  for (const process of processes) {
    if (Number.isInteger(process.ProcessId)) {
      processByPid.set(process.ProcessId, process);
    }
  }

  return connections
    .map(normalizeConnection)
    .filter((connection) => Number.isInteger(connection.LocalPort) && Number.isInteger(connection.OwningProcess))
    .map((connection) => {
      const process = normalizeRawProcess(processByPid.get(connection.OwningProcess), connection.OwningProcess);
      const classification = classifyProcess(process);

      return {
        id: makePortId(connection),
        localAddress: connection.LocalAddress,
        localPort: connection.LocalPort,
        state: connection.State,
        process,
        isDevFavorite: DEV_PORT_SET.has(connection.LocalPort),
        ...classification
      };
    })
    .sort((a, b) => a.localPort - b.localPort || a.process.pid - b.process.pid);
}

async function readPortSnapshot(): Promise<PowerShellPayload> {
  const script = `
$connections = Get-NetTCPConnection -State Listen |
  Select-Object @{Name='LocalAddress';Expression={[string]$_.LocalAddress}},
                @{Name='LocalPort';Expression={[int]$_.LocalPort}},
                @{Name='OwningProcess';Expression={[int]$_.OwningProcess}},
                @{Name='State';Expression={$_.State.ToString()}}

$processes = Get-CimInstance Win32_Process |
  Select-Object @{Name='ProcessId';Expression={[int]$_.ProcessId}},
                @{Name='Name';Expression={[string]$_.Name}},
                @{Name='ExecutablePath';Expression={$_.ExecutablePath}},
                @{Name='CommandLine';Expression={$_.CommandLine}}

[PSCustomObject]@{
  Connections = $connections
  Processes = $processes
} | ConvertTo-Json -Depth 5 -Compress
`;

  const stdout = await runPowerShell(script);
  return parsePowerShellJson<PowerShellPayload>(stdout) ?? {};
}

async function readProcessByPid(pid: number): Promise<RawProcess | undefined> {
  const script = `
$process = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" |
  Select-Object @{Name='ProcessId';Expression={[int]$_.ProcessId}},
                @{Name='Name';Expression={[string]$_.Name}},
                @{Name='ExecutablePath';Expression={$_.ExecutablePath}},
                @{Name='CommandLine';Expression={$_.CommandLine}}

$process | ConvertTo-Json -Depth 4 -Compress
`;

  const stdout = await runPowerShell(script, 8000);
  return parsePowerShellJson<RawProcess>(stdout) ?? undefined;
}

function validatePid(pid: unknown): number {
  const parsed = Number(pid);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 999999) {
    throw new Error('PID tidak valid.');
  }

  return parsed;
}

function isAccessDenied(error: unknown): boolean {
  const powershellError = error as PowerShellError;
  const message = `${powershellError.message ?? ''} ${powershellError.stderr ?? ''} ${powershellError.stdout ?? ''}`.toLowerCase();
  return message.includes('access is denied') || message.includes('akses ditolak') || message.includes('permission');
}

async function isProcessRunning(pid: number): Promise<boolean> {
  const process = await readProcessByPid(pid);
  return Boolean(process);
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function getAdminStatus(): Promise<boolean> {
  if (process.platform !== 'win32') {
    return false;
  }

  const script = `
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
`;
  const stdout = await runPowerShell(script, 5000);
  return stdout.trim().toLowerCase() === 'true';
}

export async function scanPorts(): Promise<ScanResult> {
  const scannedAt = new Date().toISOString();

  if (process.platform !== 'win32') {
    return {
      scannedAt,
      isWindows: false,
      isAdmin: false,
      ports: [],
      readyPorts: [],
      summary: emptySummary(),
      errors: ['Aplikasi ini hanya mendukung Windows.']
    };
  }

  const errors: string[] = [];
  let isAdmin = false;

  try {
    isAdmin = await getAdminStatus();
  } catch (error) {
    errors.push(`Gagal membaca status admin: ${(error as Error).message}`);
  }

  try {
    const snapshot = await readPortSnapshot();
    const connections = toArray(snapshot.Connections);
    const processes = toArray(snapshot.Processes);
    const ports = buildEntries(connections, processes);
    const readyPorts = buildReadyPorts(ports);

    return {
      scannedAt,
      isWindows: true,
      isAdmin,
      ports,
      readyPorts,
      summary: summarize(ports, readyPorts),
      errors
    };
  } catch (error) {
    return {
      scannedAt,
      isWindows: true,
      isAdmin,
      ports: [],
      readyPorts: [],
      summary: emptySummary(),
      errors: [...errors, `Gagal membaca port: ${(error as Error).message}`]
    };
  }
}

export async function terminateProcess(pidInput: unknown, modeInput: unknown): Promise<TerminateResult> {
  const pid = validatePid(pidInput);
  const mode: TerminateMode = modeInput === 'elevated' ? 'elevated' : 'normal';
  const rawProcess = await readProcessByPid(pid);

  if (!rawProcess) {
    return {
      ok: true,
      pid,
      mode,
      message: 'Process sudah tidak berjalan.',
      stillRunning: false
    };
  }

  const processInfo = normalizeRawProcess(rawProcess, pid);
  const classification = classifyProcess(processInfo);

  if (!classification.canTerminate) {
    return {
      ok: false,
      pid,
      mode,
      message: classification.terminateReason,
      stillRunning: true
    };
  }

  try {
    if (mode === 'elevated') {
      const script = `
$started = Start-Process -FilePath "powershell.exe" -Verb RunAs -Wait -PassThru -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  "Stop-Process -Id ${pid} -Force -ErrorAction Stop"
)
if ($started.ExitCode -ne 0) {
  throw "Elevated Stop-Process failed with exit code $($started.ExitCode)"
}
`;
      await runPowerShell(script, 60000);
    } else {
      await runPowerShell(`Stop-Process -Id ${pid} -Force -ErrorAction Stop`, 12000);
    }

    await wait(600);
    const stillRunning = await isProcessRunning(pid);

    return {
      ok: !stillRunning,
      pid,
      mode,
      message: stillRunning
        ? 'Perintah terminate selesai, tetapi process masih terdeteksi.'
        : 'Process berhasil dimatikan.',
      stillRunning
    };
  } catch (error) {
    if (mode === 'normal' && isAccessDenied(error)) {
      return {
        ok: false,
        pid,
        mode,
        message: 'Akses ditolak. Gunakan tombol Admin/UAC untuk mencoba lagi.',
        requiresElevation: true,
        stillRunning: true
      };
    }

    return {
      ok: false,
      pid,
      mode,
      message: `Gagal terminate process: ${(error as Error).message}`,
      stillRunning: true
    };
  }
}

export async function openProcessLocation(pidInput: unknown): Promise<{ ok: boolean; message: string }> {
  const pid = validatePid(pidInput);
  const rawProcess = await readProcessByPid(pid);

  if (!rawProcess?.ExecutablePath) {
    return {
      ok: false,
      message: 'Lokasi executable tidak tersedia untuk process ini.'
    };
  }

  shell.showItemInFolder(rawProcess.ExecutablePath);
  return {
    ok: true,
    message: 'Lokasi process dibuka.'
  };
}
