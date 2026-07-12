export interface Artist {
	id: string;
	name: string;
	coverArt: string;
	albumCount: number;
	sortName: string;
	album?: Album[];
	inceptionYear?: string;
}

export interface Album {
	id: string;
	album: string;
	title: string;
	name: string;
	coverArt: string;
	songCount: number;
	duration: number;
	artistId: string;
	artist: string;
	year?: string | null;
	song?: Song[];
}

export interface Song {
	id: string;
	title: string;
	track: number;
	duration: number;
	artist: string;
	artistId: string;
	album: string;
	coverArt: string;
	bitRate: number;
	path: string;
	album_id?: string;
	starred?: boolean;
	discNumber?: number;
	year?: string;
}

export interface Playlist {
	id: string;
	name: string;
	comment: string;
	owner: string;
	public: boolean;
	songCount: number;
	duration: number;
	created: string;
	changed: string;
	entry?: Song[];
}

export interface ArtistsIndex {
	name: string;
	artist: Artist[];
}

export interface UpdateManifest {
	channels: Record<
		string,
		{
			name: string;
			desc: string;
			versions: string[];
			password: boolean;
		}
	>;
	serverChannel?: string;
	serverUrl?: string;
}

export interface SubsonicResponse {
	'subsonic-response': {
		status: string;
		version: string;
		type: string;
		serverVersion: string;
		openSubsonic: boolean;
		artists?: { ignoredArticles: string; index: ArtistsIndex[] };
		artist?: Artist;
		album?: Album;
		albumList?: { album: Album[] };
		albumList2?: { album: Album[] };
		song?: Song;
		randomSongs?: { song: Song[] };
		searchResult2?: { artist: Artist[]; album: Album[]; song: Song[] };
		searchResult3?: { artist: Artist[]; album: Album[]; song: Song[] };
		songsWithLyrics?: { songId: string[] };
		playlists?: { playlist: Playlist[] };
		playlist?: Playlist;
	};
}
