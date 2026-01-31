# Spotify Extension Front-End Implementation Guide

## ✅ Completed: Front-End Structure

Your Spotify VS Code extension front-end is now scaffolded and ready for further development. Here's what was implemented:

### **1. Project Structure**
```
d:\codify/
├── extension.js                 # Main extension entry point
├── src/
│   └── views/
│       └── spotifyView.js      # Webview provider (handles communication)
├── media/
│   ├── style.css               # Webview styling
│   ├── main.js                 # Webview interactive logic
│   └── (spotify.svg already existed)
├── package.json                # Updated with dependencies & contributions
└── ...
```

### **2. Key Components**

#### **Extension Core** ([extension.js](extension.js))
- Registers the Spotify webview view provider
- Listens for `spotifyView` activation event
- Handles extension activation and deactivation

#### **Webview Provider** ([src/views/spotifyView.js](src/views/spotifyView.js))
- Manages the sidebar panel UI (Webview)
- Handles two-way message passing between extension and webview
- Currently listens for commands: `play`, `pause`, `next`, `previous`, `search`, `playTrack`, `seek`

#### **Webview UI** ([media/main.js](media/main.js) + [media/style.css](media/style.css))
- **Now-Playing Display**: Shows track name, artist, album art, and progress
- **Playback Controls**: Play/Pause, Previous, Next buttons
- **Search Interface**: Search bar + search button for track discovery
- **Search Results**: Clickable list to play tracks from search results
- **Responsive Design**: Uses VS Code color tokens for theme integration

### **3. UI Features**

**Now Playing Section:**
- Album art display (square)
- Track name and artist
- Progress bar with time indicators (current / total)
- Clickable progress bar for seeking

**Controls:**
- Play/Pause button (green Spotify color #1db954)
- Previous track button
- Next track button

**Search:**
- Search input field
- Search button / Enter key to search
- Results displayed as clickable track list
- Empty state when no results

### **4. Message Communication Pattern**

**Webview → Extension (user clicks button):**
```javascript
vscode.postMessage({
    command: 'play' | 'pause' | 'next' | 'previous' | 'search' | 'playTrack' | 'seek',
    query: 'search term',     // for search command
    trackId: 'id',            // for playTrack
    percent: 0.5              // for seek (0-1)
})
```

**Extension → Webview (update UI):**
```javascript
webviewView.webview.postMessage({
    command: 'updateNowPlaying' | 'updateProgress' | 'searchResults' | 'playingStateChanged',
    track: { name, artist, id, albumArt },
    isPlaying: boolean,
    current: milliseconds,
    total: milliseconds,
    tracks: [{ name, artist, id }, ...]
})
```

### **5. Current Dependencies**
- `@vscode/webview-ui-toolkit@^1.4.0` - UI component library (ready to use)
- `spotify-web-api-node@^5.0.2` - Spotify API client (ready to use)

### **6. Next Steps for Backend Integration**

1. **Authentication Flow** ([extension.js](extension.js))
   - Implement OAuth 2.0 flow with Spotify
   - Store access token securely (VS Code SecretStorage API)
   - Handle token refresh

2. **Spotify API Integration** (new file: `src/spotify/spotifyClient.js`)
   - Initialize `spotify-web-api-node` with tokens
   - Implement: `getMe()`, `getMyCurrentPlaybackState()`, `search()`, `play()`, `pause()`, etc.

3. **Command Handlers** (extend [extension.js](extension.js))
   - Link webview messages to Spotify API calls
   - Send playback updates back to webview

4. **Status Bar** (optional)
   - Show current track in VS Code status bar
   - Quick access to play/pause without opening sidebar

---

## **Current Status**
✅ UI/UX scaffolding complete  
✅ Message passing infrastructure ready  
✅ Theme integration (uses VS Code colors)  
✅ Linting passes  
⏳ Spotify API integration (next step)  
⏳ Authentication (next step)  

You can now run the extension in debug mode to see the UI in action!
