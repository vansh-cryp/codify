/* global acquireVsCodeApi */
/* eslint-disable no-undef */
// @ts-ignore
const vscode = acquireVsCodeApi();

// UI Elements
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const trackList = document.getElementById('trackList');
const trackName = document.getElementById('trackName');
const artistName = document.getElementById('artistName');
const albumArt = document.getElementById('albumArt');
const currentTime = document.getElementById('currentTime');
const duration = document.getElementById('duration');
const progressFill = document.getElementById('progressFill');

// State
let isPlaying = false;

// Event listeners for controls
playBtn.addEventListener('click', () => {
	isPlaying = !isPlaying;
	updatePlayButton();
	vscode.postMessage({
		command: isPlaying ? 'play' : 'pause'
	});
});

prevBtn.addEventListener('click', () => {
	vscode.postMessage({
		command: 'previous'
	});
});

nextBtn.addEventListener('click', () => {
	vscode.postMessage({
		command: 'next'
	});
});

searchBtn.addEventListener('click', () => {
	const query = searchInput.value.trim();
	if (query) {
		vscode.postMessage({
			command: 'search',
			query: query
		});
	}
});

searchInput.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') {
		const query = searchInput.value.trim();
		if (query) {
			vscode.postMessage({
				command: 'search',
				query: query
			});
		}
	}
});

progressFill.parentElement.addEventListener('click', (e) => {
	const bar = e.currentTarget;
	const rect = bar.getBoundingClientRect();
	const percent = (e.clientX - rect.left) / rect.width;
	vscode.postMessage({
		command: 'seek',
		percent: percent
	});
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

// Display search results
function displaySearchResults(tracks) {
	trackList.innerHTML = '';
	if (tracks && tracks.length > 0) {
		tracks.forEach(track => {
			const trackItem = document.createElement('div');
			trackItem.className = 'track-item';
			trackItem.innerHTML = `
				<div class="track-item-name">${track.name}</div>
				<div class="track-item-artist">${track.artist}</div>
			`;
			trackItem.addEventListener('click', () => {
				vscode.postMessage({
					command: 'playTrack',
					trackId: track.id
				});
			});
			trackList.appendChild(trackItem);
		});
	} else {
		trackList.innerHTML = '<p class="empty-state">No tracks found</p>';
	}
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
			break;
		case 'searchResults':
			displaySearchResults(message.tracks);
			break;
		case 'playingStateChanged':
			isPlaying = message.isPlaying;
			updatePlayButton();
			break;
	}
});

// Initialize UI
updatePlayButton();
updateNowPlaying(null);
