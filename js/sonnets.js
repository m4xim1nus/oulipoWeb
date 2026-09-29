// Cent mille milliards de poèmes : un poème = un numéro à 14 chiffres,
// le chiffre n°i donne la variante (0–9) du vers n°i.
// Sans les possibilités (menu Afficher), l'outil devient un livre de n pages qu'on feuillette.
import { decryptJson, savedPass as store } from "./crypto.js";
import { shown, onShow } from "./show.js";

const DATA_URL = "data/queneau.enc.json";
const RHYMES = "ABABABABCCDEED"; // schéma réel du livre
const STANZAS = [[0, 4], [4, 8], [8, 11], [11, 14]];
const $ = (id) => document.getElementById(id);
const book = () => !shown("sonnets", "alts");

let verses = null;        // 14 tableaux de n chaînes
let n = 10;               // nombre de variantes par vers
let digits = [];          // variante choisie pour chaque vers
let active = 0;           // vers sélectionné
let reading = -1;         // composition vers par vers : nombre de vers déjà choisis (-1 = inactif)
let pendingCode = null;   // numéro reçu dans l'URL avant déverrouillage

export function init() {
  $("lock").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pass = $("lock-pass").value;
    $("lock-error").textContent = "";
    const ok = await unlock(pass);
    if (ok) {
      if ($("lock-remember").checked) store.set(pass);
    } else {
      $("lock-error").textContent = "Mot de passe incorrect. Vérifie les majuscules et la ponctuation.";
      $("lock-pass").select();
    }
  });
  $("rand-btn").addEventListener("click", randomPoem);
  $("read-btn").addEventListener("click", toggleReading);
  $("orig-select").addEventListener("change", (e) => {
    if (e.target.value === "") return;
    setAll(Number(e.target.value));
  });
  onShow("sonnets", () => {
    if (!verses) return;
    if (book() && reading >= 0) toggleReading();
    else render(new Set());
  });
}

export async function show() {
  if (verses) return;
  const saved = store.get();
  if (saved && (await unlock(saved))) return;
  if (saved) store.del();
  $("lock").hidden = false;
  $("lock-pass").focus();
}

export function onRoute(rest) {
  if (!/^\d+$/.test(rest)) return;
  if (!verses) { pendingCode = rest; return; }
  if (rest.length === verses.length && rest !== digits.join("")) {
    const next = [...rest].map(Number).map((d) => Math.min(d, n - 1));
    applyDigits(next);
  }
}

async function unlock(pass) {
  try {
    const data = await decryptJson(DATA_URL, pass);
    start(data);
    return true;
  } catch {
    return false;
  }
}

function start(data) {
  verses = data.vers;
  n = verses[0].length;
  $("lock").hidden = true;
  $("sonnets").hidden = false;

  const sel = $("orig-select");
  for (let k = 0; k < n; k++) sel.add(new Option(`n° ${k}`, k));

  const total = BigInt(n) ** BigInt(verses.length);
  $("count").innerHTML =
    `${n}<sup>${verses.length}</sup> = <strong>${total.toLocaleString("fr-FR")}</strong> poèmes`;

  buildPoem();
  buildCode();
  const code = pendingCode && pendingCode.length === verses.length ? pendingCode : "0".repeat(verses.length);
  digits = [...code].map(Number).map((d) => Math.min(d, n - 1));
  render(new Set(digits.keys()));
}

/* ---------- Construction du DOM ---------- */

function buildPoem() {
  const poem = $("poem");
  poem.replaceChildren();
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
  code.replaceChildren();
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

function lastWord(s) {
  const k = s.trimEnd().search(/\S+$/);
  return [s.slice(0, k), s.slice(k)];
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

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
    const rimes = shown("sonnets", "rimes");
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

  const code = digits.join("");
  if (location.hash !== `#sonnets/${code}`) history.replaceState(null, "", `#sonnets/${code}`);
}

export function onKey(e) {
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
