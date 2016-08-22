from twisted.internet.defer import inlineCallbacks
from twisted.logger import Logger

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession, ApplicationRunner
from autobahn.wamp.exception import ApplicationError

class JukeboxPlayer(ApplicationSession):

    log = Logger()

    @inlineCallbacks
    def onJoin(self, details):

        yield self.register(self.play,
                'com.forrestli.jukebox.player.play')
        yield self.register(self.toggle_pause,
                'com.forrestli.jukebox.player.toggle_pause')

    @inlineCallbacks
    def play(self, msg):
        yield self.publish('com.forrestli.jukebox.event.player.play', msg)
        return True

    @inlineCallbacks
    def toggle_pause(self):
        yield self.publish('com.forrestli.jukebox.event.player.toggle_pause')
        return True

if __name__ == '__main__':
    runner = ApplicationRunner('ws://127.0.0.1:8080/ws', realm='realm1')
    runner.run(JukeboxPlayer)
