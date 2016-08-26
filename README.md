# Jukebox

## Dependencies

 - python3
 - Gstreamer 1.0
 - Gstreamer 1.0 good plugins
 - Gstreamer 1.0 bad plugins
 - Gstreamer 1.0 python bindings
 - crossbar.io
 - autobahn
 - gtk3
 - pygtk

## Design

There are three primary components: the server, the audio player, and the
clients. The server is initialized as a component of the Crossbar WAMP
router. The audio player is a separate Python process that hooks up to
the audio output. Finally, the clients access the interfaces exposed by
both the server and the player.

## How to run

In order to have the jukebox server run, credentials must be created.
Create a new file in the root directory called `principals.txt`. In it,
populate it with the desired user/password/role triplet, one per line.

`
user1 password1 role1
user2 password2 role2
...
`

Then, you must set the two environment variables `JUKEBOX_SERVER_PRINCIPAL`
and `JUKEBOX_SERVER_PRINCIPAL_TICKET` with the server username and password,
respectively.

Finally, to start the server, invoke crossbar.

`crossbar start`

To run the player, export the same environment variables as with the server
and invoke the player.

`python3 player.py`

You will also need to edit `player.py` and `web/js/main.js` and change the
localhost `127.0.0.1` references to the desired URLs.
