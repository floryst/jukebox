from twisted.internet.defer import inlineCallbacks
from twisted.logger import Logger

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

class JukeboxPlayer(ApplicationSession):

    log = Logger()

    @inlineCallbacks
    def onJoin(self, details):

        yield self.register(self.play,
                'com.forrestli.jukebox.player.play')
        yield self.register(self.toggle_pause,
                'com.forrestli.jukebox.player.toggle_pause')

    def play(self, msg):
        yield self.publish('com.forrestli.jukebox.event.player.play', msg)
        return True

    def toggle_pause(self):
        yield self.publish('com.forrestli.jukebox.event.player.toggle_pause')
        return True
