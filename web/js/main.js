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
            paused: ko.observable(false),
            volume: ko.observable(-1),
            position: ko.observable(-1),
        };

        self.currentlyPlayingText = ko.pureComputed(function() {
            var currently_playing = self.player_state.currently_playing();
            if (currently_playing == '') {
                return 'Nothing playing!';
            }
            else {
                for (var i = 0; i < self.playlist().length; i++) {
                    if (self.playlist()[i].id == currently_playing) {
                        return self.playlist()[i].title;
                    }
                }
            }
        }, self);

        self.playlistSongBtnState = function(songId) {
            return ko.computed(function() {
                if (self.player_state.currently_playing() == songId) {
                    if (self.player_state.paused()) {
                        return 'play_arrow';
                    }
                    else {
                        return 'stop';
                    }
                }
                else {
                    return 'play_arrow';
                }
            });
        };

        self.isPlaying = ko.pureComputed(function() {
            return self.player_state.currently_playing() != '';
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
                    console.log('[add] error:', err);
                }
            ).then(function() {
                formElement.elements['youtubeURL submit'].disabled = false;
            });
        };

        self.playOrStopSong = function(songId) {
            if (self.player_state.currently_playing() == songId) {
                // stop the song
                self.session.call('com.forrestli.jukebox.stop').then(
                    function(res) {
                        console.log('[stop] res:', res);
                    },
                    function(err) {
                        Materialize.toast('Failed to stop song', 4000);
                        console.log('[stop] error:', err);
                    }
                );

            }
            else {
                // play the song
                self.session.call('com.forrestli.jukebox.play', [songId]).then(
                    function(res) {
                        console.log('[play] res:', res);
                    },
                    function(err) {
                        Materialize.toast('Failed to play song', 4000);
                        console.log('[play] error:', err);
                    }
                );
            }
        };

        self.togglePause = function() {
            self.session.call('com.forrestli.jukebox.toggle_pause').then(
                function(res) {
                    console.log('[toggle_pause] res:', res);
                },
                function(err) {
                    Materialize.toast('Failed to toggle pause', 4000);
                    console.log('[toggle_pause] error:', err);
                }
            );
        };

        var connection = new autobahn.Connection({
            url: 'ws://127.0.0.1:8080/ws',
            realm: 'realm1'
        });

        connection.onopen = function(session, details) {
            console.log('Connected');
            self.session = session;

            session.call('com.forrestli.jukebox.get_playlist').then(
                    function(playlist) {
                        self.playlist(playlist);
                    },
                    function(err) {
                        console.log('[get_playlist] error:', err);
                    }
            );

            session.call('com.forrestli.jukebox.player.get_state').then(
                    function(state) {
                        self.player_state.currently_playing(
                                state.currently_playing);
                        self.player_state.paused(state.paused);
                        self.player_state.volume(state.volume);
                        self.player_state.position(state.position);
                    },
                    function(err) {
                        console.log('[get_playlist] error:', err);
                    }
            );

            session.subscribe('com.forrestli.jukebox.event.playlist.add',
                    self.onPlaylistAdd.bind(self));
            session.subscribe('com.forrestli.jukebox.event.player.play',
                    self.onPlayerPlay.bind(self));
            session.subscribe('com.forrestli.jukebox.event.player.stop',
                    self.onPlayerStop.bind(self));
        };

        connection.onclose = function(reason, details) {
            console.log('Connection lost:', reason);
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

    JukeboxApp.prototype.onPlayerStop= function() {
        this.player_state.currently_playing('');
    };

    ko.applyBindings(new JukeboxApp());
})(window, document, jQuery);
