import pprint
import sys

from twisted.internet.defer import inlineCallbacks
from twisted.logger import Logger

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

sys.path.append('youtube-dl')
from youtube_dl import YoutubeDL

import playlist
import model_transformer

PLAYLIST_STORE = 'playlist.json'

pp = pprint.PrettyPrinter(indent=2)

class Jukebox(ApplicationSession):

    log = Logger()

    @inlineCallbacks
    def onJoin(self, details):
        self.playlist = playlist.Playlist(PLAYLIST_STORE)

        # jukebox actions
        yield self.register(self.get_playlist,
                'com.forrestli.jukebox.get_playlist')
        yield self.register(self.add, 'com.forrestli.jukebox.add')
        yield self.register(self.remove, 'com.forrestli.jukebox.remove')
        yield self.register(self.play, 'com.forrestli.jukebox.play')
        yield self.register(self.toggle_pause,
                'com.forrestli.jukebox.toggle_pause')

    @inlineCallbacks
    def get_playlist(self):
        res = yield self.playlist.get_playlist()
        return res

    @inlineCallbacks
    def add(self, url):
        self.log.info('[jukebox.add]: {url}', url=url)
        opts = {
            'skip_download': True,
            'format': 'bestaudio'
        }
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, False)
        info = model_transformer.transform(info)
        self.playlist.add_song(info)
        yield self.publish('com.forrestli.jukebox.event.playlist.add', info)
        return True

    @inlineCallbacks
    def remove(self, song_id):
        self.log.info('[jukebox.remove]: {song_id}', song_id=song_id)
        yield self.publish('com.forrestli.jukebox.event.playlist.remove',
                song_id)
        return True

    @inlineCallbacks
    def play(self, song_id):
        self.log.info('[jukebox.play]: {song_id}', song_id=song_id)
        res = yield self.call('com.forrestli.jukebox.player.play', {
            'uri': song_id
            })
        return res

    @inlineCallbacks
    def toggle_pause(self):
        self.log.info('[jukebox.toggle_pause]')
        res = yield self.call('com.forrestli.jukebox.player.toggle_pause')
        return res
