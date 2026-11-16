import type { Classification, ProcessInfo, RawProcess } from './types';

const CATEGORY_LABELS = {
  'local-project': 'Local Project',
  'dev-service': 'Dev Service',
  'windows-app': 'Windows App',
  'system-protected': 'System Protected',
  unknown: 'Unknown'
} as const;

const SYSTEM_NAMES = new Set([
  'system idle process',
  'system',
  'secure system',
  'registry',
  'smss.exe',
  'csrss.exe',
  'wininit.exe',
  'winlogon.exe',
  'services.exe',
  'lsass.exe',
  'lsm.exe',
  'svchost.exe',
  'fontdrvhost.exe',
  'dwm.exe',
  'memory compression'
]);

const LOCAL_PROJECT_NAMES = new Set([
  'node.exe',
  'npm.exe',
  'npx.exe',
  'pnpm.exe',
  'yarn.exe',
  'bun.exe',
  'deno.exe',
  'python.exe',
  'pythonw.exe',
  'php.exe',
  'java.exe',
  'dotnet.exe',
  'ruby.exe'
]);

const DEV_SERVICE_NAMES = new Set([
  'mysqld.exe',
  'postgres.exe',
  'redis-server.exe',
  'mongod.exe',
  'docker.exe',
  'com.docker.backend.exe',
  'nginx.exe',
  'httpd.exe',
  'apache.exe',
  'xampp-control.exe',
  'memcached.exe',
  'rabbitmq-server.exe',
  'erl.exe'
]);

const WINDOWS_APP_NAMES = new Set([
  'onedrive.exe',
  'onedrive.sync.service.exe',
  'anydesk.exe',
  'code.exe',
  'chrome.exe',
  'msedge.exe',
  'firefox.exe',
  'brave.exe',
  'postman.exe',
  'discord.exe',
  'teams.exe',
  'slack.exe',
  'zoom.exe',
  'notepad.exe',
  'powershell.exe',
  'pwsh.exe',
  'cmd.exe',
  'windows-terminal.exe'
]);

const LOCAL_PROJECT_MARKERS = [
  'vite',
  'next',
  'next dev',
  'react-scripts',
  'webpack-dev-server',
  'nodemon',
  'ts-node',
  'tsx',
  'npm run',
  'pnpm',
  'yarn dev',
  '-m uvicorn',
  'uvicorn',
  'flask',
  'django',
  'manage.py runserver',
  'php -s',
  'artisan serve',
  'server.php',
  'dotnet watch',
  'spring-boot',
  'bootrun'
];

const DEV_SERVICE_MARKERS = [
  'mysql',
  'mariadb',
  'postgres',
  'redis',
  'mongodb',
  'mongod',
  'xampp',
  'docker',
  'nginx',
  'apache',
  'httpd',
  'rabbitmq',
  'memcached'
];

function lower(value: string | null | undefined): string {
  return (value ?? '').toLowerCase();
}

function includesAny(value: string, markers: string[]): boolean {
  return markers.some((marker) => value.includes(marker));
}

function cleanCommand(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.replace(/\s+/g, ' ').trim();
}


const SCRIPT_EXTENSIONS = /\.(py|js|ts|mjs|cjs|php|rb|pl|go|rs|java|jar)\b/i;

function extractScriptFolder(commandLine: string): string | undefined {
  const tokens = commandLine.match(/(?:"([^"]+)"|(\S+))/g);

  if (!tokens) {
    return undefined;
  }

  for (const token of tokens) {
    const clean = token.replace(/^"|"$/g, '');

    if (!SCRIPT_EXTENSIONS.test(clean)) {
      continue;
    }

    const normalized = clean.replace(/\//g, '\\');
    const lastSep = normalized.lastIndexOf('\\');

    if (lastSep > 0) {
      return normalized.slice(0, lastSep);
    }
  }

  return undefined;
}

function detectProjectHint(process: ProcessInfo): string | undefined {
  const source = `${process.commandLine ?? ''} ${process.executablePath ?? ''}`;
  const lowerSource = source.toLowerCase();

  for (const marker of ['\\node_modules\\', '\\vendor\\', '\\manage.py']) {
    const markerIndex = lowerSource.indexOf(marker);

    if (markerIndex > 0) {
      const driveMatches = [...source.slice(0, markerIndex).matchAll(/[a-z]:\\/gi)];
      const nearestDrive = driveMatches.at(-1);

      if (nearestDrive?.index !== undefined) {
        return source.slice(nearestDrive.index, marker === '\\manage.py' ? markerIndex : markerIndex).trim();
      }
    }
  }

  if (process.commandLine) {
    const scriptFolder = extractScriptFolder(process.commandLine);

    if (scriptFolder) {
      return scriptFolder;
    }
  }

  return undefined;
}

function makeClassification(overrides: Omit<Classification, 'categoryLabel'>): Classification {
  return {
    ...overrides,
    categoryLabel: CATEGORY_LABELS[overrides.category]
  };
}

export function normalizeRawProcess(raw: RawProcess | undefined, fallbackPid: number): ProcessInfo {
  return {
    pid: raw && Number.isInteger(raw.ProcessId) ? raw.ProcessId : fallbackPid,
    name: raw?.Name?.trim() || `PID ${fallbackPid}`,
    executablePath: raw?.ExecutablePath?.trim() || null,
    commandLine: cleanCommand(raw?.CommandLine)
  };
}

export function classifyProcess(process: ProcessInfo): Classification {
  const processName = lower(process.name);
  const commandLine = lower(process.commandLine);
  const executablePath = lower(process.executablePath);
  const combined = `${processName} ${commandLine} ${executablePath}`;

  if (process.pid <= 4 || SYSTEM_NAMES.has(processName)) {
    return makeClassification({
      category: 'system-protected',
      risk: 'blocked',
      riskLabel: 'Blocked',
      canTerminate: false,
      terminateReason: 'Proses inti Windows. Tidak boleh dimatikan dari aplikasi ini.',
      tags: ['Windows core', 'Protected'],
      isProtected: true,
      confidence: 'high'
    });
  }

  if (LOCAL_PROJECT_NAMES.has(processName) && (includesAny(combined, LOCAL_PROJECT_MARKERS) || extractScriptFolder(process.commandLine ?? ''))) {
    return makeClassification({
      category: 'local-project',
      risk: 'safe',
      riskLabel: 'Safe',
      canTerminate: true,
      terminateReason: 'Terlihat seperti development server lokal.',
      tags: ['Local dev', 'Project'],
      isProtected: false,
      confidence: 'high',
      projectHint: detectProjectHint(process)
    });
  }

  if (DEV_SERVICE_NAMES.has(processName) || includesAny(combined, DEV_SERVICE_MARKERS)) {
    return makeClassification({
      category: 'dev-service',
      risk: 'guarded',
      riskLabel: 'Guarded',
      canTerminate: true,
      terminateReason: 'Service development. Matikan hanya jika tidak sedang dipakai project lain.',
      tags: ['Service', 'Database/Runtime'],
      isProtected: false,
      confidence: DEV_SERVICE_NAMES.has(processName) ? 'high' : 'medium'
    });
  }

  if (
    WINDOWS_APP_NAMES.has(processName) ||
    executablePath.includes('\\program files\\') ||
    executablePath.includes('\\program files (x86)\\') ||
    executablePath.includes('\\windowsapps\\')
  ) {
    return makeClassification({
      category: 'windows-app',
      risk: 'guarded',
      riskLabel: 'Guarded',
      canTerminate: true,
      terminateReason: 'Aplikasi Windows/user app. Pastikan tidak ada pekerjaan aktif sebelum dimatikan.',
      tags: ['Windows app'],
      isProtected: false,
      confidence: WINDOWS_APP_NAMES.has(processName) ? 'high' : 'medium'
    });
  }

  return makeClassification({
    category: 'unknown',
    risk: 'danger',
    riskLabel: 'Unknown',
    canTerminate: true,
    terminateReason: 'Proses tidak dikenali. Butuh konfirmasi ekstra sebelum dimatikan.',
    tags: ['Unknown'],
    isProtected: false,
    confidence: 'low',
    projectHint: detectProjectHint(process)
  });
}
