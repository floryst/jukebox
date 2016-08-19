from twisted.internet.defer import inlineCallbacks
from twisted.logger import Logger

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

import jukebox

class JukeboxSession(ApplicationSession):

    log = Logger()

    @inlineCallbacks
    def onJoin(self, details):

        # jukebox actions
        yield self.register(jukebox.add, 'com.forrestli.jukebox.add')
        yield self.register(jukebox.remove, 'com.forrestli.jukebox.remove')
        yield self.register(jukebox.play, 'com.forrestli.jukebox.play')
        yield self.register(jukebox.toggle_pause,
                'com.forrestli.jukebox.toggle_pause')
