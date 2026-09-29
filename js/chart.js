// Diagramme en barres SVG, une colonne par lettre, partagé par Lettres et César.
export const fmt = (x, d = 1) => x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

function niceStep(max, target = 5) {
  const raw = max / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw);
}

// cols : lettres en abscisse ; value(c) : hauteur de la barre ; ref(c) : repère « français moyen » ou null ;
// pct : valeurs en % ; mark(c) : classe de la colonne ("absent", "hot" ou "") ; tip(c) : infobulle HTML ou null ;
// empty : message affiché à la place du graphique vide ; label : description pour les lecteurs d'écran.
export function barChart(box, { cols, value, ref = null, pct = false, mark = () => "", tip = null, empty = "", label = "" }) {
  const W = box.clientWidth, H = box.clientHeight;
  if (!W || !H) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", label);

  const padL = 44, padR = 4, padT = 20, padB = 34;
  const iw = W - padL - padR, ih = H - padT - padB;
  const vals = cols.map(value);
  const refs = ref ? cols.map(ref).filter((v) => v != null) : [];
  const vmax = Math.max(...vals, ...refs, pct ? 5 : 1);
  const step = pct ? niceStep(vmax) : Math.max(1, niceStep(vmax));
  const top = Math.ceil(vmax / step) * step;
  const y = (v) => padT + ih - (v / top) * ih;
  const bw = iw / cols.length;
  const barW = Math.max(3, Math.min(bw - 2, bw * 0.72));

  let s = `<g class="grid">`;
  for (let v = 0; v <= top + 1e-9; v += step) {
    s += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/>`;
    s += `<text class="axis-t" x="${padL - 8}" y="${y(v) + 4}" text-anchor="end">${pct ? fmt(v, step < 1 ? 1 : 0) + " %" : v}</text>`;
  }
  s += `</g>`;

  cols.forEach((c, i) => {
    const v = vals[i];
    const cls = mark(c);
    const cx = padL + bw * i + bw / 2;
    const x0 = cx - barW / 2;
    const h = y(0) - y(v);
    s += `<g class="col ${cls}" data-c="${c}">`;
    if (h > 0) {
      const r = Math.min(4, h, barW / 2);
      s += `<path class="bar" d="M${x0},${y(0)} V${y(v) + r} Q${x0},${y(v)} ${x0 + r},${y(v)} H${x0 + barW - r} Q${x0 + barW},${y(v)} ${x0 + barW},${y(v) + r} V${y(0)} Z"/>`;
    }
    const rv = ref ? ref(c) : null;
    if (rv != null) s += `<line class="ref" x1="${cx - barW / 2 - 2}" x2="${cx + barW / 2 + 2}" y1="${y(rv)}" y2="${y(rv)}"/>`;
    // Valeur au-dessus de la barre, et au-dessus du repère « français » s'il est plus haut
    if (h > 0 && bw >= 18) s += `<text class="val" x="${cx}" y="${Math.min(y(v), rv != null ? y(rv) - 2 : Infinity) - 5}">${pct ? fmt(v) : v}</text>`;
    s += `<text class="lbl" x="${cx}" y="${H - 8}">${c}</text>`;
    if (cls === "absent") s += `<line class="strike" x1="${cx - 8}" x2="${cx + 8}" y1="${H - 14}" y2="${H - 14}"/>`;
    s += `<rect class="hit" x="${padL + bw * i}" y="${padT}" width="${bw}" height="${H - padT}"/></g>`;
  });

  if (empty) s += `<text class="empty" x="${padL + iw / 2}" y="${padT + ih / 2}">${empty}</text>`;

  svg.innerHTML = s;
  if (tip) {
    const el = document.getElementById("tip");
    svg.querySelectorAll(".col").forEach((g) => {
      g.addEventListener("pointermove", (e) => {
        const html = tip(g.dataset.c);
        if (!html) return;
        el.innerHTML = html;
        el.hidden = false;
        el.style.left = `${Math.min(e.clientX + 14, innerWidth - el.offsetWidth - 8)}px`;
        el.style.top = `${e.clientY - 48}px`;
      });
      g.addEventListener("pointerleave", () => (el.hidden = true));
    });
  }
  box.replaceChildren(svg);
}
