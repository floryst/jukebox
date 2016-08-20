import json
import os.path
import string
from random import randint

_playlist = list()
_backing_store = ':memory:'

def _random_id():
    bound = len(string.lowercase)
    return ''.join(string.lowercase[randint(0, bound)] for i in range(bound))

def update_store():
    if _backing_store != ':memory:':
        with open(_backing_store, 'w') as fh:
            fh.write(json.dumps(_playlist))

def set_backing_store(store):
    _backing_store = store
    if os.path.exists(store):
        with open(store, 'r') as fh:
            _playlist = json.loads(fh.read())

def add_song(song):
    """Adds a song to the playlist.

    Returns the song's new ID.
    """
    song['id'] = _random_id()
    _playlist.append(song)
    update_store()

    return song['id']

def del_song(song_id):
    for idx, song in enumerate(_playlist):
        if song_id == _playlist['id']:
            del _playlist[idx]
            return

def move_song(idx1, idx2):
    song = _playlist[idx1]
    del _playlist[idx1]
    _playlist.insert(idx2, song)
