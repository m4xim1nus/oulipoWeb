"""Récupère les 140 vers des Cent mille milliards de poèmes → data/queneau.json (non versionné)."""
import html, json, re, sys, urllib.request
from pathlib import Path

URL = "https://www.laclassevirtuelle.fr/danquen2"
OUT = Path(__file__).resolve().parent.parent / "data" / "queneau.json"

raw = urllib.request.urlopen(URL).read().decode("utf-8")
lines = [html.unescape(l).replace("\xa0", " ").strip() for l in re.sub(r"<[^>]*>", "\n", raw).split("\n")]
lines = [re.sub(r"\s+", " ", l) for l in lines if l.strip()]

vers, cur = [], None
for l in lines:
    if re.fullmatch(r"Vers \d\d", l):
        cur = []
        vers.append(cur)
    elif cur is not None and len(cur) < 10:
        cur.append(l)

if len(vers) != 14 or any(len(v) != 10 for v in vers):
    sys.exit(f"Structure inattendue : {[len(v) for v in vers]}")

OUT.write_text(json.dumps({"titre": "Cent mille milliards de poèmes", "auteur": "Raymond Queneau (1961)", "vers": vers}, ensure_ascii=False, indent=1))
print(f"OK : 14 × 10 vers → {OUT}")
