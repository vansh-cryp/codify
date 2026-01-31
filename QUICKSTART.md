# Quick Start: Running Your Spotify Extension

## How to Test the Front-End UI

### 1. **Open Extension in Debug Mode**
   - Press `F5` in VS Code (with this folder open)
   - This launches a new VS Code window with your extension loaded

### 2. **View the Spotify Sidebar**
   - Look at the **Activity Bar** (left sidebar icons)
   - Click the **Spotify icon** (music note icon)
   - You'll see the Spotify Player panel appear on the right

### 3. **Test UI Interactivity**
   - Try clicking the play button (turns into pause ⏸️)
   - Enter a song name in search box and hit Enter
   - Click control buttons to see messages in the debug console

### 4. **Open Debug Console**
   - In the extension window, press `Ctrl+Shift+J`
   - You'll see messages when buttons are clicked:
     - `"Play clicked"`
     - `"Search for: your query"`
     - etc.

---

## Project Files Overview

| File | Purpose |
|------|---------|
| `extension.js` | Registers webview provider, handles activation |
| `src/views/spotifyView.js` | Webview provider - manages UI & messages |
| `media/main.js` | Webview logic - button clicks, UI updates |
| `media/style.css` | Webview styling - VS Code integrated theme |
| `package.json` | Extension manifest with contributions |
| `FRONTEND_IMPLEMENTATION.md` | Detailed feature documentation |

---

## Next: Backend Integration

After confirming the UI works, you'll implement:

1. **Spotify Authentication** - OAuth flow in [extension.js](extension.js)
2. **API Client** - Create `src/spotify/spotifyClient.js` with API calls
3. **Message Handlers** - Connect webview messages to Spotify API
4. **State Management** - Track current playback state

---

## Useful VS Code Commands

- **`Spotify: Play/Pause`** - Command registered (accessible from Command Palette)
- Open Command Palette: `Ctrl+Shift+P` → type `spotify` to see available commands

---

## Styling Notes

The extension uses **VS Code theme colors**:
- Primary green: `#1db954` (Spotify brand)
- Respects light/dark mode automatically
- Uses VS Code variables: `--vscode-foreground`, `--vscode-sideBar-background`, etc.

---

**Ready to test?** Press `F5` now!
