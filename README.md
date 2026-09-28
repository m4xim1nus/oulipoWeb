# Oulipo en classe

Outils projetables pour la séquence interdisciplinaire Oulipo (IDIS 2nde, maths / français).
Site statique, sans compte ni serveur : <https://oulipo.technoperchoir.fr>

| Onglet | Usage |
|---|---|
| `#sonnets` | *Cent mille milliards de poèmes* : structure du sonnet, les 10 variantes de chaque vers, poème au hasard, numéro à 14 chiffres (permalien `#sonnets/31648146429607`), lecture vers par vers. Protégé par mot de passe. |
| `#lettres` | Compteur de lettres : effectifs, fréquences, comparaison au français moyen, lettres absentes (lipogrammes). |
| `#cesar` | Chiffre de César : déchiffrer / chiffrer, alphabets alignés, deviner avec la lettre E, force brute (26 décalages). |

## Raccourcis clavier

- Partout : `F` plein écran.
- Sonnets : `Espace` au hasard, `↑ ↓` choisir le vers, `← →` changer de variante, `0`–`9` taper le numéro chiffre par chiffre. En mode « Vers par vers » : `Espace` / `→` vers suivant, `←` revenir, `Échap` quitter.
- César : `← →` changer le décalage, `Échap` fermer la liste des 26 décalages.

## Les vers de Queneau

Le texte est sous droit d'auteur : seul `data/queneau.enc.json` (chiffré AES-GCM, clé dérivée du mot de passe par PBKDF2) est publié. Le clair `data/queneau.json` n'est pas versionné.

```sh
python3 tools/scrape.py      # régénère data/queneau.json depuis laclassevirtuelle.fr
node tools/encrypt.mjs       # chiffre avec le mot de passe (demandé au clavier)
```

Pour changer de mot de passe : relancer `node tools/encrypt.mjs`, puis commit + push. Les appareils qui avaient mémorisé l'ancien le redemanderont.

Le moteur lit n'importe quel fichier `{ "titre", "vers": [[…n variantes…] × 14] }` : il pourra afficher le livre de la classe en S5.

## Développement et mise en ligne

```sh
python3 -m http.server 8000  # puis http://localhost:8000 (le déchiffrement exige localhost ou HTTPS)
git push                     # GitHub Pages redéploie en ~1 min
```

HTML/CSS/JS sans dépendance ni build. Polices : Google Fonts (Spectral, Atkinson Hyperlegible).
