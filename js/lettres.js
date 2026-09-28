// Compteur de lettres : effectifs, fréquences, comparaison au français, lettres absentes.
const $ = (id) => document.getElementById(id);
const ALPHA = "abcdefghijklmnopqrstuvwxyz";
const ACCENTED = "àâäçéèêëîïôöùûüÿœæ";

// Fréquences moyennes des lettres en français (%, accents regroupés).
// Source : corpus Wikipédia « Fréquence d'apparition des lettres en français ».
const FR = {
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
  lipo: `Un soir, au fond d'un grand parc, un garçon distrait fouillait partout : où a fui son chat ? Sous un banc, dans un buisson, au bord du lac, jusqu'au pont. Nul bruit, pas un poil. Il allait partir, à bout, quand soudain, un miaou ! Son chat, blotti sous un pin, dormait sans aucun souci du froid. Il l'a pris dans son blouson, ravi, puis tous trois, garçon, chat, blouson, sont partis au chaud.`,
};

let mode = "count";
const fmt = (x, d = 1) => x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function init() {
  $("l-text").addEventListener("input", update);
  $("l-fold").addEventListener("change", update);
  $("l-ref").addEventListener("change", update);
  $("l-clear").addEventListener("click", () => { $("l-text").value = ""; update(); $("l-text").focus(); });
  document.querySelectorAll("[data-sample]").forEach((b) =>
    b.addEventListener("click", () => { $("l-text").value = SAMPLES[b.dataset.sample]; update(); }));
  document.querySelectorAll("#view-lettres [data-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      document.querySelectorAll("#view-lettres [data-mode]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      update();
    }));
  new ResizeObserver(() => update()).observe($("l-chart"));
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
  drawChart(cols, value, showRef && letters ? refValue : null, counts, letters);
}

function niceStep(max, target = 5) {
  const raw = max / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw);
}

function drawChart(cols, value, refValue, counts, letters) {
  const box = $("l-chart");
  const W = box.clientWidth, H = box.clientHeight;
  if (!W || !H) return;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", mode === "freq" ? "Fréquence de chaque lettre, en pourcentage" : "Nombre d'apparitions de chaque lettre");

  const padL = 44, padR = 4, padT = 20, padB = 34;
  const iw = W - padL - padR, ih = H - padT - padB;
  const vals = cols.map(value);
  const refs = refValue ? cols.map(refValue).filter((v) => v != null) : [];
  const vmax = Math.max(...vals, ...refs, mode === "freq" ? 5 : 1);
  const step = mode === "count" ? Math.max(1, niceStep(vmax)) : niceStep(vmax);
  const top = Math.ceil(vmax / step) * step;
  const y = (v) => padT + ih - (v / top) * ih;
  const bw = iw / cols.length;
  const barW = Math.max(3, Math.min(bw - 2, bw * 0.72));

  let s = `<g class="grid">`;
  for (let v = 0; v <= top + 1e-9; v += step) {
    s += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/>`;
    s += `<text class="axis-t" x="${padL - 8}" y="${y(v) + 4}" text-anchor="end">${mode === "freq" ? fmt(v, step < 1 ? 1 : 0) + " %" : v}</text>`;
  }
  s += `</g>`;

  cols.forEach((c, i) => {
    const v = vals[i];
    const cx = padL + bw * i + bw / 2;
    const x0 = cx - barW / 2;
    const h = y(0) - y(v);
    s += `<g class="col" data-c="${c}">`;
    if (h > 0) {
      const r = Math.min(4, h, barW / 2);
      s += `<path class="bar" d="M${x0},${y(0)} V${y(v) + r} Q${x0},${y(v)} ${x0 + r},${y(v)} H${x0 + barW - r} Q${x0 + barW},${y(v)} ${x0 + barW},${y(v) + r} V${y(0)} Z"/>`;
    }
    const rv = refValue ? refValue(c) : null;
    if (rv != null) s += `<line class="ref" x1="${cx - barW / 2 - 2}" x2="${cx + barW / 2 + 2}" y1="${y(rv)}" y2="${y(rv)}"/>`;
    // Valeur au-dessus de la barre, et au-dessus du repère « français » s'il est plus haut
    if (h > 0 && bw >= 18) s += `<text class="val" x="${cx}" y="${Math.min(y(v), rv != null ? y(rv) - 2 : Infinity) - 5}">${mode === "freq" ? fmt(v) : v}</text>`;
    const isAbsent = letters > 0 && !counts[c];
    s += `<text class="lbl${isAbsent ? " absent" : ""}" x="${cx}" y="${H - 8}">${c}</text>`;
    if (isAbsent) s += `<line class="strike" x1="${cx - 8}" x2="${cx + 8}" y1="${H - 14}" y2="${H - 14}"/>`;
    s += `<rect class="hit" x="${padL + bw * i}" y="${padT}" width="${bw}" height="${H - padT}"/></g>`;
  });

  if (!letters) s += `<text class="empty" x="${padL + iw / 2}" y="${padT + ih / 2}">Colle un texte à gauche pour voir ses lettres.</text>`;

  svg.innerHTML = s;
  const tip = $("tip");
  svg.querySelectorAll(".col").forEach((g) => {
    const c = g.dataset.c;
    g.addEventListener("pointermove", (e) => {
      if (!letters) return;
      const k = counts[c] || 0;
      let html = `<strong>${c.toUpperCase()}</strong> : ${k} fois, soit ${fmt((100 * k) / letters)} % des lettres`;
      if (c in FR) html += `<br>français moyen : ${fmt(FR[c])} %`;
      tip.innerHTML = html;
      tip.hidden = false;
      const tw = tip.offsetWidth;
      tip.style.left = `${Math.min(e.clientX + 14, innerWidth - tw - 8)}px`;
      tip.style.top = `${e.clientY - 48}px`;
    });
    g.addEventListener("pointerleave", () => (tip.hidden = true));
  });
  box.replaceChildren(svg);
}
