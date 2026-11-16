import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  FolderOpen,
  Lock,
  Monitor,
  PlugZap,
  Power,
  RefreshCw,
  Search,
  Server,
  Shield,
  Terminal,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PortEntry, ProcessCategory, ReadyPort, RiskLevel, ScanResult, TerminateMode } from '../shared/types';

const CATEGORY_FILTERS: Array<{ value: 'all' | ProcessCategory | 'ready-ports'; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'local-project', label: 'Local Project' },
  { value: 'dev-service', label: 'Dev Service' },
  { value: 'windows-app', label: 'Windows App' },
  { value: 'system-protected', label: 'Protected' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'ready-ports', label: '✔ Ready Ports' }
];

const CATEGORY_ICONS: Record<ProcessCategory, typeof Terminal> = {
  'local-project': Terminal,
  'dev-service': Server,
  'windows-app': Monitor,
  'system-protected': Lock,
  unknown: AlertTriangle
};

function formatTime(value: string | undefined): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));
}

function riskTone(risk: RiskLevel): string {
  return `tone-${risk}`;
}

function categoryTone(category: ProcessCategory): string {
  return `category-${category}`;
}

function commandPreview(command: string | null): string {
  if (!command) {
    return 'Command line tidak tersedia';
  }

  return command.length > 132 ? `${command.slice(0, 132)}...` : command;
}

function sourceFolder(entry: PortEntry): string | null {
  if (entry.projectHint) {
    return entry.projectHint;
  }

  const execPath = entry.process.executablePath;

  if (execPath) {
    const lastSep = Math.max(execPath.lastIndexOf('\\'), execPath.lastIndexOf('/'));
    return lastSep > 0 ? execPath.slice(0, lastSep) : execPath;
  }

  return null;
}

function includesSearch(entry: PortEntry, query: string): boolean {
  if (!query.trim()) {
    return true;
  }

  const haystack = [
    entry.localPort,
    entry.localAddress,
    entry.process.pid,
    entry.process.name,
    entry.process.executablePath,
    entry.process.commandLine,
    entry.categoryLabel,
    entry.riskLabel,
    entry.projectHint
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

function Metric({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Activity;
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <div className={`metric ${tone ?? ''}`}>
      <Icon size={18} aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function PortRow({
  entry,
  selected,
  onSelect
}: {
  entry: PortEntry;
  selected: boolean;
  onSelect: (entry: PortEntry) => void;
}) {
  const Icon = CATEGORY_ICONS[entry.category];

  return (
    <button className={`port-row ${selected ? 'selected' : ''}`} onClick={() => onSelect(entry)} type="button">
      <span className="port-number">{entry.localPort}</span>
      <span className="address">{entry.localAddress}</span>
      <span className="process-cell">
        <Icon size={16} aria-hidden="true" />
        <span>
          <strong>{entry.process.name}</strong>
          <small>PID {entry.process.pid}</small>
        </span>
      </span>
      <span className="source-cell" title={sourceFolder(entry) ?? ''}>
        {sourceFolder(entry) ?? <span className="na">-</span>}
      </span>
      <span className={`pill ${categoryTone(entry.category)}`}>{entry.categoryLabel}</span>
      <span className={`pill ${riskTone(entry.risk)}`}>{entry.riskLabel}</span>
    </button>
  );
}

function ReadyPorts({ scan }: { scan: ScanResult | null }) {
  if (!scan) {
    return (
      <section className="ready-strip" aria-label="Ready ports">
        {Array.from({ length: 7 }).map((_, index) => (
          <div className="ready-skeleton" key={index} />
        ))}
      </section>
    );
  }

  return (
    <section className="ready-strip" aria-label="Ready ports">
      {scan.readyPorts.map((item) => (
        <div className={`ready-item ${item.isActive ? 'busy' : 'ready'}`} key={item.port}>
          <div>
            <strong>{item.port}</strong>
            <span>{item.label}</span>
          </div>
          {item.isActive ? (
            <small>Alt {item.alternatives.join(', ')}</small>
          ) : (
            <small>Ready</small>
          )}
        </div>
      ))}
    </section>
  );
}

function DetailPanel({
  entry,
  actionMessage,
  confirmingMode,
  onConfirmMode,
  onCancelConfirm,
  onTerminate,
  onOpenLocation,
  busy
}: {
  entry: PortEntry | undefined;
  actionMessage: string;
  confirmingMode: TerminateMode | null;
  onConfirmMode: (mode: TerminateMode) => void;
  onCancelConfirm: () => void;
  onTerminate: (mode: TerminateMode) => void;
  onOpenLocation: () => void;
  busy: boolean;
}) {
  if (!entry) {
    return (
      <aside className="detail-panel empty">
        <PlugZap size={32} aria-hidden="true" />
        <p>Pilih port untuk melihat detail process.</p>
      </aside>
    );
  }

  const Icon = CATEGORY_ICONS[entry.category];

  return (
    <aside className="detail-panel">
      <div className="detail-title">
        <div>
          <span className="eyebrow">Port {entry.localPort}</span>
          <h2>{entry.process.name}</h2>
        </div>
        <span className={`icon-badge ${categoryTone(entry.category)}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
      </div>

      <div className="detail-badges">
        <span className={`pill ${categoryTone(entry.category)}`}>{entry.categoryLabel}</span>
        <span className={`pill ${riskTone(entry.risk)}`}>{entry.riskLabel}</span>
      </div>

      <p className="reason">{entry.terminateReason}</p>

      <div className="action-bar">
        <button
          className="primary danger"
          disabled={!entry.canTerminate || busy}
          onClick={() => onConfirmMode('normal')}
          title="Matikan process"
          type="button"
        >
          <Power size={16} aria-hidden="true" />
          Matikan
        </button>
        <button
          className="secondary"
          disabled={!entry.canTerminate || busy}
          onClick={() => onConfirmMode('elevated')}
          title="Jalankan terminate dengan UAC"
          type="button"
        >
          <Shield size={16} aria-hidden="true" />
          Admin/UAC
        </button>
        <button
          className="secondary icon-only"
          disabled={!entry.process.executablePath || busy}
          onClick={onOpenLocation}
          title="Buka lokasi executable"
          type="button"
        >
          <FolderOpen size={16} aria-hidden="true" />
        </button>
      </div>

      {confirmingMode && (
        <div className="confirm-strip">
          <AlertTriangle size={17} aria-hidden="true" />
          <span>{confirmingMode === 'elevated' ? 'Terminate dengan UAC?' : 'Terminate process ini?'}</span>
          <button disabled={busy} onClick={() => onTerminate(confirmingMode)} type="button">
            Ya
          </button>
          <button disabled={busy} onClick={onCancelConfirm} type="button">
            Batal
          </button>
        </div>
      )}

      {actionMessage && <div className="action-message">{actionMessage}</div>}

      <dl className="info-grid">
        <div>
          <dt>PID</dt>
          <dd>{entry.process.pid}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>{entry.localAddress}</dd>
        </div>
        <div>
          <dt>State</dt>
          <dd>{entry.state}</dd>
        </div>
        <div>
          <dt>Favorite</dt>
          <dd>{entry.isDevFavorite ? 'Ya' : 'Tidak'}</dd>
        </div>
      </dl>

      <div className="detail-block">
        <span>Executable</span>
        <p>{entry.process.executablePath ?? 'Tidak tersedia'}</p>
      </div>

      {entry.projectHint && (
        <div className="detail-block">
          <span>Project hint</span>
          <p>{entry.projectHint}</p>
        </div>
      )}

      <div className="detail-block">
        <span>Command line</span>
        <pre>{entry.process.commandLine ?? 'Tidak tersedia'}</pre>
      </div>
    </aside>
  );
}

export function App() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | ProcessCategory | 'ready-ports'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [confirmingMode, setConfirmingMode] = useState<TerminateMode | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextScan = await window.portApi.scanPorts();
      setScan(nextScan);
      setSelectedId((current) => {
        if (current && nextScan.ports.some((entry) => entry.id === current)) {
          return current;
        }
        return nextScan.ports[0]?.id ?? '';
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) {
      return undefined;
    }

    const handle = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => window.clearInterval(handle);
  }, [autoRefresh, refresh]);

  const isReadyView = category === 'ready-ports';

  const filteredPorts = useMemo(() => {
    if (isReadyView) {
      return [];
    }

    const ports = scan?.ports ?? [];
    return ports.filter((entry) => {
      const categoryMatch = category === 'all' || entry.category === category;
      return categoryMatch && includesSearch(entry, query);
    });
  }, [category, isReadyView, query, scan]);

  const filteredReadyPorts = useMemo(() => {
    if (!isReadyView) {
      return [];
    }

    const readyPorts = scan?.readyPorts ?? [];
    if (!query.trim()) {
      return readyPorts;
    }

    const lowerQuery = query.trim().toLowerCase();
    return readyPorts.filter((item) =>
      [item.port, item.label, item.recommendation].filter(Boolean).join(' ').toLowerCase().includes(lowerQuery)
    );
  }, [isReadyView, query, scan]);

  const selected = useMemo(() => {
    return (scan?.ports ?? []).find((entry) => entry.id === selectedId) ?? filteredPorts[0];
  }, [filteredPorts, scan?.ports, selectedId]);

  const handleSelect = (entry: PortEntry) => {
    setSelectedId(entry.id);
    setConfirmingMode(null);
    setActionMessage('');
  };

  const terminate = async (mode: TerminateMode) => {
    if (!selected) {
      return;
    }

    setBusyAction(true);
    try {
      const result = await window.portApi.terminateProcess(selected.process.pid, mode);
      setActionMessage(result.message);
      setConfirmingMode(result.requiresElevation ? 'elevated' : null);
      await refresh();
    } finally {
      setBusyAction(false);
    }
  };

  const openLocation = async () => {
    if (!selected) {
      return;
    }

    const result = await window.portApi.openProcessLocation(selected.process.pid);
    setActionMessage(result.message);
  };

  const errors = scan?.errors ?? [];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Windows Port Utility</span>
          <h1>Port Active Checker</h1>
        </div>

        <div className="toolbar">
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari port, PID, process, command"
            />
          </label>
          <button className="secondary" disabled={loading} onClick={() => void refresh()} type="button">
            <RefreshCw className={loading ? 'spin' : ''} size={16} aria-hidden="true" />
            Refresh
          </button>
          <label className="switch">
            <input checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} type="checkbox" />
            <span />
            Auto
          </label>
          <span className={`admin-badge ${scan?.isAdmin ? 'active' : ''}`}>
            <Shield size={15} aria-hidden="true" />
            {scan?.isAdmin ? 'Admin' : 'Normal'}
          </span>
        </div>
      </header>

      <section className="summary-strip" aria-label="Ringkasan port">
        <Metric icon={Activity} label="Active" value={scan?.summary.totalActive ?? '-'} />
        <Metric icon={Terminal} label="Local Project" value={scan?.summary.localProjects ?? '-'} tone="green" />
        <Metric icon={Server} label="Dev Service" value={scan?.summary.devServices ?? '-'} tone="blue" />
        <Metric icon={Lock} label="Protected" value={scan?.summary.systemProtected ?? '-'} tone="red" />
        <Metric icon={CheckCircle2} label="Ready Favorite" value={scan?.summary.readyFavoritePorts ?? '-'} tone="green" />
        <Metric icon={XCircle} label="Busy Favorite" value={scan?.summary.blockedFavoritePorts ?? '-'} tone="amber" />
      </section>

      <ReadyPorts scan={scan} />

      {errors.length > 0 && (
        <section className="error-strip">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{errors.join(' ')}</span>
        </section>
      )}

      <section className="workspace">
        <div className="list-panel">
          <div className="list-head">
            <div>
              <span className="eyebrow">Scan {formatTime(scan?.scannedAt)}</span>
              <h2>Listening ports</h2>
            </div>
            <select value={category} onChange={(event) => setCategory(event.target.value as 'all' | ProcessCategory | 'ready-ports')}>
              {CATEGORY_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {!isReadyView && (
            <div className="table-head" aria-hidden="true">
              <span>Port</span>
              <span>Address</span>
              <span>Process</span>
              <span>Source</span>
              <span>Kategori</span>
              <span>Risk</span>
            </div>
          )}

          {isReadyView && (
            <div className="table-head ready-head" aria-hidden="true">
              <span>Port</span>
              <span>Label</span>
              <span>Recommendation</span>
              <span>Status</span>
            </div>
          )}

          <div className="port-list">
            {!isReadyView && filteredPorts.map((entry) => (
              <PortRow entry={entry} key={entry.id} onSelect={handleSelect} selected={entry.id === selected?.id} />
            ))}

            {isReadyView && filteredReadyPorts.map((item) => (
              <div className={`ready-port-row ${item.isActive ? 'busy' : 'available'}`} key={item.port}>
                <span className="port-number">{item.port}</span>
                <span className="ready-label">{item.label}</span>
                <span className="ready-recommendation">{item.recommendation}</span>
                <span className={`pill ${item.isActive ? 'tone-danger' : 'tone-safe'}`}>
                  {item.isActive ? 'Busy' : 'Ready'}
                </span>
                {item.isActive && item.alternatives.length > 0 && (
                  <span className="ready-alt">Alt: {item.alternatives.join(', ')}</span>
                )}
              </div>
            ))}

            {!isReadyView && !loading && filteredPorts.length === 0 && (
              <div className="empty-list">
                <Cpu size={28} aria-hidden="true" />
                <span>Tidak ada port yang cocok.</span>
              </div>
            )}

            {isReadyView && filteredReadyPorts.length === 0 && (
              <div className="empty-list">
                <Cpu size={28} aria-hidden="true" />
                <span>Tidak ada ready port yang cocok.</span>
              </div>
            )}

            {loading && !scan && (
              <div className="empty-list">
                <RefreshCw className="spin" size={28} aria-hidden="true" />
                <span>Membaca port Windows...</span>
              </div>
            )}
          </div>
        </div>

        <DetailPanel
          actionMessage={actionMessage}
          busy={busyAction}
          confirmingMode={confirmingMode}
          entry={selected}
          onCancelConfirm={() => setConfirmingMode(null)}
          onConfirmMode={(mode) => setConfirmingMode(mode)}
          onOpenLocation={() => void openLocation()}
          onTerminate={(mode) => void terminate(mode)}
        />
      </section>

      <footer className="footer-line">
        <span>{isReadyView ? filteredReadyPorts.length : filteredPorts.length} ditampilkan</span>
        <span>Portable build target: `.exe`</span>
      </footer>
    </main>
  );
}
