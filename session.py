from twisted.internet.defer import inlineCallbacks
from twisted.logger import Logger

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

import jukebox

def wrap(session, func):
    def func(*args, **kwargs):
        return func(session, *args, **kwargs)
    return func

class JukeboxSession(ApplicationSession):

    log = Logger()

    @inlineCallbacks
    def onJoin(self, details):

        # jukebox actions
        yield self.register(
                wrap(self, jukebox.add), 'com.forrestli.jukebox.add')
        yield self.register(
                wrap(self, jukebox.remove), 'com.forrestli.jukebox.remove')
        yield self.register(
                wrap(self, jukebox.play), 'com.forrestli.jukebox.play')
        yield self.register(
                wrap(self, jukebox.toggle_pause),
                'com.forrestli.jukebox.toggle_pause')
