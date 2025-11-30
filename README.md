# Minimum Code Viewer

A minimal, read-only code viewer with a VSCode-like interface. Built with Electron.

## Features

- File Explorer with folder tree navigation
- Tab-based file viewing
- Syntax highlighting for common languages (JS, TS, Python, HTML, CSS, etc.)
- Dark theme inspired by VSCode
- View-only (no editing capabilities)

## Installation

```bash
git clone https://github.com/ttlg/minimum-code-viewer.git
cd minimum-code-viewer
npm install
```

## Usage

```bash
npm start
```

Then click "Open Folder" or use `Cmd+O` (macOS) / `Ctrl+O` (Windows/Linux) to open a project folder.

## Build

To build a standalone application:

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

The built application will be output to the `dist/` directory.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is released into the public domain under the [Unlicense](LICENSE).

You are free to copy, modify, publish, use, compile, sell, or distribute this software for any purpose, commercial or non-commercial, without any restrictions.
