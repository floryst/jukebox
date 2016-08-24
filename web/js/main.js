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

        self.currentlyPlayingText = ko.computed(function() {
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

        self.playSong = function(songId) {
            self.session.call('com.forrestli.jukebox.play', [songId]).then(
                function(res) {
                    console.log('[play] res:', res);
                },
                function(err) {
                    Materialize.toast('Failed to play song', 4000);
                    console.log('[play] error:', err);
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

    ko.applyBindings(new JukeboxApp());

    window.JukeboxApp = app = {

        init: function() {
        },

        renderPlaylist: function() {
            $id('playlist').innerHTML = tmpl('playlistTmpl', {
                playlist: app.playlist,
                player_state: app.player_state,
                actions: {
                    playSong: app.playSong
                }
            });
        },

        renderPlayer: function() {
            $id('player').innerHTML = tmpl('playerTmpl', {
                player_state: app.player_state
            });
            // Need this from ui.js
            $(window).resize();
        },

        playSong: function(songPos) {
            var songId = app.playlist[songPos].id;
            app.session.call('com.forrestli.jukebox.play', [songId]).then(
                    function(res) {
                        console.log('[play] res:', res);
                    },
                    function(err) {
                        console.log('[play] error:', err);
                    }
            );
        },

        removeSong: function(songPos) {
            var songId = app.playlist[songPos].id;
            app.session.call('com.forrestli.jukebox.remove', [songId]).then(
                    function(res) {
                        console.log('[remove] res:', res);
                    },
                    function(err) {
                        console.log('[remove] error:', err);
                    }
            );
        },

        moveupSong: function(songPos) {
            app.session.call('com.forrestli.jukebox.moveup', [songPos]).then(
                    function(res) {
                        console.log('[moveup] res:', res);
                    },
                    function(err) {
                        console.log('[moveup] error:', err);
                    }
            );
        },

        addVideo: function() {
            var url = $id('videoUrl').value;
            $id('videoUrl').value = '';
            app.session.call('com.forrestli.jukebox.add', [url]).then(
                    function(res) {
                        console.log('[add] res:', res);
                    },
                    function(err) {
                        console.log('[add] error:', err);
                    }
            );
        },

        playPause: function() {
            app.session.call('com.forrestli.jukebox.toggle_pause').then(
                    function(res) {
                        console.log('[playpause] res:', res);
                    },
                    function(err) {
                        console.log('[playpause] error:', err);
                    }
            );
        },

        volUp: function() {
            app.session.call('com.forrestli.jukebox.volup').then(
                    function(res) {
                        console.log('[volup] res:', res);
                    },
                    function(err) {
                        console.log('[volup] error:', err);
                    }
            );
        },

        volDown: function() {
            app.session.call('com.forrestli.jukebox.voldown').then(
                    function(res) {
                        console.log('[voldown] res:', res);
                    },
                    function(err) {
                        console.log('[voldown] error:', err);
                    }
            );
        },
    };

    //app.init();

})(window, document, jQuery);
