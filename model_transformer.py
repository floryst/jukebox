from playlist import SONG_MODEL

# Contains mapping from the info returned by YDL to the song model.
# Items that are the same name are implicitly transferred.
mapping = {
    'youtube': {
        'url': 'play_url',
        'webpage_url': 'source_url'
    }
}

def transform(in_info):
    """Transforms YDL output to playlist.SONG_MODEL.

    Fields in SONG_MODEL that cannot be satisfied are left as their default.

    Raises an error if in_info is not a dictionary.
    """
    if type(in_info) is not dict:
        raise Exception('in_info is not a dict!')

    out_info = dict()
    for key in SONG_MODEL:
        out_info[key] = type(SONG_MODEL[key])()

    for key in in_info:
        # 'extractor' is always in YDL output.
        extractor = in_info['extractor']
        if key in SONG_MODEL and type(in_info[key]) == type(SONG_MODEL[key]):
            out_info[key] = in_info[key]
        elif extractor in mapping and key in mapping[extractor]:
            out_info[mapping[extractor][key]] = in_info[key]
    return out_info
