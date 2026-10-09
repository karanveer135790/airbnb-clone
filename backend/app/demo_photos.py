"""Audited photo sets: one source property per demo listing, no shared images."""
import json
from pathlib import Path

GALLERIES = json.loads(Path(__file__).with_name('demo_galleries.json').read_text())

def gallery_photos(city: str) -> list[str]:
    return [photo['url'] for photo in GALLERIES[city]['photos']]
