from twisted.logger import Logger
log = Logger()

def add(url):
    log.info('[jukebox.add]: {url}', url=url)
    return True

def remove(song_id):
    log.info('[jukebox.remove]: {song_id}', song_id=song_id)
    return True

def play(song_id):
    log.info('[jukebox.play]: {song_id}', song_id=song_id)
    return True

def toggle_pause():
    log.info('[jukebox.toggle_pause]')
    return True
