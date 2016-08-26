import os
import pprint
import sys
from multiprocessing.pool import ThreadPool

from twisted.internet.defer import inlineCallbacks
from twisted.logger import Logger

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

sys.path.append('../youtube-dl')
from youtube_dl import YoutubeDL

import playlist
import model_transformer

PLAYLIST_STORE = 'playlist.json'

PRINCIPAL = ''
PRINCIPAL_TICKET  = ''

if 'JUKEBOX_SERVER_PRINCIPAL' in os.environ:
    PRINCIPAL = os.environ['JUKEBOX_SERVER_PRINCIPAL']
if 'JUKEBOX_SERVER_PRINCIPAL_TICKET' in os.environ:
    PRINCIPAL_TICKET = os.environ['JUKEBOX_SERVER_PRINCIPAL_TICKET']

pp = pprint.PrettyPrinter(indent=2)

class Jukebox(ApplicationSession):

    log = Logger()

    def onConnect(self):
        self.join(self.config.realm, [u'ticket'], PRINCIPAL)

    def onChallenge(self, challenge):
        if challenge.method == u'ticket':
            return PRINCIPAL_TICKET

    @inlineCallbacks
    def onJoin(self, details):
        self.playlist = playlist.Playlist(PLAYLIST_STORE)
        self.thread_pool = ThreadPool(processes=20)

        # jukebox actions
        yield self.register(self.get_playlist,
                'com.forrestli.jukebox.get_playlist')
        yield self.register(self.add, 'com.forrestli.jukebox.add')
        yield self.register(self.remove, 'com.forrestli.jukebox.remove')
        yield self.register(self.play, 'com.forrestli.jukebox.play')
        yield self.register(self.move_song, 'com.forrestli.jukebox.move_song')

        yield self.subscribe(self.on_finish_song,
                'com.forrestli.jukebox.event.player.finished')

    @inlineCallbacks
    def ydl_get_info(self, url):
        def _extract(url):
            opts = {
                'skip_download': True,
                'format': 'bestaudio'
            }
            with YoutubeDL(opts) as ydl:
                return ydl.extract_info(url, False)
        async_result = self.thread_pool.apply_async(_extract, (url,))
        while not async_result.ready():
            yield sleep(1)
        if async_result.successful():
            return async_result.get()
        else:
            return None

    def get_playlist(self):
        return self.playlist.get_playlist()

    @inlineCallbacks
    def add(self, url):
        self.log.info('[jukebox.add]: {url}', url=url)

        info = yield self.ydl_get_info(url)
        info = model_transformer.transform(info)

        self.playlist.add_song(info)
        yield self.publish('com.forrestli.jukebox.event.playlist.add', info)
        return True

    @inlineCallbacks
    def remove(self, song_id):
        self.log.info('[jukebox.remove]: {song_id}', song_id=song_id)
        self.playlist.remove_song(song_id)

        yield self.publish('com.forrestli.jukebox.event.playlist.remove',
                song_id)
        return True

    @inlineCallbacks
    def play(self, song_id):
        self.log.info('[jukebox.play]: {song_id}', song_id=song_id)
        source_url = self.playlist.get_song(song_id=song_id)['source_url']

        info = yield self.ydl_get_info(url)
        info = model_transformer.transform(info)

        res = yield self.call('com.forrestli.jukebox.player.play',
            song_id, info['play_url'])
        return res

    @inlineCallbacks
    def move_song(self, orig_pos, new_pos):
        res = self.playlist.move_song(orig_pos, new_pos)
        if res:
            yield self.publish('com.forrestli.jukebox.event.playlist.move_song',
                    orig_pos, new_pos)
        return res

    @inlineCallbacks
    def on_finish_song(self, song_id):
        next_song = self.playlist.next_song(song_id)
        if next_song is None:
            yield self.call('com.forrestli.jukebox.player.stop')
        else:
            self.play(next_song)
