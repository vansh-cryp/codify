// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const vscode = require('vscode');
const SpotifyViewProvider = require('./src/views/spotifyView');
const SpotifyAuthService = require('./src/services/spotifyAuthService');
const SpotifyApiService = require('./src/services/spotifyApiService');
const OAuthServer = require('./src/services/oauthServer');

// TODO: Replace these with your Spotify application credentials from developer.spotify.com
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE';

// Debug logging for credentials
if (SPOTIFY_CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
	console.warn('⚠️ WARNING: Spotify credentials not loaded from .env. Using placeholder values.');
	console.warn('Make sure .env file exists in the workspace root with SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET');
}

let authService = null;
let apiService = null;
let oauthServer = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "codify" is now active!');
	console.log('Spotify Client ID:', SPOTIFY_CLIENT_ID);
	console.log('Spotify Client Secret:', SPOTIFY_CLIENT_SECRET ? '***' + SPOTIFY_CLIENT_SECRET.slice(-4) : 'NOT SET');

	// Initialize auth and API services
	authService = new SpotifyAuthService(context);
	authService.setCredentials(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
	apiService = new SpotifyApiService(authService);

	// Register the Spotify view provider
	const spotifyViewProvider = new SpotifyViewProvider(context, apiService);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			'spotifyView',
			spotifyViewProvider,
			{
				webviewOptions: {
					retainContextWhenHidden: true
				}
			}
		)
	);

	// Register debug command to test API
	const debugCommand = vscode.commands.registerCommand('spotify.debugTest', async function () {
		try {
			console.log('=== SPOTIFY DEBUG TEST ===');
			const user = await apiService.getMe();
			console.log('User info:', user);
			
			const devices = await apiService.getAvailableDevices();
			console.log('Devices:', devices);
			
			const playbackState = await apiService.getPlaybackState();
			console.log('Playback state:', playbackState);
			
			vscode.window.showInformationMessage('Debug test complete - check console');
		} catch (error) {
			console.error('Debug test failed:', error);
			vscode.window.showErrorMessage(`Debug test failed: ${error.message}`);
		}
	});

	context.subscriptions.push(debugCommand);
	const disposable = vscode.commands.registerCommand('spotify.playPause', async function () {
		try {
			const playbackState = await apiService.getPlaybackState();
			if (playbackState && playbackState.is_playing) {
				await apiService.pause();
			} else {
				await apiService.play();
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Spotify command failed: ${error.message}`);
		}
	});

	context.subscriptions.push(disposable);

	// Check for stored tokens and initialize API on startup
	initializeSpotifyConnection(context);
}

/**
 * Initialize Spotify API connection on extension startup
 */
async function initializeSpotifyConnection(context) {
	try {
		console.log('Checking for stored Spotify tokens...');
		const tokens = await authService.getStoredTokens();
		
		if (tokens) {
			console.log('Found stored tokens');
			// Tokens exist, initialize API
			if (authService.isTokenExpired()) {
				console.log('Token expired, refreshing...');
				// Refresh if needed
				const newTokens = await authService.refreshAccessToken();
				await apiService.initializeFromTokens(newTokens.accessToken);
			} else {
				console.log('Token is still valid, using existing token');
				// Use existing token
				await apiService.initializeFromTokens(tokens.accessToken);
			}
			console.log('✅ Spotify API initialized with stored tokens');
		
		// Get available devices for debugging
		try {
			const devices = await apiService.getAvailableDevices();
			console.log('Available Spotify devices:', devices);
		} catch (error) {
			console.error('Failed to fetch devices:', error);
		}
		} else {
			console.log('No stored tokens found, prompting for login');
			// No tokens, prompt for login
			const loginChoice = await vscode.window.showInformationMessage(
				'Spotify extension: Please log in to your Spotify account',
				'Login'
			);

			if (loginChoice === 'Login') {
				await promptSpotifyLogin(context);
			}
		}
	} catch (error) {
		console.error('Failed to initialize Spotify connection:', error);
		vscode.window.showErrorMessage(`Spotify initialization error: ${error.message}`);
	}
}

/**
 * Prompt user to login with Spotify
 */
async function promptSpotifyLogin(context) {
	try {
		console.log('Starting Spotify OAuth login flow...');
		// Start OAuth server
		if (!oauthServer) {
			oauthServer = new OAuthServer();
		}
		
		console.log('Starting OAuth callback server...');
		await oauthServer.start();
		
		const authUrl = authService.getAuthUrl();
		console.log('Auth URL generated, opening browser...');
		
		vscode.window.showInformationMessage('Opening Spotify login in browser...');
		await vscode.env.openExternal(vscode.Uri.parse(authUrl));

		// Wait for the authorization code (with timeout)
		console.log('Waiting for authorization code...');
		const code = await oauthServer.waitForCode(300000); // 5 minute timeout

		if (code) {
			console.log('Authorization code received, exchanging for tokens...');
			vscode.window.showInformationMessage('Exchanging code for token...');
			const tokens = await authService.exchangeCodeForToken(code);
			await authService.saveTokens(tokens);
			await apiService.initializeFromTokens(tokens.accessToken);
			
			// Get available devices
			try {
				const devices = await apiService.getAvailableDevices();
				console.log('Available Spotify devices:', devices);
			} catch (error) {
				console.error('Failed to fetch devices:', error);
			}
			
			vscode.window.showInformationMessage('✅ Spotify login successful!');
			console.log('✅ Spotify authentication successful');
		} else {
			console.warn('Authorization timeout');
			vscode.window.showErrorMessage('Authorization timeout. Please try again.');
		}
	} catch (error) {
		console.error('Spotify login error:', error);
		vscode.window.showErrorMessage(`Spotify login failed: ${error.message}`);
	} finally {
		// Stop the OAuth server
		if (oauthServer) {
			console.log('Stopping OAuth callback server...');
			await oauthServer.stop();
		}
	}
}

// This method is called when your extension is deactivated
async function deactivate() {
	if (apiService) {
		apiService.stopPlaybackPolling();
	}
	if (oauthServer) {
		await oauthServer.stop();
	}
}

module.exports = {
	activate,
	deactivate
}
