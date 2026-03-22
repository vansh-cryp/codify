# Spotify Extension Backend Setup Guide

## Overview

The backend implementation uses OAuth 2.0 authentication to securely connect to Spotify's API. Follow this guide to configure your extension with Spotify credentials.

## Prerequisites

1. A Spotify account (free or premium)
2. Access to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
3. VS Code with the Codify extension installed locally

## Backend Architecture

### Service Layer

The backend consists of two main service files:

#### `src/services/spotifyAuthService.js`
- Handles OAuth 2.0 authentication flow
- Manages secure token storage using VS Code's global state
- Implements token refresh mechanism
- Handles user logout

#### `src/services/spotifyApiService.js`
- Wraps the `spotify-web-api-node` library
- Provides methods for all Spotify API operations:
  - Playback control (play, pause, next, previous, seek)
  - Track search and playback
  - Playback state retrieval
  - Now-playing display updates
- Implements automatic token refresh on 401 errors
- Manages playback state polling (sends updates to webview every 1 second)

### Integration Points

- **extension.js** — Initializes services, checks for stored tokens, handles OAuth flow, starts API polling
- **spotifyView.js** — Receives webview messages, calls API service methods, sends results back to webview
- **media/main.js** — Updates UI with playback state, handles error messages, manages button states during API requests

## Step 1: Register Your Spotify Application

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account (create one if needed)
3. Click **Create an App**
4. Fill in the app name (e.g., "Codify")
5. Accept the terms and create the app
6. You'll see your **Client ID** and **Client Secret**

## Step 2: Configure Redirect URI

1. In your app settings, scroll to **Redirect URIs**
2. Add a redirect URI: `http://localhost:9999/callback`
3. Save the settings

## Step 3: Add Credentials to Extension

You have two options to provide credentials:

### Option A: Environment Variables (Recommended for Development)

1. Create a `.env` file in the workspace root (or set system environment variables):
   ```
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   ```

2. The extension will automatically read these variables

3. When packaging for distribution, move credentials to secure configuration

### Option B: Hardcode in extension.js (Development Only)

1. Open `extension.js`
2. Find these lines:
   ```javascript
   const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
   const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE';
   ```
3. Replace `YOUR_CLIENT_ID_HERE` and `YOUR_CLIENT_SECRET_HERE` with your credentials
4. **⚠️ Never commit credentials to version control!**

## Step 4: Test the Extension

1. In VS Code, press `Ctrl+F5` to launch the extension in a new window
2. Open the Spotify activity sidebar
3. Click **Login** when prompted
4. A browser window will open with Spotify login
5. After approving permissions, copy the authorization code from the URL
6. Paste the code into the VS Code input box
7. The extension should confirm successful login

## Step 5: Verify Backend Features

Once logged in, test these features:

### Now-Playing Display
- Play a track on Spotify (any device)
- The extension should show:
  - Album art
  - Track name and artist
  - Progress bar with current/total time
  - Updates every ~1 second

### Playback Controls
- Click **Play/Pause** → Spotify toggles playback
- Click **Next** → Skip to next track
- Click **Previous** → Go back to previous track
- Within ~1 second, the extension UI updates

### Search & Play
- Type a track name in the search box
- Press Enter or click the search button
- Results appear within 1-2 seconds
- Click a result to play it on Spotify

### Seek/Progress
- Click on the progress bar to seek to a position
- The track jumps to that position on Spotify

### Error Handling
- Try disconnecting internet → An error message appears at the bottom
- Extension doesn't crash
- When connection restores, functionality resumes

## Troubleshooting

### "No active Spotify device found"
- Ensure Spotify is playing on at least one device (phone, desktop, web player)
- The extension controls the actively playing device
- If no device is playing, playback commands may fail

### "Authentication failed" Error
- Verify your Client ID and Client Secret are correct
- Check that the redirect URI matches exactly: `http://localhost:9999/callback`
- Try logging out and logging back in

### Token Expires During Use
- The extension automatically refreshes tokens
- If refresh fails, you'll see a login prompt
- Log in again to continue

### Port 9999 Already in Use
- If another app is using port 9999, the redirect may fail
- (Future enhancement: make port configurable)

## API Rate Limiting

Spotify API has rate limits:
- Default: ~180,000 requests per 15-minute window
- Current setup:
  - 1 playback poll per second = 60 requests/minute = not significant
  - User actions (play, pause, search) add minimal overhead
- For typical usage, you won't hit rate limits

## Token Storage

Tokens are stored in VS Code's `globalState`:
- Encrypted at rest on disk
- Persists across extension restarts
- Tied to your VS Code profile
- Not shared with other extensions
- Cleared when you log out

## Security Notes

- Never commit credentials to version control
- Use environment variables for credentials in CI/CD
- Tokens expire (default 1 hour) and are automatically refreshed
- Refresh tokens are stored securely and rotated by Spotify

## Next Steps

1. **Device Selection** — Add ability to choose which Spotify device to control
2. **Volume Control** — Adjust playback volume from the extension
3. **Queue Management** — View and manage current playback queue
4. **Status Bar** — Quick play/pause in VS Code's status bar
5. **Playlist Support** — Browse and play playlists

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  extension.js (Main)                                         │
│  ├── Initialize Services                                     │
│  ├── Check Stored Tokens                                     │
│  ├── Handle OAuth Flow                                       │
│  └── Manage Playback Polling                                 │
│                      ↓                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          Service Layer                              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  SpotifyAuthService                                 │    │
│  │  ├── Generate OAuth URL                             │    │
│  │  ├── Exchange Code for Token                         │    │
│  │  ├── Refresh Access Token                           │    │
│  │  └── Manage Token Storage                           │    │
│  │                                                      │    │
│  │  SpotifyApiService                                  │    │
│  │  ├── Playback Control                               │    │
│  │  ├── Track Search                                   │    │
│  │  ├── Playback State Polling                         │    │
│  │  └── Error Handling & Token Refresh                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                      ↓                                        │
│  spotifyView.js (WebView Provider)                           │
│  └── Message Handlers → API Service → Webview Updates       │
│                      ↓                                        │
│  media/main.js (Frontend)                                    │
│  ├── UI Updates                                              │
│  ├── Error Display                                           │
│  └── Loading States                                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
         ┌────────────────────────────────────┐
         │  Spotify Web API (HTTPS)           │
         │  - Get Playback State              │
         │  - Control Playback                │
         │  - Search Tracks                   │
         │  - Manage Devices                  │
         └────────────────────────────────────┘
```

## Files Changed/Added

### New Files
- `src/services/spotifyAuthService.js` — OAuth authentication service
- `src/services/spotifyApiService.js` — Spotify API wrapper service

### Modified Files
- `extension.js` — Added service initialization and OAuth flow
- `src/views/spotifyView.js` — Added API service integration and message handlers
- `media/main.js` — Added error handling and loading states
- `media/style.css` — Added error message styling

## Key Implementation Details

### OAuth Flow
1. User clicks "Login"
2. Extension generates OAuth URL with required scopes
3. Browser opens Spotify login page
4. User grants permissions
5. Spotify redirects to `http://localhost:9999/callback?code=...`
6. User copies the code from the URL
7. Extension exchanges code for access token
8. Token stored securely in VS Code

### Playback Polling
- Every 1 second, extension fetches current playback state
- Compares with previous state
- Sends webview updates if changed
- Syncs now-playing display, progress bar, play/pause state

### Token Refresh
- On startup, extension checks if token is expired (within 60 seconds of expiry)
- If expired, automatically refreshes using refresh token
- If any API call returns 401 (Unauthorized), token is refreshed and request retried
- User never sees token refresh process

## Support

For issues with:
- **Spotify API** — See [Spotify API Documentation](https://developer.spotify.com/documentation/web-api)
- **VS Code Extensions** — See [VS Code Extension API](https://code.visualstudio.com/api)
- **This Extension** — Check GitHub issues or extension logs (View → Output → Codify)
