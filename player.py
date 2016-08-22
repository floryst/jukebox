from twisted.internet.defer import inlineCallbacks
from twisted.logger import Logger

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession, ApplicationRunner
from autobahn.wamp.exception import ApplicationError

class JukeboxPlayer(ApplicationSession):

    log = Logger()

    @inlineCallbacks
    def onJoin(self, details):

        self.current_song = ''
        self.is_playing = False
        self.volume = 100
        self.position = -1

        yield self.register(self.get_state,
                'com.forrestli.jukebox.player.get_state')
        yield self.register(self.play,
                'com.forrestli.jukebox.player.play')
        yield self.register(self.toggle_pause,
                'com.forrestli.jukebox.player.toggle_pause')

    def get_state(self):
        return {
            'currently_playing': self.current_song,
            'is_playing': self.is_playing,
            'volume': self.volume,
            'position': self.position
        }

    @inlineCallbacks
    def play(self, song_id, url):
        self.log.info('play: {url}', url=url)
        self.current_song = song_id
        yield self.publish('com.forrestli.jukebox.event.player.play', song_id)
        return True

    @inlineCallbacks
    def toggle_pause(self):
        yield self.publish('com.forrestli.jukebox.event.player.toggle_pause')
        return True

if __name__ == '__main__':
    runner = ApplicationRunner('ws://127.0.0.1:8080/ws', realm='realm1')
    runner.run(JukeboxPlayer)
