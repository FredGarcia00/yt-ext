# FolderTube Chrome Extension

A Chrome extension that adds folder management to YouTube's subscription sidebar.

## Features

- Organize YouTube subscriptions into custom folders
- Drag-and-drop to reorder folders
- Drag channels from "Available Channels" into folders
- Persists across YouTube navigation using MutationObserver
- Dark mode support
- Chrome storage sync for folder persistence

## Installation

1. Build the extension:
   ```bash
   npm install
   npm run build
   ```

2. Load in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Development

```bash
npm install
npm run dev
```

## Project Structure

- `src/content.tsx` - Main content script that injects UI
- `src/components/FolderManager.tsx` - React component for folder management
- `src/dummy-data.json` - Sample channels and folders
- `manifest.json` - Chrome extension manifest (V3)

## Chrome Web Store Compliance

- Minimal permissions (storage, youtube.com only)
- No background scripts
- No popups or browser actions
- Clean, commented code
- Error handling for DOM/storage failures

## Build Output

The built extension is in the `dist` folder:
- `dist/content.js` - Main content script
- `dist/assets/content.css` - Styles
- `dist/manifest.json` - Extension manifest