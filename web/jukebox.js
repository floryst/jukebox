(function(window, document, $, undefined) {

    var $id = function(ident) {
        return document.getElementById(ident);
    };

    window.JukeboxApp = app = {

        session: null,
        playlist: Array(),
        player_state: {
            currently_playing: '',
            is_playing: false,
            volume: -1,
            position: -1,
        },

        init: function() {
            var connection = new autobahn.Connection({
                url: 'ws://127.0.0.1:8080/ws',
                realm: 'realm1'
            });

            connection.onopen = function(session, details) {
                console.log('Connected');
                app.session = session;

                session.call('com.forrestli.jukebox.get_playlist').then(
                        function(playlist) {
                            app.playlist = playlist;
                            app.renderPlaylist();
                        },
                        function(err) {
                            console.log('[get_playlist] error:', err);
                        }
                );

                session.call('com.forrestli.jukebox.player.get_state').then(
                        function(state) {
                            app.player_state = state;
                            app.renderPlayer();
                        },
                        function(err) {
                            console.log('[get_playlist] error:', err);
                        }
                );

                session.subscribe('com.forrestli.jukebox.event.playlist.add',
                        app.onPlaylistAdd);
                session.subscribe('com.forrestli.jukebox.event.playlist.moveup',
                        app.onPlaylistMoveUp);
                session.subscribe('com.forrestli.jukebox.event.player.play',
                        app.onPlayerPlay);

                $id('addVideo').addEventListener('click', app.addVideo, false);
                $id('playpause').addEventListener('click', app.playPause, false);
                $id('volUp').addEventListener('click', app.volUp, false);
                $id('volDown').addEventListener('click', app.volDown, false);
                $id('rewindbtn').addEventListener('click', app.rewind, false);
                $id('fastforwardbtn').addEventListener('click', app.fastForward, false);
            };

            connection.onclose = function(reason, details) {
                console.log('Connection lost:', reason);
                app.session = null;
            };

            connection.open();
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

        onPlaylistAdd: function(songs) {
            app.playlist = app.playlist.concat(songs);
            app.renderPlaylist();
        },

        onPlaylistMoveUp: function(song_pos) {
            var song = app.playlist[song_pos];
            app.playlist.splice(song_pos, 1);
            app.playlist.splice(song_pos-1, 0, song);
            app.renderPlaylist();
        },

        onPlayerPlay: function(msg) {
            var songId = msg[0];
            app.player_state.currently_playing = songId;
            app.renderPlaylist();
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

    app.init();

})(window, document, jQuery);
