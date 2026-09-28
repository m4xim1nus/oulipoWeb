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

# Erreurs de la page source, corrigées d'après une seconde transcription (source/1014 texte images/)
# et la métrique (alexandrins, rimes). Clé : (vers 1–14, variante 0–9).
CORRECTIONS = {
    (5, 1): "Le cheval Parthénon frissonnait sous la bise",  # la page recopie le vers 1.1
    (5, 8): "Du voisin le Papou suçote l'apophyse",
    (6, 1): "du client londonien où s'ébattent les beaux",
    (6, 9): "on prépare la route aux pensers sépulcraux",
    (7, 0): "nous avions aussi froids que nus sur la banquise",
    (7, 5): "aller à la grand ville est bien une entreprise",
    (9, 9): "Le brave a beau crier ah cré nom saperlotte",   # rime en -otte
    (11, 8): "le chemin vicinal se nourrit de crottin",
}

if len(vers) != 14 or any(len(v) != 10 for v in vers):
    sys.exit(f"Structure inattendue : {[len(v) for v in vers]}")

for (i, j), txt in CORRECTIONS.items():
    vers[i - 1][j] = txt

OUT.write_text(json.dumps({"titre": "Cent mille milliards de poèmes", "auteur": "Raymond Queneau (1961)", "vers": vers}, ensure_ascii=False, indent=1))
print(f"OK : 14 × 10 vers → {OUT}")
