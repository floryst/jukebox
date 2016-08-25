import json
import os.path
import string
from random import randint

SONG_MODEL = dict(
    title = str(),
    play_url = str(),
    source_url = str(),
    duration = int(),
    extractor = str(),
    extra_info = dict()
)

def _random_id():
    bound = len(string.ascii_lowercase)
    return ''.join(
            string.ascii_lowercase[randint(0, bound-1)] for i in range(10))

class Playlist(object):

    def __init__(self, store=':memory:'):
        self.store = store
        self.playlist = list()

        if self.store != ':memory:':
            if os.path.exists(store):
                with open(store, 'r') as fh:
                    self.playlist = json.loads(fh.read())

    def _update_store(self):
        if self.store != ':memory:':
            with open(self.store, 'w') as fh:
                fh.write(json.dumps(self.playlist))

    def add_song(self, song):
        """Adds a song to the playlist.

        Returns the song's new ID.
        """
        song['id'] = _random_id()
        self.playlist.append(song)
        self._update_store()

        return song['id']

    def remove_song(self, song_id):
        for idx, song in enumerate(self.playlist):
            if song_id == song['id']:
                del self.playlist[idx]
                return

    def move_song(self, idx1, idx2):
        if idx1 < 0 or idx1 >= len(self.playlist):
            return False
        if idx2 < 0 or idx2 >= len(self.playlist):
            return False
        song = self.playlist[idx1]
        del self.playlist[idx1]
        self.playlist.insert(idx2, song)

        self._update_store()
        return True

    def get_playlist(self):
        return self.playlist

    def get_song(self, song_id=None, song_pos=None):
        if song_id is not None:
            for song in self.playlist:
                if song['id'] == song_id:
                    return song
            return None
        elif song_pos is not None:
            return self.playlist[song_pos]

    def next_song(self, cur_song):
        for idx, song in enumerate(self.playlist):
            if song['id'] == cur_song:
                if idx < len(self.playlist) - 1:
                    return self.playlist[idx+1]['id']
                break
        return None
