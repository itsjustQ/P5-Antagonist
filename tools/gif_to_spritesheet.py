"""Turn the game's animated GIFs into PNG sprite sheets.

Each GIF in img/ becomes img/sprites/<name>.png: one row of equal-sized frames, left to right,
with each frame fully composited (GIF disposal and transparency already applied). Next to it,
img/sprites/<name>.json has the frame size, frame count and how long each frame shows (ms),
which loadSpriteSheet() in sketch.js reads.

The GIFs themselves are left as they are. Re-run this after changing or adding a GIF:

    python tools/gif_to_spritesheet.py

Needs Pillow (pip install pillow).
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "img"
OUT_DIR = SRC_DIR / "sprites"
DEFAULT_DURATION_MS = 100  # Used when a GIF frame has no delay set


def convert(gif_path: Path) -> dict:
    gif = Image.open(gif_path)
    frames, durations = [], []
    for frame in ImageSequence.Iterator(gif):
        frames.append(frame.convert("RGBA"))
        durations.append(int(frame.info.get("duration") or DEFAULT_DURATION_MS))
    w, h = gif.size
    sheet = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * w, 0))
    name = gif_path.stem
    sheet.save(OUT_DIR / f"{name}.png", optimize=True)
    meta = {
        "source": gif_path.name,
        "frameWidth": w,
        "frameHeight": h,
        "frameCount": len(frames),
        "durations": durations,
    }
    (OUT_DIR / f"{name}.json").write_text(json.dumps(meta, indent=2) + "\n")
    return meta


def main() -> int:
    OUT_DIR.mkdir(exist_ok=True)
    gifs = sorted(SRC_DIR.glob("*.gif"))
    if not gifs:
        print(f"No GIFs found in {SRC_DIR}")
        return 1
    for gif_path in gifs:
        meta = convert(gif_path)
        print(f"{gif_path.name}: {meta['frameCount']} frames of "
              f"{meta['frameWidth']}x{meta['frameHeight']}, {sum(meta['durations'])} ms per loop")
    return 0


if __name__ == "__main__":
    sys.exit(main())
