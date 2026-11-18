"""Fetch the CC0 hairless skin used by skin_detail.py; run with Python 3."""
import hashlib
from pathlib import Path
import urllib.request
import zipfile

CACHE = Path(__file__).resolve().parent / '.cache'
PACK = CACHE / 'skins01_cc0.zip'
MEMBER = 'skins/bobby_03_young_female_hairless/Young_Female_Hairless.png'
SOURCE = 'https://files.makehumancommunity.org/asset_packs/skins01/skins01_cc0.zip'

if __name__ == '__main__':
    CACHE.mkdir(exist_ok=True)
    if not PACK.is_file():
        temporary = PACK.with_suffix('.download')
        urllib.request.urlretrieve(SOURCE, temporary)
        temporary.rename(PACK)
    with zipfile.ZipFile(PACK) as archive:
        data = archive.read(MEMBER)
    if hashlib.sha256(data).hexdigest() != '9e2fa4ab993dd938ba896bb98848bd65346500c4c0a07d8789d2f1e14bb3dd7f':
        raise RuntimeError('Skin source checksum changed; inspect before rebuilding')
    (CACHE / 'skin-detail-source.png').write_bytes(data)
    print('Skin source SHA256:', hashlib.sha256(data).hexdigest())
