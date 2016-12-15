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
            make_it_rain: ko.observable(-1)
        };
        self.isLoading = ko.observable(false);
        self.didConnectionFail = ko.observable(false);
        self.isPreloadingDone = ko.observable(false);
        self.isRaining = ko.observable(false);

        self.preloadingText = ko.pureComputed(function() {
            if (self.didConnectionFail()) {
                return 'Bad connection (i.e. wrong network, server\'s down, etc.)';
            }
            return '';
        });

        self.preloaderLoading = ko.pureComputed(function() {
            return (! self.isPreloadingDone()) && (! self.didConnectionFail());
        });

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
                function(res) {
                    if (!res) throw 'rpc returned false';
                }
            ).catch(
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
                    if (!res) throw 'rpc returned false';
                }
            ).catch(
                function(err) {
                    Materialize.toast('Failed to add song', 4000);
                    console.error('[add] error:', err);
                }
            ).then(function() {
                formElement.elements['youtubeURL'].value = '';
                formElement.elements['youtubeURL submit'].disabled = false;
            });
        };

        self.playOrStopSong = function(songId) {
            if (self.player_state.currently_playing() == songId) {
                // stop the song
                self.session.call('com.forrestli.jukebox.player.stop').then(
                    function(res) {
                        if (!res) throw 'rpc returned false';
                    }
                ).catch(
                    function(err) {
                        Materialize.toast('Failed to stop song', 4000);
                        console.error('[stop] error:', err);
                    }
                );

            }
            else {
                // play the song
                self.session.call('com.forrestli.jukebox.play', [songId]).then(
                    function(res) {
                        if (!res) throw 'return value is false';
                    }
                ).catch(
                    function(err) {
                        Materialize.toast('Failed to play song', 4000);
                        console.error('[play] error:', err);
                    }
                );
            }
        };

        self.togglePause = function() {
            self.session.call('com.forrestli.jukebox.player.toggle_pause').then(
                function(res) {
                    if (!res) throw 'return value is false';
                }
            ).catch(
                function(err) {
                    Materialize.toast('Failed to toggle pause', 4000);
                    console.error('[toggle_pause] error:', err);
                }
            );
        };

        self.toggleRain = function() {
            self.session.call('com.forrestli.jukebox.player.toggle_rain').then(
                function(res) {
                    if (!res) throw 'return value is false';
                }).catch(function(err) {
                    Materialize.toast('Failed to toggle rainy', 4000);
                    console.error('[toggle rain] error:', err);
                })
        }

        self.removeSong = function(songId) {
            self.session.call('com.forrestli.jukebox.remove', [songId]).then(
                function(res) {
                    if (!res) throw 'return value is false';
                }
            ).catch(
                function(err) {
                    Materialize.toast('Failed to remove song', 4000);
                    console.error('[remove] error:', err);
                }
            );
        };

        self.fastRewind = function() {
            Materialize.toast('Not implemented', 4000);
        };

        self.fastForward = function() {
            Materialize.toast('Not implemented', 4000);
        };

        self.draggablePlaylist = function() {
            // dunno if I'll get a noticable performance hit for calling this
            // every time the playlist is rendered
            self.sortablePlaylist = Sortable.create($id('sortable-playlist'), {
                sort: true,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                scroll: true,
                scrollSensitivity: 30,
                scrollSpeed: 10,
                dataIdAttr: 'data-id',
                handle: '.sortable-draggable',
                onStart: function(ev) {
                    self._sortableOrder = self.sortablePlaylist.toArray();
                },
                onEnd: function(ev) {
                    self.session.call('com.forrestli.jukebox.move_song',
                            [ev.oldIndex, ev.newIndex]).then(
                        function(res) {
                            if (!res) throw 'return value is false';
                        }
                    ).catch(
                        function(err) {
                            self.sortablePlaylist.sort(self._sortableOrder);
                            Materialize.toast('Failed to move song', 4000);
                            console.error('[move] error:', err);
                        }
                    );
                }
            });

            /* hacky way of getting rid of the dupe bug occurring whenever
             * a song is dragged/moved to the bottom of the playlist.
             */
            var elms = document.querySelectorAll('li[draggable=false]');
            for (var i = 0; i < elms.length; i++) {
                elms[i].parentNode.removeChild(elms[i]);
            }
        };

        var onChallenge = function(session, method, extra) {
            if (method == 'ticket')
                return 'password';
        };

        var connection = new autobahn.Connection({
            url: 'ws://127.0.0.1:8080/ws',
            realm: 'jukebox_realm',
            authmethods: ['ticket'],
            authid: 'client',
            onchallenge: onChallenge
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
                        throw err;
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
                            console.error('[get_state] error:', err);
                            throw err;
                        }
                );
            }).then(function() {
                self.isPreloadingDone(true);
            }).catch(function(err) {
                self.didConnectionFail(true);
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
            session.subscribe('com.forrestli.jukebox.event.playlist.remove',
                    self.onPlaylistRemove.bind(self));
            session.subscribe('com.forrestli.jukebox.event.playlist.move_song',
                    self.onPlaylistSongMoved.bind(self));
            session.subscribe('com.forrestli.jukebox.event.player.toggle_rain',
                    self.onPlayerToggleRain.bind(self));
        };

        connection.onclose = function(reason, details) {
            console.error('Connection lost:', reason);
            self.didConnectionFail(true);
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
        this.player_state.paused(false);
    };

    JukeboxApp.prototype.onPlayerStop = function() {
        this.player_state.currently_playing('');
        this.player_state.position(0);
    };

    JukeboxApp.prototype.onPlayerTogglePause = function() {
        var newState = ! this.player_state.paused();
        this.player_state.paused(newState);
    };

    JukeboxApp.prototype.onPlayerToggleRain = function() {
        var newState = ! this.player_state.make_it_rain();
        this.player_state.make_it_rain(newState);
    }

    JukeboxApp.prototype.onPlayerPosition = function(position) {
        position = position[0];
        var normalized;
        // -2 means 100%
        if (position == -2) {
            normalized = 1;
        }
        else {
            normalized = position / this.getCurrentSong().duration;
        }
        this.player_state.position(normalized);
    };

    JukeboxApp.prototype.onPlaylistRemove = function(songId) {
        this.playlist.remove(function(item) {
            return item.id == songId;
        });
    };

    JukeboxApp.prototype.onPlaylistSongMoved = function(songMoved) {
        // I'm lazy. XXX I should probably implement the move
        // rather than just fetching the playlist again.
        var self = this;
        self.session.call('com.forrestli.jukebox.get_playlist').then(
                function(playlist) {
                    self.playlist(playlist);
                },
                function(err) {
                    console.error('[get_playlist] error:', err);
                }
        );
    };

    ko.applyBindings(new JukeboxApp());
})(window, document, jQuery);
