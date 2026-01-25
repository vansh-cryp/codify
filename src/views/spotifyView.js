const vscode = require('vscode');

class SpotifyViewProvider {
	constructor(context) {
		this.context = context;
		this._view = undefined;
	}

	// eslint-disable-next-line no-unused-vars
	resolveWebviewView(webviewView, _context, _token) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			// Restrict the webview to only load resources from the `media` directory
			//for security reasons
			localResourceRoots: [
				vscode.Uri.joinPath(this.context.extensionUri, 'media')
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.command) {
				case 'play':
					vscode.window.showInformationMessage('Play clicked');
					break;
				case 'pause':
					vscode.window.showInformationMessage('Pause clicked');
					break;
				case 'next':
					vscode.window.showInformationMessage('Next clicked');
					break;
				case 'previous':
					vscode.window.showInformationMessage('Previous clicked');
					break;
				case 'search':
					vscode.window.showInformationMessage(`Search for: ${data.query}`);
					break;
			}
		});
	}

	_getHtmlForWebview(webview) {
		// Get the local path to main script run in the webview, then convert it to a URI we can use in the webview.
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js')
		);

		// Same for stylesheet
		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, 'media', 'style.css')
		);

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
				<title>Spotify</title>
			</head>
			<body>
				<div class="spotify-container">
					<div class="header">
						<h1><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-spotify" viewBox="0 0 16 16">
  <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0m3.669 11.538a.5.5 0 0 1-.686.165c-1.879-1.147-4.243-1.407-7.028-.77a.499.499 0 0 1-.222-.973c3.048-.696 5.662-.397 7.77.892a.5.5 0 0 1 .166.686m.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.321-5.428-1.704-7.972-.932a.625.625 0 0 1-.362-1.194c2.905-.881 6.517-.454 8.986 1.063a.624.624 0 0 1 .206.858m.084-2.268C10.154 5.56 5.9 5.419 3.438 6.166a.748.748 0 1 1-.434-1.432c2.825-.857 7.523-.692 10.492 1.07a.747.747 0 1 1-.764 1.288"/>
</svg> Codify</h1>
					</div>

					<div class="now-playing">
						<div class="album-art">
							<img id="albumArt" src="" alt="Album Art">
						</div>
						<div class="track-info">
							<div class="track-name" id="trackName">Not Playing</div>
							<div class="artist-name" id="artistName">No artist</div>
							<div class="progress">
								<span class="time" id="currentTime">0:00</span>
								<div class="progress-bar">
									<div class="progress-fill" id="progressFill"></div>
								</div>
								<span class="time" id="duration">0:00</span>
							</div>
						</div>
					</div>

					<div class="controls">
						<button class="control-btn" id="prevBtn" title="Previous">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-left-fill" viewBox="0 0 16 16">
  <path d="m3.86 8.753 5.482 4.796c.646.566 1.658.106 1.658-.753V3.204a1 1 0 0 0-1.659-.753l-5.48 4.796a1 1 0 0 0 0 1.506z"/>
</svg>
						</button>
						<button class="control-btn play-btn" id="playBtn" title="Play">
							
						</button>
						<button class="control-btn" id="nextBtn" title="Next">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-right-fill" viewBox="0 0 16 16">
  <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
</svg>
						</button>
					</div>

					<div class="search-section">
						<input 
							type="text" 
							class="search-input" 
							id="searchInput" 
							placeholder="Search tracks..."
						>
						<button class="search-btn" id="searchBtn">🔍</button>
					</div>

					<div class="playlist-section">
						<h2>Search Results</h2>
						<div class="track-list" id="trackList">
							<p class="empty-state">Search for tracks to play</p>
						</div>
					</div>
				</div>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

module.exports = SpotifyViewProvider;
