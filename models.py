import json
from random import randint
import string

ID_LEN = 10
def random_id():
    bound = len(string.ascii_lowercase)
    return ''.join(
            string.ascii_lowercase[randint(0, bound-1)] for i in range(ID_LEN))

class Song(object):

    def __init__(self, title, play_url, source_url, duration,
            extractor, id=None, extra_info=None):
        self.title = title
        self.play_url = play_url
        self.source_url = source_url
        self.duration = duration
        self.extractor = extractor
        if extra_info is None:
            extra_info = dict()
        self.extra_info = extra_info
        if id is None:
           id = random_id()
        self.id = id

    def to_dict(self):
        # clone; do I have to clone?
        return dict(**self.__dict__)

    def to_json(self):
        return json.dumps(self.__dict__)

    @classmethod
    def from_json(cls, data):
        def decoder(json_object):
            # ignore empty objects
            if len(json_object.keys()) == 0:
                return None
            # this will throw exception if data is not of the Song format.
            return cls(**json_object)
        return json.JSONDecoder(object_hook=decoder).decode(data)

class Youtube(Song):

    def __init__(self, info):
       '''Given info should not be in playlist form.'''
       for fmt in info['formats']:
           if fmt['format_id'] == '249':
               url = fmt['url']
       super().__init__(
               title=info['title'],
               play_url=url,
               source_url=info['webpage_url'],
               duration=info['duration'],
               extractor=info['extractor'])

class Bandcamp(Song):

    def __init__(self, info):
       '''Given info should not be in playlist form.'''
       super().__init__(
               title=info['title'],
               play_url=info['url'],
               source_url=info['webpage_url'],
               duration=info['duration'],
               extractor=info['extractor'])
