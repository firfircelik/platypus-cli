$ErrorActionPreference = 'Stop'

$packageId = 'platypus'
$packageName = 'Platypus CLI'
$installDir = Join-Path $env:LOCALAPPDATA $packageId

Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🐥 Uninstalling Platypus CLI               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if installed
if (-not (Test-Path $installDir)) {
  Write-Host "⚠️  Platypus CLI is not installed" -ForegroundColor Yellow
  exit 0
}

Write-Host "📁 Removing installation directory..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $installDir
Write-Host "  ✓ Removed" -ForegroundColor Green

# Remove from PATH
Write-Host ""
Write-Host "🔧 Removing from PATH..." -ForegroundColor Yellow
$pathKey = [EnvironmentVariableTarget]::User
$pathVar = [Environment]::GetEnvironmentVariable("Path", $pathKey)
$binDir = "$installDir\node_modules\.bin"

if ($pathVar -like "*$binDir*") {
  $newPath = $pathVar -replace [regex]::Escape(";$binDir"), ''
  [Environment]::SetEnvironmentVariable("Path", $newPath, $pathKey)
  Write-Host "  ✓ Removed from user PATH" -ForegroundColor Green
} else {
  Write-Host "  ✓ Not in PATH" -ForegroundColor Green
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Uninstallation Complete!                     ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Thanks for using Platypus! 🐥" -ForegroundColor Yellow
