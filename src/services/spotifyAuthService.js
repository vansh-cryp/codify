/**
 * SpotifyAuthService - Handles OAuth 2.0 authentication with Spotify
 * Manages token storage, refresh, and logout
 */

const vscode = require('vscode');

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const REDIRECT_URI = 'http://127.0.0.1:8000/callback';

// You should set these from environment or VS Code settings
// For now, they need to be configured in extension
let CLIENT_ID = '';
let CLIENT_SECRET = '';

class SpotifyAuthService {
  constructor(context) {
    this.context = context;
    this.globalState = context.globalState;
  }

  /**
   * Set the Spotify application credentials
   * @param {string} clientId - Spotify app Client ID
   * @param {string} clientSecret - Spotify app Client Secret
   */
  setCredentials(clientId, clientSecret) {
    CLIENT_ID = clientId;
    CLIENT_SECRET = clientSecret;
  }

  /**
   * Generate the OAuth authorization URL
   * @returns {string} Authorization URL for user to visit
   */
  getAuthUrl() {
    const state = Math.random().toString(36).substring(7);
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
    ].join('%20');

    const url = `${SPOTIFY_AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&state=${state}`;
    return url;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * @param {string} code - Authorization code from Spotify
   * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: number}>}
   */
  async exchangeCodeForToken(code) {
    try {
      console.log('Exchanging code for token...');
      console.log('Client ID:', CLIENT_ID);
      const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
      console.log('Auth header:', auth.substring(0, 20) + '...');

      const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
        },
        body: new URLSearchParams({
          code,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }).toString(),
      });

      console.log('Token response status:', response.status);
      const data = await response.json();
      console.log('Token response:', data);

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText} - ${JSON.stringify(data)}`);
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new Error(`Failed to exchange code for token: ${error.message}`);
    }
  }

  /**
   * Save tokens to secure storage
   * @param {object} tokens - { accessToken, refreshToken, expiresIn }
   */
  async saveTokens(tokens) {
    try {
      await this.globalState.update('spotify.accessToken', tokens.accessToken);
      await this.globalState.update('spotify.refreshToken', tokens.refreshToken);
      await this.globalState.update(
        'spotify.tokenExpiresAt',
        Date.now() + tokens.expiresIn * 1000
      );
    } catch (error) {
      throw new Error(`Failed to save tokens: ${error.message}`);
    }
  }

  /**
   * Get stored tokens from storage
   * @returns {Promise<{accessToken: string, refreshToken: string, expiresAt: number} | null>}
   */
  async getStoredTokens() {
    try {
      const accessToken = this.globalState.get('spotify.accessToken');
      const refreshToken = this.globalState.get('spotify.refreshToken');
      const expiresAt = this.globalState.get('spotify.tokenExpiresAt');

      if (accessToken && refreshToken) {
        return { accessToken, refreshToken, expiresAt };
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to retrieve tokens: ${error.message}`);
    }
  }

  /**
   * Refresh the access token using refresh token
   * @returns {Promise<{accessToken: string, expiresIn: number}>}
   */
  async refreshAccessToken() {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens || !tokens.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
        }).toString(),
      });

      if (!response.ok) {
        if (response.status === 400) {
          // Token is invalid, log out
          await this.logout();
          throw new Error('Refresh token expired. Please log in again.');
        }
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      const newTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || tokens.refreshToken,
        expiresIn: data.expires_in,
      };

      await this.saveTokens(newTokens);
      return {
        accessToken: newTokens.accessToken,
        expiresIn: newTokens.expiresIn,
      };
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Check if access token is expired
   * @returns {boolean}
   */
  isTokenExpired() {
    const expiresAt = this.globalState.get('spotify.tokenExpiresAt');
    if (!expiresAt) return true;
    return Date.now() >= expiresAt - 60000; // Refresh 60 seconds before expiry
  }

  /**
   * Logout and clear stored tokens
   */
  async logout() {
    try {
      await this.globalState.update('spotify.accessToken', undefined);
      await this.globalState.update('spotify.refreshToken', undefined);
      await this.globalState.update('spotify.tokenExpiresAt', undefined);
    } catch (error) {
      throw new Error(`Failed to logout: ${error.message}`);
    }
  }
}

module.exports = SpotifyAuthService;
