from twisted.internet.defer import inlineCallbacks
from twisted.logger import Logger

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

class Jukebox(ApplicationSession):

    log = Logger()

    @inlineCallbacks
    def onJoin(self, details):

        # jukebox actions
        yield self.register(self.add, 'com.forrestli.jukebox.add')
        yield self.register(self.remove, 'com.forrestli.jukebox.remove')
        yield self.register(self.play, 'com.forrestli.jukebox.play')
        yield self.register(self.toggle_pause,
                'com.forrestli.jukebox.toggle_pause')

    def add(self, url):
        log.info('[jukebox.add]: {url}', url=url)
        self.publish('com.forrestli.jukebox.event.playlist.add' url)
        return True

    def remove(self, song_id):
        log.info('[jukebox.remove]: {song_id}', song_id=song_id)
        self.publish('com.forrestli.jukebox.event.playlist.remove', song_id)
        return True

    def play(self, song_id):
        log.info('[jukebox.play]: {song_id}', song_id=song_id)
        self.publish('com.forrestli.jukebox.event.player.play', song_id)
        return True

    def toggle_pause(self):
        log.info('[jukebox.toggle_pause]')
        self.publish('com.forrestli.jukebox.event.player.toggle_pause')
        return True
