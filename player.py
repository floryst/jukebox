import os
import signal
import threading
import time

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

PRINCIPAL = ''
PRINCIPAL_TICKET  = ''

if 'JUKEBOX_SERVER_PRINCIPAL' in os.environ:
    PRINCIPAL = os.environ['JUKEBOX_SERVER_PRINCIPAL']
if 'JUKEBOX_SERVER_PRINCIPAL_TICKET' in os.environ:
    PRINCIPAL_TICKET = os.environ['JUKEBOX_SERVER_PRINCIPAL_TICKET']

# ensure that we can actually issue a KeyboardInterrupt to break out
# of Gtk.main()
signal.signal(signal.SIGINT, signal.SIG_DFL)

class JukeboxPlayer(ApplicationSession):

    log = Logger()

    def onConnect(self):
        self.join(self.config.realm, [u'ticket'], PRINCIPAL)

    def onChallenge(self, challenge):
        if challenge.method == u'ticket':
            return PRINCIPAL_TICKET

    @inlineCallbacks
    def onJoin(self, details):

        self.player = Gst.ElementFactory.make('playbin', None)

        self.current_song = ''

        def run_player():
            bus = self.player.get_bus()
            bus.add_signal_watch()
            bus.connect('message', self._bus_watcher)
            GObject.threads_init()
            Gtk.main()
        threading.Thread(target=run_player).start()

        @inlineCallbacks
        def monitor_player():
            while True:
                time.sleep(1)
                state, pos = self.player.query_position(Gst.Format.TIME)
                if not state:
                    continue
                # convert from nanoseconds to seconds
                pos /= 1e9
                yield self.publish(
                        'com.forrestli.jukebox.event.player.position', pos)
        threading.Thread(target=monitor_player).start()

        yield self.register(self.get_state,
                'com.forrestli.jukebox.player.get_state')
        yield self.register(self.play,
                'com.forrestli.jukebox.player.play')
        yield self.register(self.stop,
                'com.forrestli.jukebox.player.stop')
        yield self.register(self.toggle_pause,
                'com.forrestli.jukebox.player.toggle_pause')
        yield self.register(self.set_volume,
                'com.forrestli.jukebox.player.set_volume')
        yield self.register(self.forward,
                'com.forrestli.jukebox.player.forward')
        yield self.register(self.rewind,
                'com.forrestli.jukebox.player.rewind')

    @inlineCallbacks
    def _bus_watcher(self, bus, msg):
        if msg.type == Gst.MessageType.ERROR:
            self.log.info('[player] error: {error}', error=msg.parse_error())

        elif msg.type == Gst.MessageType.EOS:
            self.player.set_state(Gst.State.READY)
            res = yield self.wait_for_state(Gst.State.READY)
            if res:
                yield self.publish('com.forrestli.jukebox.event.player.finished',
                        self.current_song)
                self.current_song = ''
                # tell the progress bar to go to 100%, since it might not.
                # -2 is our way of saying "100% progress"
                yield self.publish('com.forrestli.jukebox.event.player.position',
                        -2)
            else:
                self.log.info('[bus_watcher] failed to terminate song')

        elif msg.type == Gst.MessageType.BUFFERING:
            # as per https://gstreamer.freedesktop.org/data/doc/gstreamer/head/gst-plugins-base-plugins/html/gst-plugins-base-plugins-playbin.html,
            # specifically the part on buffering.
            percent = msg.parse_buffering()
            if percent < 100:
                self.player.set_state(Gst.State.PAUSED)
                # TODO broadcast buffering state here
            else:
                self.player.set_state(Gst.State.PLAYING)

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
        ret, playing_state, pending = self.player.get_state(1)
        is_playing = ret == Gst.StateChangeReturn.SUCCESS and \
                playing_state == Gst.State.PLAYING and \
                pending == Gst.State.VOID_PENDING

        volume = self.player.get_property('volume') * 100

        state, position = self.player.query_position(Gst.Format.TIME)
        if not state:
            position = None
        else:
            # convert from nanoseconds to seconds
            position /= 1e9

        ret, playing_state, pending = self.player.get_state(1)
        paused = ret == Gst.StateChangeReturn.SUCCESS and \
                playing_state == Gst.State.PAUSED and \
                pending == Gst.State.VOID_PENDING

        return {
            'currently_playing': self.current_song,
            'is_playing': is_playing,
            'volume': volume,
            'position': position,
            'paused': paused
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
            self.log.info('[player.play] cannot play due to pending state: {state}',
                    state=pending)
            return False

        yield self.publish('com.forrestli.jukebox.event.player.play', song_id)
        return True

    @inlineCallbacks
    def stop(self):
        self.player.set_state(Gst.State.NULL)
        res = yield self.wait_for_state(Gst.State.NULL)
        if res:
            yield self.publish('com.forrestli.jukebox.event.player.stop')
            self.current_song = ''
        return res

    @inlineCallbacks
    def toggle_pause(self):
        _, state, pending = self.player.get_state(1)
        if pending == Gst.State.VOID_PENDING:
            if state == Gst.State.PLAYING:
                new_state = Gst.State.PAUSED
            elif state == Gst.State.PAUSED:
                new_state = Gst.State.PLAYING
            else:
                return False
            self.player.set_state(new_state)
            success = yield self.wait_for_state(new_state)
            if not success:
                return False
        else:
            self.log.info('[player.toggle_pause] cannot play due to pending state: {state}',
                    state=pending)
            return False

        yield self.publish('com.forrestli.jukebox.event.player.toggle_pause')
        return True

    @inlineCallbacks
    def set_volume(self, volume):
        try:
            volume = int(volume)
        except ValueError:
            return False
        if volume < 0 or volume > 100:
            return False

        self.player.set_property('volume', volume / 100)
        yield self.publish('com.forrestli.jukebox.event.player.volume', volume)
        return True

    def forward(self):
        ret, pos = self.player.query_position(Gst.Format.TIME)
        if not ret:
            return False
        # +5 seconds
        # TODO remove hardcoded 5 seconds
        pos += 5*1000000000
        ret = self.player.seek_simple(Gst.Format.TIME, Gst.SeekFlags.FLUSH, pos)
        return ret

    def rewind(self):
        ret, pos = self.player.query_position(Gst.Format.TIME)
        if not ret:
            return False
        # -5 seconds
        # TODO remove hardcoded 5 seconds
        pos = max(pos - 5*1000000000, 0)
        ret = self.player.seek_simple(Gst.Format.TIME, Gst.SeekFlags.FLUSH, pos)
        return ret

if __name__ == '__main__':
    runner = ApplicationRunner('ws://127.0.0.1:8080/ws', realm='jukebox_realm')
    runner.run(JukeboxPlayer)
