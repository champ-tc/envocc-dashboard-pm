"""Build district geometry from the maintained tambon boundary asset (not ETL data)."""
import json
from collections import defaultdict
from pathlib import Path

from shapely import make_valid
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

data_dir = Path(__file__).resolve().parents[4] / "public" / "data"
source = json.loads((data_dir / "tambon_boundaries.geojson").read_text())
groups = defaultdict(list)
for feature in source["features"]:
    groups[feature["properties"]["ADM2_PCODE"]].append(feature)

features = []
for code, members in sorted(groups.items()):
    properties = {key: value for key, value in members[0]["properties"].items()
                  if not key.startswith("ADM3_")}
    geometry = unary_union([make_valid(shape(member["geometry"])) for member in members])
    features.append({"type": "Feature", "properties": properties, "geometry": mapping(geometry)})

target = data_dir / "dds-district-boundaries.geojson"
target.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")))
print(f"Built {len(features)} district boundaries: {target}")
