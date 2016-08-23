import signal
import threading

from twisted.internet.defer import inlineCallbacks
from twisted.logger import Logger

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession, ApplicationRunner
from autobahn.wamp.exception import ApplicationError

import gi
gi.require_version('Gst', '1.0')
gi.require_version('Gtk', '3.0')
from gi.repository import Gst, GObject, Gtk
Gst.init(None)

# ensure that we can actually issue a KeyboardInterrupt to break out
# of Gtk.main()
signal.signal(signal.SIGINT, signal.SIG_DFL)

class JukeboxPlayer(ApplicationSession):

    log = Logger()

    @inlineCallbacks
    def onJoin(self, details):

        self.player = Gst.ElementFactory.make('playbin', None)
        self.current_song = ''
        self.is_playing = False
        self.volume = 100
        self.position = -1

        def run_player():
            bus = self.player.get_bus()
            bus.add_signal_watch()
            bus.connect('message', self._bus_watcher)
            GObject.threads_init()
            Gtk.main()
        threading.Thread(target=run_player).start()

        yield self.register(self.get_state,
                'com.forrestli.jukebox.player.get_state')
        yield self.register(self.play,
                'com.forrestli.jukebox.player.play')
        yield self.register(self.toggle_pause,
                'com.forrestli.jukebox.player.toggle_pause')

    def _bus_watcher(self, bus, msg):
        if msg.type == Gst.MessageType.ERROR:
            self.log.info('[player] error: {error}', error=msg.parse_error())

    @inlineCallbacks
    def wait_for_state(self, gst_state):
        """I know this isn't asynchronous, but it gets the job done.
        Technically I should be checking for state changes in _bus_watcher...
        """
        counter = 0
        max_counter = 10
        while counter <= max_counter:
            # block up to 1 second
            state_change_return, state, pending  = self.player.get_state(1)
            if state_change_return == Gst.StateChangeReturn.SUCCESS:
                return True
            yield sleep(0.5)
            counter += 1
        self.log.info('State change failed: {ret}, {state}, {pending}',
                ret=state_change_return, state=state, pending=pending)
        return False

    def get_state(self):
        return {
            'currently_playing': self.current_song,
            'is_playing': self.is_playing,
            'volume': self.volume,
            'position': self.position
        }

    @inlineCallbacks
    def play(self, song_id, url):
        _, _, pending = self.player.get_state(1)
        if pending == Gst.State.VOID_PENDING:
            self.player.set_state(Gst.State.READY)
            success = yield self.wait_for_state(Gst.State.READY)
            if not success:
                return False

            self.current_song = song_id
            self.player.set_property('uri', url)

            self.player.set_state(Gst.State.PLAYING)
            success = yield self.wait_for_state(Gst.State.PLAYING)
            if not success:
                return False
        else:
            self.log.info('[player] cannot play due to pending state: {state}',
                    state=pending)
            return False

        yield self.publish('com.forrestli.jukebox.event.player.play', song_id)
        return True

    @inlineCallbacks
    def toggle_pause(self):
        yield self.publish('com.forrestli.jukebox.event.player.toggle_pause')
        return True

if __name__ == '__main__':
    runner = ApplicationRunner('ws://127.0.0.1:8080/ws', realm='realm1')
    runner.run(JukeboxPlayer)
