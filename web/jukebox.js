(function(window, document, $, undefined) {

    var $id = function(ident) {
        return document.getElementById(ident);
    };

    var app = {

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

                session.subscribe('com.forrestli.jukebox.event.playlist.add',
                        app.onPlaylistAdd);

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
            $id('playlist').innerHTML = tmpl('playlistEntry', {
                playlist: app.playlist,
                player_state: app.player_state
            });
        },

        onPlaylistAdd: function(songs) {
            app.playlist = app.playlist.concat(songs);
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
