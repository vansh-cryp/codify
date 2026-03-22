/**
 * SpotifyApiService - Wrapper around spotify-web-api-node client
 * Handles all Spotify API calls and playback state polling
 */

const SpotifyWebApi = require('spotify-web-api-node');

class SpotifyApiService {
  constructor(authService) {
    this.authService = authService;
    this.spotifyApi = null;
    this.pollingInterval = null;
    this.webviewPanel = null;
    this.currentTrackId = null;
  }

  /**
   * Initialize the Spotify API client with tokens
   * @param {string} accessToken - Spotify access token
   * @returns {Promise<void>}
   */
  async initializeFromTokens(accessToken) {
    try {
      console.log('Initializing Spotify API with token');
      if (!this.spotifyApi) {
        this.spotifyApi = new SpotifyWebApi();
      }
      this.spotifyApi.setAccessToken(accessToken);
      console.log('Spotify API initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize Spotify API: ${error.message}`);
    }
  }

  /**
   * Make an API call with automatic token refresh on 401
   * @param {Function} apiCall - Function that makes the API call
   * @returns {Promise<any>}
   */
  async callWithTokenRefresh(apiCall) {
    try {
      const response = await apiCall();
      return response.body;
    } catch (error) {
      console.log('API Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        body: error.body,
      });
      
      // Check if it's a 401 (Unauthorized) error
      if (error.statusCode === 401) {
        try {
          const newTokens = await this.authService.refreshAccessToken();
          await this.initializeFromTokens(newTokens.accessToken);
          const response = await apiCall();
          return response.body;
        } catch (refreshError) {
          throw new Error('Authentication failed. Please log in again.');
        }
      }
      throw error;
    }
  }

  /**
   * Get list of available devices
   * @returns {Promise<array>}
   */
  async getAvailableDevices() {
    try {
      console.log('Fetching available devices...');
      const result = await this.callWithTokenRefresh(() => this.spotifyApi.getMyDevices());
      console.log('Raw device response:', JSON.stringify(result, null, 2));
      if (result && result.devices) {
        console.log('Devices array:', result.devices);
        return result.devices;
      }
      console.log('No devices property in response');
      return [];
    } catch (error) {
      console.error('Failed to get devices:', error);
      console.error('Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        body: error.body
      });
      return [];
    }
  }

  /**
   * Get current user information
   * @returns {Promise<object>}
   */
  async getMe() {
    return this.callWithTokenRefresh(() => this.spotifyApi.getMe());
  }

  /**
   * Get current playback state
   * @returns {Promise<object|null>}
   */
  async getPlaybackState() {
    try {
      const state = await this.callWithTokenRefresh(() => this.spotifyApi.getMyCurrentPlaybackState());
      console.log('Playback state retrieved:', state);
      return state;
    } catch (error) {
      console.error('Failed to get playback state:', error);
      return null;
    }
  }

  /**
   * Play on the user's active device or specified device
   * @param {object} options - { deviceId?, trackIds?, contextUri? }
   * @returns {Promise<void>}
   */
  async play(options = {}) {
    try {
      console.log('Playing with options:', options);
      
      // If no options provided, just resume playback
      let playOptions = options;
      if (Object.keys(options).length === 0) {
        // Resume current playback without parameters
        console.log('Resuming playback (no new context)');
        playOptions = { device_id: null };
      }
      
      const result = await this.callWithTokenRefresh(() => {
        if (options.deviceId) {
          return this.spotifyApi.play({ ...options, device_id: options.deviceId });
        }
        return this.spotifyApi.play();
      });
      console.log('Play successful');
      return result;
    } catch (error) {
      console.error('Play failed:', error.message);
      throw error;
    }
  }

  /**
   * Pause playback on the user's active device
   * @returns {Promise<void>}
   */
  async pause() {
    try {
      console.log('Pausing playback');
      const result = await this.callWithTokenRefresh(() => this.spotifyApi.pause());
      console.log('Pause successful');
      return result;
    } catch (error) {
      console.error('Pause failed:', error.message);
      throw error;
    }
  }

  /**
   * Skip to the next track
   * @returns {Promise<void>}
   */
  async next() {
    console.log('Skipping to next track');
    return this.callWithTokenRefresh(() => this.spotifyApi.skipToNext());
  }

  /**
   * Go to the previous track
   * @returns {Promise<void>}
   */
  async previous() {
    console.log('Skipping to previous track');
    return this.callWithTokenRefresh(() => this.spotifyApi.skipToPrevious());
  }

  /**
   * Seek to a specific position in currently playing track
   * @param {number} positionMs - Position in milliseconds
   * @returns {Promise<void>}
   */
  async seek(positionMs) {
    return this.callWithTokenRefresh(() => this.spotifyApi.seek(Math.floor(positionMs)));
  }

  /**
   * Search for tracks, artists, albums
   * @param {string} query - Search query
   * @param {array} types - ['track', 'artist', 'album']
   * @param {number} limit - Maximum results to return (default 20)
   * @returns {Promise<array>}
   */
  async search(query, types = ['track'], limit = 20) {
    try {
      console.log(`Searching for: "${query}"`);
      const result = await this.callWithTokenRefresh(() =>
        this.spotifyApi.search(query, types, { limit })
      );

      // Extract and format results
      if (result && result.tracks && result.tracks.items) {
        const results = result.tracks.items.map(track => ({
          id: track.id,
          name: track.name,
          artist: (track.artists && track.artists.length > 0) ? track.artists.map(a => a.name).join(', ') : 'Unknown Artist',
          albumArt: (track.album && track.album.images && track.album.images.length > 0) ? track.album.images[0].url : '',
          uri: track.uri
        }));
        console.log(`Found ${results.length} tracks`);
        return results;
      }
      console.log('No tracks found in search response');
      return [];
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Play a specific track
   * @param {string} trackId - Spotify track ID
   * @returns {Promise<void>}
   */
  async playTrack(trackId) {
    try {
      console.log('Playing track:', trackId);
      return await this.callWithTokenRefresh(() =>
        this.spotifyApi.play({ uris: [`spotify:track:${trackId}`] })
      );
    } catch (error) {
      // If no active device found (404), try to transfer to the first available device
      if (error.statusCode === 404 || (error.body && error.body.error && error.body.error.reason === 'NO_ACTIVE_DEVICE')) {
        console.log('No active device found. Attempting to activate first available device...');
        const devices = await this.getAvailableDevices();
        if (devices && devices.length > 0) {
          console.log(`Activating device: ${devices[0].name}`);
          return await this.callWithTokenRefresh(() =>
            this.spotifyApi.play({ uris: [`spotify:track:${trackId}`], device_id: devices[0].id })
          );
        }
      }
      throw error;
    }
  }

  /**
   * Format playback state for webview
   * @param {object} playbackState - Raw playback state from Spotify API
   * @returns {object}
   */
  formatPlaybackState(playbackState) {
    if (!playbackState) {
      return {
        isPlaying: false,
        track: null,
        progress_ms: 0,
        duration_ms: 0,
      };
    }

    const item = playbackState.item;
    return {
      isPlaying: playbackState.is_playing,
      track: item
        ? {
            id: item.id,
            name: item.name,
            artist: item.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
            albumArt: item.album?.images?.[0]?.url,
          }
        : null,
      progress_ms: playbackState.progress_ms || 0,
      duration_ms: item?.duration_ms || 0,
    };
  }

  /**
   * Start polling playback state and sending updates to webview
   * @param {object} webviewPanel - VS Code WebviewPanel to send messages to
   * @param {number} intervalMs - Polling interval in milliseconds (default 1000)
   */
  startPlaybackPolling(webviewPanel, intervalMs = 1000) {
    console.log('Starting playback polling...');
    this.webviewPanel = webviewPanel;

    // Stop any existing polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Initial update
    this.updatePlaybackState();

    // Start polling
    this.pollingInterval = setInterval(() => {
      this.updatePlaybackState();
    }, intervalMs);
    
    console.log('Playback polling started');
  }

  /**
   * Fetch lyrics from lyric.ovh API
   * @param {string} artist 
   * @param {string} track 
   * @returns {Promise<string>}
   */
  async getLyrics(artist, track) {
    try {
      console.log(`Fetching lyrics for ${artist} - ${track}`);
      const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`);
      if (!response.ok) {
        return 'Lyrics not found';
      }
      const data = await response.json();
      return data.lyrics || 'Lyrics not available';
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      return 'Could not load lyrics';
    }
  }

  /**
   * Fetch and send current playback state to webview
   */
  async updatePlaybackState() {
    try {
      const playbackState = await this.getPlaybackState();
      if (this.webviewPanel && playbackState) {
        const formatted = this.formatPlaybackState(playbackState);
        console.log('Updating webview with playback state:', formatted);
        
        // Handle Lyrics
        if (formatted.track && formatted.track.id !== this.currentTrackId) {
          this.currentTrackId = formatted.track.id;
          this.webviewPanel.webview.postMessage({
            command: 'updateLyrics',
            lyrics: 'Loading lyrics...'
          });

          // Get primary artist for better match
          const primaryArtist = playbackState.item?.artists?.[0]?.name || formatted.track.artist;
          this.getLyrics(primaryArtist, formatted.track.name).then(lyrics => {
            this.webviewPanel.webview.postMessage({
              command: 'updateLyrics',
              lyrics: lyrics
            });
          });
        } else if (!formatted.track) {
            this.currentTrackId = null;
        }

        this.webviewPanel.webview.postMessage({
          command: 'updateNowPlaying',
          track: formatted.track,
          isPlaying: formatted.isPlaying,
        });
        this.webviewPanel.webview.postMessage({
          command: 'updateProgress',
          current: formatted.progress_ms,
          total: formatted.duration_ms,
        });
      } else {
        console.log('WebviewPanel not ready or no playback state');
      }
    } catch (error) {
      console.error('Failed to update playback state:', error);
    }
  }

  /**
   * Stop polling playback state
   */
  stopPlaybackPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

module.exports = SpotifyApiService;
