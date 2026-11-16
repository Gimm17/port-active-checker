# ============================================================
#  Port Active Checker - Uninstall / Cleanup
#  Jalankan: powershell -ExecutionPolicy Bypass -File uninstall.ps1
# ============================================================

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host ""
Write-Host "  Port Active Checker - Uninstall" -ForegroundColor Cyan
Write-Host "  ================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kill running instances
$procs = Get-Process | Where-Object {
    $_.MainModule.FileName -like "*Port Active Checker*" -or
    $_.MainModule.FileName -like "*PortActiveChecker*"
}
if ($procs) {
    Write-Host "  [*] Menutup Port Active Checker yang sedang berjalan..." -ForegroundColor Yellow
    $procs | Stop-Process -Force
    Start-Sleep -Seconds 1
}

# 2. Folders to clean
$folders = @(
    (Join-Path $root "release"),
    (Join-Path $root "dist"),
    (Join-Path $root "dist-electron")
)

foreach ($dir in $folders) {
    if (Test-Path $dir) {
        Write-Host "  [x] Menghapus $dir" -ForegroundColor Red
        Remove-Item -LiteralPath $dir -Recurse -Force
    }
}

# 3. Check for leftover portable exe in common locations
$userDesktop = [Environment]::GetFolderPath('Desktop')
$userDownloads = Join-Path ([Environment]::GetFolderPath('UserProfile')) "Downloads"

foreach ($search in @($userDesktop, $userDownloads)) {
    $found = Get-ChildItem -LiteralPath $search -Filter "PortActiveChecker*.exe" -ErrorAction SilentlyContinue
    foreach ($file in $found) {
        Write-Host "  [?] Ditemukan: $($file.FullName)" -ForegroundColor Yellow
        $answer = Read-Host "      Hapus file ini? (y/n)"
        if ($answer -eq 'y') {
            Remove-Item -LiteralPath $file.FullName -Force
            Write-Host "      Dihapus." -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "  Selesai! Semua build output sudah dibersihkan." -ForegroundColor Green
Write-Host ""