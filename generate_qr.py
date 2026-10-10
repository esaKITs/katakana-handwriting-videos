#!/usr/bin/env python3
"""Generate local, deterministic QR SVGs for all 46 katakana."""
import json
from pathlib import Path
import qrcode
import qrcode.image.svg

BASE = "https://esakits.github.io/katakana-handwriting-videos/"
videos = json.loads(Path("videos.json").read_text(encoding="utf-8"))
assert len(videos) == 46 and len({v["kana"] for v in videos}) == 46
folder = Path("qr")
folder.mkdir(exist_ok=True)
for v in videos:
    kana = v["kana"]
    target = BASE + "?kana=" + __import__("urllib.parse", fromlist=["quote"]).quote(kana, safe="")
    image = qrcode.make(target, image_factory=qrcode.image.svg.SvgPathImage,
                        box_size=10, border=4, error_correction=qrcode.constants.ERROR_CORRECT_M)
    image.save(folder / f"{ord(kana):04x}.svg")
print(f"Generated {len(videos)} local SVG QR codes")
