import { decryptWithPrompt } from "./crypto.js";
import { barChart, fmt } from "./chart.js";
import { shown, onShow } from "./show.js";

// Compteur de lettres : effectifs, fréquences, comparaison au français, lettres absentes.
const $ = (id) => document.getElementById(id);
const ALPHA = "abcdefghijklmnopqrstuvwxyz";
const ACCENTED = "àâäçéèêëîïôöùûüÿœæ";

// Fréquences moyennes des lettres en français (%, accents regroupés).
// Source : corpus Wikipédia « Fréquence d'apparition des lettres en français ».
export const FR = {
  a: 7.636, b: 0.901, c: 3.260, d: 3.669, e: 14.715, f: 1.066, g: 0.866, h: 0.737, i: 7.529,
  j: 0.613, k: 0.074, l: 5.456, m: 2.968, n: 7.095, o: 5.796, p: 2.521, q: 1.362, r: 6.693,
  s: 7.948, t: 7.244, u: 6.311, v: 1.838, w: 0.049, x: 0.427, y: 0.128, z: 0.326,
};

const SAMPLES = {
  bellay: `Heureux qui, comme Ulysse, a fait un beau voyage,
Ou comme cestuy-là qui conquit la toison,
Et puis est retourné, plein d'usage et raison,
Vivre entre ses parents le reste de son âge !

Quand reverrai-je, hélas, de mon petit village
Fumer la cheminée, et en quelle saison
Reverrai-je le clos de ma pauvre maison,
Qui m'est une province, et beaucoup davantage ?

Plus me plaît le séjour qu'ont bâti mes aïeux,
Que des palais romains le front audacieux,
Plus que le marbre dur me plaît l'ardoise fine,

Plus mon Loir gaulois que le Tibre latin,
Plus mon petit Liré que le mont Palatin,
Et plus que l'air marin la douceur angevine.

Joachim du Bellay, Les Regrets (1558)`,
  // Extrait de l'article « Minecraft », Wikipédia en français, licence CC BY-SA 4.0 (consulté en septembre 2026)
  wiki: `Minecraft est un jeu vidéo de type aventure « bac à sable » développé par le Suédois Markus Persson, alias Notch, puis par la société Mojang Studios. Il s'agit d'un univers composé de voxels et généré de façon procédurale, qui intègre un système d'artisanat axé sur la collecte puis la transformation de ressources naturelles (minéralogiques, fossiles, animales et végétales).

À l'origine conçu comme un jeu sur navigateur, Minecraft est finalement développé pour ordinateurs (Windows, Mac et Linux) à l'aide de la technique Java, puis pour téléphone mobile dans sa version Minecraft Bedrock Edition (Android, iOS et Windows Phone, version qui sera plus tard étendue à d'autres plate-formes).

Wikipédia, article « Minecraft » (CC BY-SA)`,
  // Extraits de l'article « Aya Nakamura », Wikipédia en français, licence CC BY-SA 4.0 (consulté en septembre 2026)
  aya: `Aya Danioko, dite Aya Nakamura, est une chanteuse et rappeuse malienne naturalisée française, née le 10 mai 1995 à Bamako (Mali). Sa famille arrive en France quelques mois après sa naissance et emménage à Aulnay-sous-Bois alors qu'elle est encore enfant.

Elle s'impose à partir de 2018 avec l'album Nakamura et le single Djadja, certifié disque de diamant, qui la propulse au rang d'artiste francophone la plus écoutée dans le monde. L'album Aya utilise toujours une langue française « élastique et inventive », enrichie d'argot et d'expressions personnelles.

Le 26 juillet 2024, elle chante à la cérémonie d'ouverture des Jeux olympiques d'été de Paris, réalisant le meilleur pic d'audience de l'histoire de la télévision française avec 31,4 millions de téléspectateurs. En mai 2026, elle devient la première artiste féminine francophone à se produire trois soirs consécutifs au Stade de France.

Wikipédia, article « Aya Nakamura » (CC BY-SA)`,
};

let mode = "count";

export function init() {
  $("l-text").addEventListener("input", update);
  $("l-fold").addEventListener("change", update);
  $("l-ref").addEventListener("change", update);
  $("l-clear").addEventListener("click", () => { $("l-text").value = ""; update(); $("l-text").focus(); });
  document.querySelectorAll("[data-sample]").forEach((b) =>
    b.addEventListener("click", () => { $("l-text").value = SAMPLES[b.dataset.sample]; update(); }));
  // Incipit de La Disparition : sous droits, publié chiffré
  $("l-perec").addEventListener("click", async () => {
    const data = await decryptWithPrompt("data/disparition.enc.json");
    if (data) { $("l-text").value = data.texte; update(); }
  });
  document.querySelectorAll("#view-lettres [data-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      document.querySelectorAll("#view-lettres [data-mode]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      update();
    }));
  new ResizeObserver(() => update()).observe($("l-chart"));
  onShow("lettres", update);
}

export function show() { update(); }

function analyse(text, fold) {
  let t = text.toLowerCase();
  if (fold) t = t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae");
  const counts = {};
  for (const ch of t) if (ALPHA.includes(ch) || ACCENTED.includes(ch)) counts[ch] = (counts[ch] || 0) + 1;
  return counts;
}

function update() {
  const text = $("l-text").value;
  const fold = $("l-fold").checked;
  const showRef = $("l-ref").checked;
  const counts = analyse(text, fold);
  const letters = Object.values(counts).reduce((a, b) => a + b, 0);

  $("s-chars").textContent = [...text.replace(/\n/g, "")].length.toLocaleString("fr-FR");
  $("s-letters").textContent = letters.toLocaleString("fr-FR");
  $("s-distinct").textContent = Object.keys(counts).length;
  $("l-legend").hidden = !showRef;

  const absent = [...ALPHA].filter((c) => !counts[c]);
  const al = $("l-absent");
  al.classList.toggle("none", letters === 0 || absent.length === 0);
  al.textContent = letters === 0 ? "—" : absent.length ? absent.join(" ") : "aucune : les 26 lettres sont là";

  // Colonnes : a→z, puis les lettres accentuées présentes si on ne les regroupe pas
  const cols = [...ALPHA, ...[...ACCENTED].filter((c) => counts[c])];
  const value = (c) => (mode === "freq" ? (letters ? (100 * (counts[c] || 0)) / letters : 0) : counts[c] || 0);
  const refValue = (c) => (c in FR ? (mode === "freq" ? FR[c] : (FR[c] * letters) / 100) : null);
  // Les lettres absentes ne sont barrées que si on a choisi de les dévoiler
  const showAbsent = shown("lettres", "absent");
  barChart($("l-chart"), {
    cols, value, pct: mode === "freq",
    ref: showRef && letters ? refValue : null,
    mark: (c) => (showAbsent && letters > 0 && !counts[c] ? "absent" : ""),
    empty: letters ? "" : "Colle un texte à gauche pour voir ses lettres.",
    label: mode === "freq" ? "Fréquence de chaque lettre, en pourcentage" : "Nombre d'apparitions de chaque lettre",
    tip: (c) => {
      if (!letters) return null;
      const k = counts[c] || 0;
      let html = `<strong>${c.toUpperCase()}</strong> : ${k} fois, soit ${fmt((100 * k) / letters)} % des lettres`;
      if (c in FR) html += `<br>français moyen : ${fmt(FR[c])} %`;
      return html;
    },
  });
}
