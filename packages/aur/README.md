# Platypus CLI AUR Package

This directory contains the Arch User Repository (AUR) package for Platypus CLI.

## Files

- `PKGBUILD` - Package build script
- `.SRCINFO` - Package metadata (auto-generated)

## Building the Package

```bash
# Generate .SRCINFO
makepkg --printsrcinfo > .SRCINFO

# Build the package
makepkg -si

# Or build without installing
makepkg

# Install the built package
sudo pacman -U platypus-bin-*.pkg.tar.zst
```

## Testing

```bash
# Install the package
makepkg -si

# Run platypus
platypus --version

# Test commands
platypus keys list
platypus agent list
```

## Publishing to AUR

1. Create AUR account at https://aur.archlinux.org/
2. Clone the AUR package:

```bash
git clone ssh://aur@aur.archlinux.org/platypus-bin.git
cd platypus-bin
```

3. Copy files from this directory:

```bash
cp /path/to/repo/packages/aur/PKGBUILD .
cp /path/to/repo/packages/aur/.SRCINFO .
```

4. Commit and push:

```bash
git add PKGBUILD .SRCINFO
git commit -m "Update to v1.0.0"
git push
```

## Requirements

- Node.js 20+
- npm
- makepkg (comes with base-devel)

## Notes

- This package installs from npm tarball
- Binary package (faster to install than building from source)
- Provides the `platypus` command
