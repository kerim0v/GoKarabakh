import json
import os
import re

from app import ROOT_DIR


def test_every_api_route_is_documented(app):
    with open(os.path.join(ROOT_DIR, "static", "openapi.json"), encoding="utf-8") as f:
        documented = {
            (path, method.upper())
            for path, methods in json.load(f)["paths"].items()
            for method in methods
        }
    missing = []
    for rule in app.url_map.iter_rules():
        if not rule.rule.startswith("/api/v1/"):
            continue
        path = re.sub(r"<(?:\w+:)?(\w+)>", r"{\1}", rule.rule)
        for method in rule.methods - {"HEAD", "OPTIONS"}:
            if (path, method) not in documented:
                missing.append(f"{method} {path}")
    assert not missing, f"Add these to static/openapi.json: {missing}"
