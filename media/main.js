/* global acquireVsCodeApi */
/* eslint-disable no-undef */
// @ts-ignore
const vscode = acquireVsCodeApi();

// UI Elements
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const trackName = document.getElementById('trackName');
const artistName = document.getElementById('artistName');
const albumArt = document.getElementById('albumArt');
const currentTime = document.getElementById('currentTime');
const duration = document.getElementById('duration');
const progressFill = document.getElementById('progressFill');
const lyricsContainer = document.getElementById('lyricsContainer');
const errorMessage = document.getElementById('errorMessage');

// State
let isPlaying = false;
let isLoading = false;
let lyricsLines = [];
let currentLyricsIndex = -1;
let totalDuration = 0;

// Helper to disable/enable buttons
function setButtonsDisabled(disabled) {
	isLoading = disabled;
	playBtn.disabled = disabled;
	prevBtn.disabled = disabled;
	nextBtn.disabled = disabled;
	
	if (disabled) {
		playBtn.style.opacity = '0.5';
		prevBtn.style.opacity = '0.5';
		nextBtn.style.opacity = '0.5';
	} else {
		playBtn.style.opacity = '1';
		prevBtn.style.opacity = '1';
		nextBtn.style.opacity = '1';
	}
}

// Helper to show/hide error message
function showError(message) {
	if (errorMessage) {
		errorMessage.textContent = message;
		errorMessage.style.display = 'block';
		setTimeout(() => {
			errorMessage.style.display = 'none';
		}, 5000); // Auto-hide after 5 seconds
	}
}

// Event listeners for controls
playBtn.addEventListener('click', () => {
	if (isLoading) return;
	setButtonsDisabled(true);
	// Don't update isPlaying here - let the backend update tell us the actual state
	vscode.postMessage({
		command: isPlaying ? 'pause' : 'play'
	});
	// Re-enable after request
	setTimeout(() => setButtonsDisabled(false), 500);
});

prevBtn.addEventListener('click', () => {
	if (isLoading) return;
	setButtonsDisabled(true);
	vscode.postMessage({
		command: 'previous'
	});
	setTimeout(() => setButtonsDisabled(false), 500);
});

nextBtn.addEventListener('click', () => {
	if (isLoading) return;
	setButtonsDisabled(true);
	vscode.postMessage({
		command: 'next'
	});
	setTimeout(() => setButtonsDisabled(false), 500);
});

progressFill.parentElement.addEventListener('click', (e) => {
	if (isLoading) return;
	const bar = e.currentTarget;
	const rect = bar.getBoundingClientRect();
	const percent = (e.clientX - rect.left) / rect.width;
	setButtonsDisabled(true);
	vscode.postMessage({
		command: 'seek',
		percent: percent * 100 // Convert to 0-100 range
	});
	setTimeout(() => setButtonsDisabled(false), 500);
});

// Update play button appearance
function updatePlayButton() {
	playBtn.textContent = isPlaying ? '⏸' : '▶';
	playBtn.title = isPlaying ? 'Pause' : 'Play';
}

// Update now playing display
function updateNowPlaying(track) {
	if (track) {
		trackName.textContent = track.name;
		artistName.textContent = track.artist;
		if (track.albumArt) {
			albumArt.src = track.albumArt;
		}
	} else {
		trackName.textContent = 'Not Playing';
		artistName.textContent = 'No artist';
		albumArt.src = '';
	}
}

// Update progress
function updateProgress(current, total) {
	currentTime.textContent = formatTime(current);
	duration.textContent = formatTime(total);
	progressFill.style.width = total > 0 ? (current / total * 100) + '%' : '0%';
}

// Format time in mm:ss
function formatTime(ms) {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Render lyrics lines
function renderLyricsLines(lyrics) {
	const lyricsTextContainer = lyricsContainer.querySelector('.lyrics-text');
	lyricsTextContainer.innerHTML = '';
	
	// Parse lyrics into non-empty lines
	lyricsLines = lyrics
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0);
	
	if (lyricsLines.length === 0) {
		lyricsLines = ['Lyrics not available'];
	}
	
	// Create line elements
	lyricsLines.forEach((line, index) => {
		const lineEl = document.createElement('div');
		lineEl.className = 'lyrics-line';
		lineEl.textContent = line;
		lineEl.id = `lyric-line-${index}`;
		lyricsTextContainer.appendChild(lineEl);
	});
	
	currentLyricsIndex = -1;
}

// Update current lyrics line highlight based on progress
function updateCurrentLyricsLine(currentMs, totalMs) {
	// No-op - just display lyrics without highlighting
}

// Handle messages from extension
window.addEventListener('message', event => {
	const message = event.data;
	switch (message.command) {
		case 'updateNowPlaying':
			updateNowPlaying(message.track);
			isPlaying = message.isPlaying || false;
			updatePlayButton();
			break;
		case 'updateProgress':
			updateProgress(message.current, message.total);
			totalDuration = message.total;
			updateCurrentLyricsLine(message.current, message.total);
			break;
		case 'updateLyrics':
			renderLyricsLines(message.lyrics);
			break;
		case 'playingStateChanged':
			isPlaying = message.isPlaying;
			updatePlayButton();
			break;
		case 'error':
			showError('❌ ' + message.message);
			setButtonsDisabled(false);
			break;
	}
});

// Initialize UI
updatePlayButton();
updateNowPlaying(null);
