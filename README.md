<div align="center">

# 🔌 Port Active Checker

### Windows Desktop Utility for Inspecting Active Ports & Available Dev Ports

[![Electron](https://img.shields.io/badge/Electron-33-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://www.microsoft.com/windows)

*Scan live Windows TCP ports, classify running processes safely, find free development ports at a glance, and build a portable `.exe`.*

</div>

---

## ✨ Key Features

- **Live Windows Port Inspection** — Queries active TCP listeners and process metadata safely via hidden PowerShell execution (`src/main/portService.ts` + `src/shared/powershellJson.ts`).
- **Process Safety Classification** — Categorizes listeners into `localProjects`, `devServices`, `windowsApps`, `systemProtected`, or `unknown` (`src/shared/classifier.ts`) to prevent accidentally killing protected OS services.
- **50+ Dev & Database Port Catalog** — Instant lookup of ready/busy status across common frameworks and services (`React/Next.js 3000`, `Vite 5173`, `Laravel 8080`, `FastAPI/Django 8000`, `MySQL 3306`, `PostgreSQL 5432`, `Redis 6379`, `Docker`, `Kafka`, etc.) in `src/shared/devPorts.ts`.
- **Smart Port Suggestions** — Computes nearest available alternative ports (`getNearestAlternatives`) when your preferred port is occupied.
- **Portable Windows Build** — Packages into a single portable `x64` executable via `electron-builder`.

---

## 📁 Project Structure

```text
port-active-checker/
├── src/
│   ├── main/
│   │   ├── main.ts            # Electron main process & IPC handlers
│   │   └── portService.ts     # PowerShell TCP/process scanner & safe termination
│   ├── preload/
│   │   └── preload.ts         # ContextBridge API exposure
│   ├── renderer/
│   │   ├── App.tsx            # React 19 UI
│   │   ├── main.tsx
│   │   └── styles.css
│   └── shared/
│       ├── devPorts.ts        # Dev/DB port catalog & alternative finder
│       ├── classifier.ts      # Process safety & category classifier
│       ├── powershellJson.ts  # Resilient PowerShell JSON parser
│       ├── ipc.ts / types.ts
│       └── *.test.ts          # Vitest unit tests
├── scripts/
│   ├── dev.mjs                # Dev runner
│   └── clean.mjs              # Build cleanup
└── uninstall.ps1
```

---

## 🚀 Development & Build

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Typecheck renderer & Electron main
npm run typecheck

# Run unit tests (Vitest)
npm test

# Build & package portable Windows .exe (output in release/)
npm run dist
```
