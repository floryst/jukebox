from twisted.logger import Logger
log = Logger()

def add(session, url):
    log.info('[jukebox.add]: {url}', url=url)
    session.publish('com.forrestli.jukebox.event.playlist.add' url)
    return True

def remove(session, song_id):
    log.info('[jukebox.remove]: {song_id}', song_id=song_id)
    session.publish('com.forrestli.jukebox.event.playlist.remove', song_id)
    return True

def play(session, song_id):
    log.info('[jukebox.play]: {song_id}', song_id=song_id)
    session.publish('com.forrestli.jukebox.event.player.play', song_id)
    return True

def toggle_pause(session):
    log.info('[jukebox.toggle_pause]')
    session.publish('com.forrestli.jukebox.event.player.toggle_pause')
    return True
