


function PlayerStore() {
	
	this.audioElement = {
		currentTime: 0,
		src: '',
		play: function () {
			return Promise.resolve();
		},
		catch: function () {}
	};
	this.currentTrack = null;
	this.currentTime = 0;
	this.trackHistory = [];
	this.nextUp = [];
}

PlayerStore.prototype.prevTrack = function () {
	console.log('Previous track, currentTrack:', this.currentTrack?.id);
	if (this.currentTrack && this.currentTime >= 1.5) {
		console.log('Song is more than 1.5 seconds in, seeking to start');
		this.seek(0);
		return;
	}
	if (this.trackHistory.length === 0) return;
	if (this.currentTrack) this.nextUp.unshift(this.currentTrack);
	this.currentTrack = this.trackHistory.pop();
	console.log('Previous track set to:', this.currentTrack.id);
	if (this.audioElement) {
		this.audioElement.src = this.getStreamUrl(this.currentTrack.id);
		this.audioElement.play().catch(() => {});
	}
};

PlayerStore.prototype.seek = function (time) {
	console.log('Seek to time:', time);
	if (this.audioElement) this.audioElement.currentTime = time;
};

PlayerStore.prototype.getStreamUrl = function (songId) {
	return '/stream/' + songId;
};

PlayerStore.prototype.setCurrentTrack = function (song) {
	this.currentTrack = song;
};

PlayerStore.prototype.setCurrentTime = function (time) {
	this.currentTime = time;
};

PlayerStore.prototype.addToTrackHistory = function (song) {
	this.trackHistory.push(song);
};

PlayerStore.prototype.getCurrentTrack = function () {
	return this.currentTrack;
};

PlayerStore.prototype.getCurrentTime = function () {
	return this.currentTime;
};


function runTests() {
	console.log('=== Testing prevTrack behavior ===\n');

	const player = new PlayerStore();

	
	const song1 = {
		id: 'song1',
		title: 'Song 1',
		artist: 'Artist 1',
		album: 'Album 1',
		albumId: 'album1',
		artistId: 'artist1',
		coverArt: 'cover1.jpg'
	};

	const song2 = {
		id: 'song2',
		title: 'Song 2',
		artist: 'Artist 2',
		album: 'Album 2',
		albumId: 'album2',
		artistId: 'artist2',
		coverArt: 'cover2.jpg'
	};

	const song3 = {
		id: 'song3',
		title: 'Song 3',
		artist: 'Artist 3',
		album: 'Album 3',
		albumId: 'album3',
		artistId: 'artist3',
		coverArt: 'cover3.jpg'
	};

	
	console.log('Test 1: Song is less than 1.5 seconds in (0.5s)');
	player.setCurrentTrack(song1);
	player.setCurrentTime(0.5);
	player.addToTrackHistory(song2);
	player.prevTrack();
	console.log('Expected: Go to previous track (song2)');
	console.log('Actual: Current track should be song2');
	console.log('Current track:', player.getCurrentTrack()?.id);
	console.log();

	
	console.log('Test 2: Song is more than 1.5 seconds in (2.0s)');
	player.setCurrentTrack(song1);
	player.setCurrentTime(2.0);
	player.addToTrackHistory(song2);
	player.prevTrack();
	console.log('Expected: Seek to start (0s), no track change');
	console.log('Actual: Current track should still be song1, currentTime should be 0');
	console.log(
		'Current track:',
		player.getCurrentTrack()?.id,
		'Current time:',
		player.getCurrentTime()
	);
	console.log();

	
	console.log('Test 3: No track history, song at 2.0s');
	player.setCurrentTrack(song1);
	player.setCurrentTime(2.0);
	player.trackHistory = [];
	player.prevTrack();
	console.log('Expected: Seek to start (0s)');
	console.log('Actual: Current track should still be song1, currentTime should be 0');
	console.log(
		'Current track:',
		player.getCurrentTrack()?.id,
		'Current time:',
		player.getCurrentTime()
	);
	console.log();

	
	console.log('Test 4: No track history, song at 0.5s');
	player.setCurrentTrack(song1);
	player.setCurrentTime(0.5);
	player.trackHistory = [];
	player.prevTrack();
	console.log('Expected: Do nothing');
	console.log('Actual: Current track should still be song1, currentTime should be 0.5');
	console.log(
		'Current track:',
		player.getCurrentTrack()?.id,
		'Current time:',
		player.getCurrentTime()
	);
	console.log();

	console.log('=== All tests completed ===');
}

runTests();
