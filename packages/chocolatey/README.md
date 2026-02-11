# Chocolatey Package for Platypus CLI

This directory contains the Chocolatey package manifest for Platypus CLI.

## Files

- `platypus.nuspec` - Package metadata
- `tools/install.ps1` - Installation script
- `tools/uninstall.ps1` - Uninstallation script

## Installation

To test the package locally:

```powershell
# Build the package
choco pack

# Install locally
choco install platypus -s .

# Uninstall
choco uninstall platypus
```

## Publishing

To publish to Chocolatey community feed:

```powershell
# 1. Update version in platypus.nuspec
# 2. Calculate checksum: choco checksum platypus-cli-*.tgz
# 3. Build package: choco pack
# 4. Push to feed: choco push platypus.x.x.x.nupkg -s https://push.chocolatey.org/
```

## Requirements

- Node.js 20+ (handled as dependency)
- Windows PowerShell 5.1+
