# Platypus CLI - Package Distribution

This directory contains all package manager manifests for distributing Platypus CLI across different platforms.

## 📦 Packages Overview

| Package        | Platform          | Status   | Files                  |
| -------------- | ----------------- | -------- | ---------------------- |
| **npm**        | Cross-platform    | ✅ Ready | Root `package.json`    |
| **Homebrew**   | macOS, Linux      | ✅ Ready | `homebrew/platypus.rb` |
| **Scoop**      | Windows           | ✅ Ready | `scoop/platypus.json`  |
| **Chocolatey** | Windows           | ✅ Ready | `chocolatey/*`         |
| **AUR**        | Arch Linux        | ✅ Ready | `aur/PKGBUILD`         |
| **mise**       | Cross-platform    | ✅ Ready | `mise/mise.toml`       |
| **nix**        | Cross-platform    | ✅ Ready | `nix/*.nix`            |
| **Desktop**    | macOS, Win, Linux | ✅ Ready | `desktop/*`            |

## 🚀 Publishing Guide

### 1. npm (First Step)

```bash
# Publish to npm
npm publish

# Test installation
npm install -g platypus-cli@latest
```

### 2. Homebrew Tap

```bash
# Create GitHub repo: anomalyco/homebrew-tap
git clone https://github.com/anomalyco/homebrew-tap.git
cp packages/homebrew/platypus.rb homebrew-tap/Formula/
cd homebrew-tap
git add Formula/platypus.rb
git commit -m "Add platypus 1.0.0"
git push

# Users install with:
brew install anomalyco/tap/platypus
```

### 3. Scoop Bucket

```bash
# Fork: https://github.com/Scoopinstaller/Main
git clone https://github.com/YOUR-USERNAME/Main.git
cp packages/scoop/platypus.json Main/bucket/
cd Main
git add bucket/platypus.json
git commit -m "Add platypus 1.0.0"
git push

# Submit PR to Scoop repository
```

### 4. Chocolatey

```bash
# 1. Build package
cd packages/chocolatey
choco pack

# 2. Test locally
choco install platypus -s .

# 3. Calculate checksums
sha256sum ../../platypus-cli-1.0.0.tgz

# 4. Update hashes in platypus.nuspec
# 5. Push to Chocolatey community feed
choco push platypus.1.0.0.nupkg -s https://push.chocolatey.org/
```

### 5. Arch Linux AUR

```bash
# 1. Create AUR account: https://aur.archlinux.org/

# 2. Clone AUR package
git clone ssh://aur@aur.archlinux.org/platypus-bin.git
cd platypus-bin

# 3. Copy files
cp ../../packages/aur/* .

# 4. Generate .SRCINFO
makepkg --printsrcinfo > .SRCINFO

# 5. Commit and push
git add PKGBUILD .SRCINFO
git commit -m "Update to v1.0.0"
git push

# Users install with:
paru -S platypus-bin
```

### 6. mise

```bash
# Add to mise registry (PR required)
# Submit PR to: https://github.com/jdx/mise

# Or users can use directly from your repo:
mise use -g git@github.com:anomalyco/platypus-cli#packages/mise
```

### 7. nix

```bash
# Option 1: Add to nixpkgs (PR required)
# Submit PR to: https://github.com/NixOS/nixpkgs

# Option 2: Users can use with flakes:
nix run github:anomalyco/platypus-cli

# Option 3: Install from local:
nix profile install .
```

### 8. Desktop Application

```bash
cd packages/desktop

# Install dependencies
npm install

# Build for current platform
npm run build:desktop

# Output:
# - macOS: src-tauri/target/release/bundle/dmg/
# - Windows: src-tauri/target/release/bundle/msi/
# - Linux: src-tauri/target/release/bundle/{deb,appimage}/
```

## 📋 Pre-Publish Checklist

Before publishing, make sure:

- [ ] Update version numbers in all packages
- [ ] Update checksums/hashes
- [ ] Test installation locally
- [ ] Update CHANGELOG.md
- [ ] Create git tag: `git tag v1.0.0`
- [ ] Push tag: `git push --tags`
- [ ] Create GitHub release with assets

## 🔐 Calculate Hashes

```bash
# SHA256 for npm
shasum -a 256 platypus-cli-1.0.0.tgz

# SHA256 for Scoop/Chocolatey
powershell -Command "Get-FileHash platypus-cli-1.0.0.tgz -Algorithm SHA256"

# MD5 for some legacy systems
md5sum platypus-cli-1.0.0.tgz
```

## 📊 Version Bump Script

```bash
#!/bin/bash
VERSION=$1

# Update root package.json
npm version $VERSION

# Update Homebrew
sed -i '' "s/version \"[^\"]*\"/version \"$VERSION\"/" packages/homebrew/platypus.rb

# Update Scoop
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" packages/scoop/platypus.json

# Update Chocolatey
sed -i '' "s/<version>[^<]*</<version>$VERSION</" packages/chocolatey/platypus.nuspec

# Update AUR
sed -i '' "s/pkgver=[^ ]*/pkgver=$VERSION/" packages/aur/PKGBUILD

# Update Desktop
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" packages/desktop/package.json

echo "Updated to version $VERSION"
```

## 🎯 Installation Commands (User-Facing)

All these commands should be documented in the main README.md:

```bash
# npm
npm i -g platypus-cli@latest

# Homebrew
brew install anomalyco/tap/platypus

# Scoop
scoop install platypus

# Chocolatey
choco install platypus

# Arch AUR
paru -S platypus-bin

# mise
mise use -g platypus

# nix
nix run github:anomalyco/platypus-cli

# Desktop
brew install --cask platypus-desktop  # macOS
scoop install extras/platypus-desktop  # Windows
```

## 📚 Additional Resources

- **npm**: https://docs.npmjs.com/
- **Homebrew**: https://docs.brew.sh/
- **Scoop**: https://scoop.sh/
- **Chocolatey**: https://chocolatey.org/docs
- **AUR**: https://wiki.archlinux.org/title/Arch_User_Repository
- **mise**: https://mise.jdx.dev/
- **nix**: https://nixos.org/manual/nix/stable/
- **Tauri**: https://tauri.app/v1/guides/

## ⚠️ Notes

- Always test installations after publishing
- Monitor GitHub Issues for installation problems
- Keep all packages in sync with version bumps
- Update this README when adding new package managers
- Follow each package manager's contribution guidelines

## 🆘 Troubleshooting

### Hash Mismatches

```bash
# Recalculate and update hashes
shasum -a 256 platypus-cli-*.tgz
```

### Build Failures

```bash
# Check Node.js version
node --version  # Must be 20+

# Clear npm cache
npm cache clean --force
```

### Permission Errors

```bash
# Linux/macOS
sudo npm install -g platypus-cli

# Windows (Run as Administrator)
choco install platypus
```

---

**All packages ready for distribution! 🚀**
