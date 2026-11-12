// Moteur de lecture « à la Queneau », partagé par l'onglet Sonnets (Queneau) et l'onglet Classe.
// Un poème = un numéro à 14 chiffres, le chiffre n°i donne la variante (0 à n−1) du vers n°i.
// Sans les possibilités (bascule « œil »), l'outil devient un livre de n pages qu'on feuillette.
import { shown, onShow } from "./show.js";

export const RHYMES = "ABABABABCCDEED"; // schéma réel du livre de Queneau
export const STANZAS = [[0, 4], [4, 8], [8, 11], [11, 14]];

export const lastWord = (s) => {
  const k = s.trimEnd().search(/\S+$/);
  return k < 0 ? [s, ""] : [s.slice(0, k), s.slice(k)];
};

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * Monte un lecteur dans `root` (cloné depuis <template id="tpl-reader">).
 * view   : nom de la vue (pour les bascules « œil »)
 * hash   : préfixe du permalien, ex. "#sonnets/"
 * origin : libellé du menu des poèmes d'origine
 */
export function createReader({ root, view, hash, origin = "Sonnet d'origine" }) {
  root.replaceChildren(document.getElementById("tpl-reader").content.cloneNode(true));
  const $ = (k) => root.querySelector(`[data-el="${k}"]`);
  const book = () => !shown(view, "alts");

  let verses = null;        // 14 tableaux de n chaînes
  let n = 10;               // nombre de variantes par vers
  let digits = [];          // variante choisie pour chaque vers
  let active = 0;           // vers sélectionné
  let reading = -1;         // composition vers par vers : nombre de vers déjà choisis (-1 = inactif)
  let pendingCode = null;   // numéro reçu dans l'URL avant chargement

  $("origin-label").textContent = origin;
  $("rand-btn").addEventListener("click", randomPoem);
  $("read-btn").addEventListener("click", toggleReading);
  $("orig-select").addEventListener("change", (e) => {
    if (e.target.value === "") return;
    setAll(Number(e.target.value));
  });
  onShow(view, () => {
    if (!verses || root.hidden) return;
    if (book() && reading >= 0) toggleReading();
    else render(new Set());
  });
  buildPoem();
  buildCode();

  /* ---------- Chargement ---------- */

  // data : { vers: [[n variantes] × 14] } ; names : libellés facultatifs des n poèmes d'origine
  function load(data, names = []) {
    verses = data.vers;
    n = verses[0].length;
    reading = -1;
    active = Math.min(active, verses.length - 1);
    $("read-btn").setAttribute("aria-pressed", "false");

    const sel = $("orig-select");
    sel.replaceChildren(new Option("—", ""));
    for (let k = 0; k < n; k++) sel.add(new Option(names[k] ? `${k} · ${names[k]}` : `n° ${k}`, k));

    const total = BigInt(n) ** BigInt(verses.length);
    $("count").innerHTML =
      `${n}<sup>${verses.length}</sup> = <strong>${total.toLocaleString("fr-FR")}</strong> poème${total > 1n ? "s" : ""}`;

    const code = pendingCode?.length === verses.length ? pendingCode
      : digits.length === verses.length ? digits.join("") : "0".repeat(verses.length);
    pendingCode = null;
    digits = [...code].map(Number).map((d) => Math.min(d, n - 1));
    render(new Set(digits.keys()));
  }

  function setCode(code) {
    if (!/^\d+$/.test(code)) return;
    if (!verses) { pendingCode = code; return; }
    if (code.length === verses.length && code !== digits.join("")) {
      applyDigits([...code].map(Number).map((d) => Math.min(d, n - 1)));
    }
  }

  /* ---------- Construction du DOM ---------- */

  function buildPoem() {
    const poem = $("poem");
    for (const [a, b] of STANZAS) {
      const st = document.createElement("div");
      st.className = "stanza";
      for (let i = a; i < b; i++) {
        const v = document.createElement("div");
        v.className = "verse";
        v.dataset.i = i;
        v.style.setProperty("--rc", `var(--r${RHYMES.charCodeAt(i) - 64})`);
        v.innerHTML = `<span class="num">${i + 1}</span><span class="rime" title="Rime ${RHYMES[i]}">${RHYMES[i]}</span><span class="txt"></span>`;
        v.addEventListener("click", () => select(i));
        v.addEventListener("wheel", (e) => {
          if (book() || i !== active || reading >= verses.length) return;
          e.preventDefault();
          select(i);
          step(e.deltaY > 0 ? 1 : -1);
        }, { passive: false });
        st.append(v);
      }
      poem.append(st);
    }
  }

  function buildCode() {
    const code = $("code");
    for (const [a, b] of STANZAS) {
      const g = document.createElement("span");
      g.className = "grp";
      for (let i = a; i < b; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.i = i;
        btn.title = `Vers ${i + 1} : variante suivante`;
        btn.addEventListener("click", () => {
          if (book() || reading >= 0) return;
          if (active === i) step(1);
          else select(i);
        });
        g.append(btn);
      }
      code.append(g);
    }
  }

  /* ---------- État ---------- */

  function applyDigits(next) {
    const changed = new Set(next.map((d, i) => (d !== digits[i] ? i : -1)).filter((i) => i >= 0));
    digits = next;
    render(changed);
  }

  function setAll(k) { applyDigits(digits.map(() => k)); }

  function turnPage(delta) { setAll((digits[0] + delta + n) % n); }

  function randomPoem() {
    const r = crypto.getRandomValues(new Uint32Array(verses.length));
    applyDigits([...r].map((x) => x % n));
  }

  function step(delta) {
    const next = [...digits];
    next[active] = (next[active] + delta + n) % n;
    applyDigits(next);
  }

  function select(i) {
    if (book()) return;
    if (reading >= 0) {
      if (i > reading) return;
      reading = i; // on revient choisir ce vers ; les suivants se recachent
    }
    active = i;
    render(new Set());
  }

  function toggleReading() {
    reading = reading >= 0 ? -1 : 0;
    if (reading === 0) active = 0;
    $("read-btn").setAttribute("aria-pressed", reading >= 0);
    render(new Set());
  }

  // Composition : valider le vers en cours (+1) ou revenir au précédent (-1)
  function reveal(delta) {
    reading = Math.max(0, Math.min(verses.length, reading + delta));
    active = Math.min(reading, verses.length - 1);
    render(new Set());
  }

  function choose(d) {
    const next = [...digits];
    next[active] = d;
    applyDigits(next);
    if (reading >= 0) reveal(1);
  }

  /* ---------- Affichage ---------- */

  function render(changed) {
    const poem = $("poem");
    const done = reading >= verses.length;       // composition terminée
    const selecting = !book() && !done;          // un vers est en cours de choix
    poem.classList.toggle("reading", reading >= 0);
    poem.querySelectorAll(".verse").forEach((v) => {
      const i = Number(v.dataset.i);
      const txt = v.querySelector(".txt");
      txt.textContent = verses[i][digits[i]];
      if (changed.has(i)) { txt.classList.remove("flip"); void txt.offsetWidth; txt.classList.add("flip"); }
      v.classList.toggle("active", selecting && i === active);
      v.classList.toggle("hidden-verse", reading >= 0 && i > reading);
    });

    $("code").querySelectorAll("button").forEach((b) => {
      const i = Number(b.dataset.i);
      b.textContent = reading >= 0 && i > reading ? "·" : digits[i];
      b.classList.toggle("active", selecting && i === active);
    });

    // Panneau des alternatives du vers actif
    $("rand-btn").hidden = reading >= 0;
    const list = $("alts-list");
    list.hidden = done;
    $("progress").hidden = !done;
    if (done) {
      $("alts-title").textContent = "Poème composé !";
      $("alts-hint").textContent = "↑ : revenir sur le dernier vers · Échap : terminer";
      list.replaceChildren();
      $("progress").innerHTML = `${verses.length}<span> / ${verses.length}</span>`;
    } else {
      const rimes = shown(view, "rimes");
      if (reading >= 0) {
        $("alts-title").textContent = `Vers ${active + 1} / ${verses.length} : choisis parmi les ${n}`;
        $("alts-hint").textContent = "Clic ou chiffre : choisir · ← → : parcourir · Espace : garder celui-ci · ↑ : revenir";
      } else {
        $("alts-title").textContent = `Vers ${active + 1} : les ${n} possibilités`;
        $("alts-hint").textContent = `${rimes ? "Même rime, même place" : "Même place"} : chaque vers s'emboîte avec tous les autres. ← → pour changer, ↑ ↓ pour choisir un autre vers.`;
      }
      list.style.setProperty("--rc", `var(--r${RHYMES.charCodeAt(active) - 64})`);
      list.replaceChildren(...verses[active].map((s, d) => {
        const li = document.createElement("li");
        const [head, tail] = lastWord(s);
        li.innerHTML = `<span class="d">${d}</span><span class="t">${esc(head)}<b>${esc(tail)}</b></span>`;
        li.classList.toggle("current", d === digits[active]);
        li.addEventListener("click", () => choose(d));
        return li;
      }));
    }

    const uniform = digits.every((d) => d === digits[0]);
    $("orig-select").value = uniform ? String(digits[0]) : "";

    const code = `${hash}${digits.join("")}`;
    if (location.hash !== code) history.replaceState(null, "", code);
  }

  function onKey(e) {
    if (!verses) return;
    const digit = /^\d$/.test(e.key) && Number(e.key) < n ? Number(e.key) : null;
    if (book()) {
      // Livre sans languettes : on tourne des pages entières
      if (e.key === " " || e.key === "ArrowRight" || e.key === "ArrowDown") turnPage(1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") turnPage(-1);
      else if (digit !== null) setAll(digit);
      else return;
    } else if (reading >= 0) {
      const done = reading >= verses.length;
      if (e.key === "Escape") toggleReading();
      else if (e.key === "ArrowUp" || e.key === "Backspace") reveal(-1);
      else if (done) return;
      else if (e.key === " " || e.key === "Enter" || e.key === "ArrowDown") reveal(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (digit !== null) choose(digit);
      else return;
    } else if (e.key === " ") randomPoem();
    else if (e.key === "ArrowUp") select((active + verses.length - 1) % verses.length);
    else if (e.key === "ArrowDown") select((active + 1) % verses.length);
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (digit !== null) {
      // Taper un numéro chiffre par chiffre : on remplit puis on passe au vers suivant
      const next = [...digits];
      next[active] = digit;
      applyDigits(next);
      select((active + 1) % verses.length);
    } else return;
    e.preventDefault();
  }

  return { load, setCode, onKey, el: $, loaded: () => verses !== null };
}
