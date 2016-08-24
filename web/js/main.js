(function(window, document, $, undefined) {

    var $id = function(ident) {
        return document.getElementById(ident);
    };

    var JukeboxApp = function() {
        var self = this;

        self.session = null;
        self.playlist = ko.observableArray();
        self.player_state = {
            currently_playing: ko.observable(''),
            _currently_playing_song: null,
            paused: ko.observable(false),
            volume: ko.observable(-1),
            position: ko.observable(-1),
        };
        self.isLoading = ko.observable(false);

        self.getCurrentSong = function() {
            var songId = self.player_state.currently_playing();
            if (songId == '') {
                return null;
            }
            else if (self.player_state._currently_playing_song == null ||
                    self.player_state._currently_playing_song.id != songId) {
                for (var i = 0; i < self.playlist().length; i++) {
                    if (self.playlist()[i].id == songId) {
                        self.player_state._currently_playing_song =
                            self.playlist()[i];
                        return self.playlist()[i];
                    }
                }
                console.error('Could not find song id', songId);
            }
            else {
                return self.player_state._currently_playing_song;
            }
        };

        self.player_state.volume.subscribe(function(volume) {
            self.session.call('com.forrestli.jukebox.player.set_volume',
                    [volume]).then(
                function(res) { },
                function(err) {
                    console.error('[volume] error:', err);
                }
            );
        });

        self.currentlyPlayingText = ko.pureComputed(function() {
            var currently_playing = self.player_state.currently_playing();
            if (currently_playing == '') {
                return 'Nothing playing!';
            }
            else {
                try {
                    return self.getCurrentSong().title;
                }
                catch (e) {
                    console.error(e);
                    console.log(self.getCurrentSong());
                }
            }
        }, self);

        self.playlistSongBtnState = function(songId) {
            return ko.computed(function() {
                if (self.player_state.currently_playing() == songId) {
                    return 'stop';
                }
                else {
                    return 'play_arrow';
                }
            });
        };

        self.isPlaying = ko.pureComputed(function() {
            return self.player_state.currently_playing() != '';
        });

        self.positionText = ko.pureComputed(function() {
            return String(100 * self.player_state.position()) + '%';
        });

        self.btnPlayPauseText = ko.pureComputed(function() {
            if (self.player_state.currently_playing() == '')
                return 'play_arrow';
            if (self.player_state.paused())
                return 'play_arrow';
            return 'pause';
        }, self);

        self.addSong = function(formElement) {
            var url = formElement.elements['youtubeURL'].value;
            formElement.elements['youtubeURL submit'].disabled = true;
            self.session.call('com.forrestli.jukebox.add', [url]).then(
                function(res) {
                    formElement.elements['youtubeURL'].value = '';
                },
                function(err) {
                    Materialize.toast('Failed to add song', 4000);
                    console.error('[add] error:', err);
                }
            ).then(function() {
                formElement.elements['youtubeURL submit'].disabled = false;
            });
        };

        self.playOrStopSong = function(songId) {
            if (self.player_state.currently_playing() == songId) {
                // stop the song
                self.session.call('com.forrestli.jukebox.player.stop').then(
                    function(res) { },
                    function(err) {
                        Materialize.toast('Failed to stop song', 4000);
                        console.error('[stop] error:', err);
                    }
                );

            }
            else {
                // play the song
                self.session.call('com.forrestli.jukebox.play', [songId]).then(
                    function(res) { },
                    function(err) {
                        Materialize.toast('Failed to play song', 4000);
                        console.error('[play] error:', err);
                    }
                );
            }
        };

        self.togglePause = function() {
            self.session.call('com.forrestli.jukebox.player.toggle_pause').then(
                function(res) { },
                function(err) {
                    Materialize.toast('Failed to toggle pause', 4000);
                    console.error('[toggle_pause] error:', err);
                }
            );
        };

        var connection = new autobahn.Connection({
            url: 'ws://127.0.0.1:8080/ws',
            realm: 'realm1'
        });

        connection.onopen = function(session, details) {
            console.info('Connected');
            self.session = session;

            self.session.__call = self.session.call;
            self.session.call = function(queue, args) {
                var timer = window.setTimeout(function() {
                    self.isLoading(true);
                }, 500);
                return self.session.__call(queue, args).then(
                    function(res) {
                        window.clearTimeout(timer);
                        self.isLoading(false);
                        return res;
                    },
                    function(err) {
                        window.clearTimeout(timer);
                        self.isLoading(false);
                        throw err;
                    }
                );
            };

            session.call('com.forrestli.jukebox.get_playlist').then(
                    function(playlist) {
                        self.playlist(playlist);
                    },
                    function(err) {
                        console.error('[get_playlist] error:', err);
                    }
            ).then(function() {
                session.call('com.forrestli.jukebox.player.get_state').then(
                        function(state) {
                            self.player_state.currently_playing(
                                    state.currently_playing);
                            self.player_state.paused(state.paused);
                            self.player_state.volume(state.volume);
                            if (state.currently_playing != '') {
                                var position = state.position /
                                    self.getCurrentSong().duration;
                                self.player_state.position(position);
                            }
                        },
                        function(err) {
                            console.error('[get_playlist] error:', err);
                        }
                );
            });

            session.subscribe('com.forrestli.jukebox.event.playlist.add',
                    self.onPlaylistAdd.bind(self));
            session.subscribe('com.forrestli.jukebox.event.player.play',
                    self.onPlayerPlay.bind(self));
            session.subscribe('com.forrestli.jukebox.event.player.stop',
                    self.onPlayerStop.bind(self));
            session.subscribe('com.forrestli.jukebox.event.player.toggle_pause',
                    self.onPlayerTogglePause.bind(self));
            session.subscribe('com.forrestli.jukebox.event.player.position',
                    self.onPlayerPosition.bind(self));
        };

        connection.onclose = function(reason, details) {
            console.error('Connection lost:', reason);
            self.session = null;
        };

        connection.open();
    };

    JukeboxApp.prototype.onPlaylistAdd = function(songs) {
        this.playlist(this.playlist().concat(songs));
    };

    JukeboxApp.prototype.onPlayerPlay = function(msg) {
        var songId = msg[0];
        this.player_state.currently_playing(songId);
    };

    JukeboxApp.prototype.onPlayerStop = function() {
        this.player_state.currently_playing('');
    };

    JukeboxApp.prototype.onPlayerTogglePause = function() {
        var newState = ! this.player_state.paused()
        this.player_state.paused(newState);
    };

    JukeboxApp.prototype.onPlayerPosition = function(position) {
        position = position[0];
        var normalized = position / this.getCurrentSong().duration;
        this.player_state.position(normalized);
    };

    ko.applyBindings(new JukeboxApp());
})(window, document, jQuery);
