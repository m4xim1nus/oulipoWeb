# Oulipo en classe

Outils projetables pour la séquence interdisciplinaire Oulipo (IDIS 2nde, maths / français).
Site statique, sans compte ni serveur : <https://oulipo.technoperchoir.fr>

| Onglet | Usage |
|---|---|
| `#sonnets` | *Cent mille milliards de poèmes* : structure du sonnet, les 10 variantes de chaque vers, poème au hasard, numéro à 14 chiffres (permalien `#sonnets/31648146429607`), composition vers par vers (on choisit chaque vers parmi ses variantes). Protégé par mot de passe. |
| `#classe` | Poèmes de la classe : 10 groupes écrivent chacun un sonnet de 14 vers (schéma de rimes de Queneau). **Écrire** : un onglet par groupe (n° 0 à 9), un champ par vers, coller un poème entier remplit les 14 vers ; à droite, le vers sélectionné dans les 10 poèmes pour vérifier rimes et raccords. **Lire** (`#classe/lire/<numéro>`) : le même lecteur que Queneau (variantes, au hasard, composition vers par vers, livre). Possible dès 2 poèmes complets (n<sup>14</sup> poèmes). |
| `#lettres` | Compteur de lettres : effectifs, fréquences, comparaison au français moyen, lettres absentes (lipogrammes). Exemples : Du Bellay, articles Wikipédia complets « Minecraft » et « Aya Nakamura » (`data/wiki-*.txt`, CC BY-SA, hors notes et annexes), incipit de *La Disparition* (mot de passe). |
| `#cesar` | Chiffre de César : déchiffrer / chiffrer, alphabets alignés, fréquences des lettres (message chiffré, puis déchiffré comparé au français moyen), force brute (26 décalages). |

## Dévoiler pas à pas : les « yeux » de la barre du haut

À droite de la barre, un bouton œil par élément de l'onglet courant : un clic le masque ou le révèle. Le choix est mémorisé sur l'appareil.

- Sonnets : schéma des rimes, possibilités de chaque vers, numérotation, nombre total de poèmes. Sans les possibilités, l'outil devient un livre de 10 pages qu'on feuillette avec « Sonnet d'origine » (n° 0 à 9) ou `← →`.
- Lettres : compteurs, graphique, lettres absentes. Tout décoché : le texte seul, en grand.
- Classe (en lecture) : les mêmes que Sonnets.
- César : alphabets alignés, résultat (flouté quand il est masqué).

## Raccourcis clavier

- Partout : `F` plein écran.
- Classe, en écriture : `Entrée` / `↓` vers suivant, `↑` vers précédent. En lecture : comme Sonnets.
- Sonnets : `Espace` au hasard, `↑ ↓` choisir le vers, `← →` changer de variante, `0`–`9` taper le numéro chiffre par chiffre. Livre (possibilités masquées) : `Espace` / `→` page suivante, `←` précédente, `0`–`9` aller à la page. En mode « Composer vers par vers » : `0`–`9` ou clic pour choisir, `← →` parcourir, `Espace` garder ce vers, `↑` revenir, `Échap` quitter.
- César : `← →` changer le décalage, `Échap` fermer la liste des 26 décalages.

## Textes sous droits (Queneau, Perec)

Ils sont publiés **chiffrés** (`data/*.enc.json`, AES-GCM, clé dérivée du mot de passe par PBKDF2) ; les versions en clair `data/*.json` ne sont pas versionnées. Le mot de passe, saisi une fois (onglet Sonnets ou bouton « La Disparition » de Lettres), est mémorisé sur l'appareil.

- `data/queneau.json` : les 140 vers, `{ "titre", "vers": [[10 variantes] × 14] }`.
- `data/disparition.json` : incipit du chapitre 1 de *La Disparition*, `{ "titre", "texte" }` (copié depuis le PDF de séance).

```sh
python3 tools/scrape.py      # régénère data/queneau.json (avec les corrections listées dans le script)
node tools/encrypt.mjs       # chiffre tous les data/*.json avec le mot de passe (demandé au clavier)
```

Pour changer de mot de passe : relancer `node tools/encrypt.mjs`, puis commit + push. Les appareils qui avaient mémorisé l'ancien le redemanderont.

## Poèmes de la classe

Saisis dans l'onglet Classe, ils restent **dans le navigateur de l'appareil** (`localStorage`, rien n'est publié). Pour changer d'ordinateur ou sauvegarder : « Exporter » télécharge `poemes-classe-AAAA-MM-JJ.json`, « Importer » le recharge ailleurs. L'import accepte aussi le format du moteur `{ "titre", "vers": [[…n variantes…] × 14] }`.

Le lecteur (`js/reader.js`) est commun aux deux onglets : `js/sonnets.js` (Queneau, chiffré) et `js/classe.js` (éditeur + lecture) le montent depuis `<template id="tpl-reader">`.

## Développement et mise en ligne

```sh
python3 -m http.server 8000  # puis http://localhost:8000 (le déchiffrement exige localhost ou HTTPS)
git push                     # GitHub Pages redéploie en ~1 min
```

HTML/CSS/JS sans dépendance ni build. Polices : Google Fonts (Spectral, Atkinson Hyperlegible).
