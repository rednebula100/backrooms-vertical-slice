import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance


def public_path(root: Path, source: str) -> Path:
    return root / "public" / source.lstrip("/")


def render_packet(root: Path, packet: dict) -> None:
    source_path = public_path(root, packet["references"]["cleanSource"])
    source = Image.open(source_path).convert("RGB")
    scene_packets = [entry for entry in REGISTRY["packets"] if entry["sourceSceneId"] == packet["sourceSceneId"]]

    dimmed = ImageEnhance.Brightness(source).enhance(0.34).convert("RGBA")
    marks = Image.new("RGBA", source.size, (0, 0, 0, 0))
    drawer = ImageDraw.Draw(marks, "RGBA")
    for entry in scene_packets:
        selected = entry["sourcePathId"] == packet["sourcePathId"]
        points = [tuple(point) for point in entry["mask"]]
        fill = (83, 217, 146, 82) if selected else (210, 85, 78, 44)
        outline = (103, 242, 167, 255) if selected else (174, 74, 69, 210)
        drawer.polygon(points, fill=fill)
        drawer.line(points + [points[0]], fill=outline, width=8 if selected else 4, joint="curve")
    route_map = Image.alpha_composite(dimmed, marks).convert("RGB")
    route_map_path = public_path(root, packet["references"]["routeMap"])
    route_map_path.parent.mkdir(parents=True, exist_ok=True)
    route_map.save(route_map_path, format="PNG", optimize=True)

    box = packet["cropBox"]
    crop = source.crop((box["left"], box["top"], box["left"] + box["width"], box["top"] + box["height"]))
    crop_path = public_path(root, packet["references"]["routeCrop"])
    crop.save(crop_path, format="PNG", optimize=True)


parser = argparse.ArgumentParser()
parser.add_argument("--root", required=True)
parser.add_argument("--registry", required=True)
args = parser.parse_args()
ROOT = Path(args.root).resolve()
REGISTRY = json.loads(Path(args.registry).read_text(encoding="utf-8"))
for route_packet in REGISTRY["packets"]:
    render_packet(ROOT, route_packet)
print(f"Rendered {len(REGISTRY['packets'])} route packet asset pairs.")
