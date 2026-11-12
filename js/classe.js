// Poèmes de la classe : 10 groupes écrivent chacun un sonnet de 14 vers « à la Queneau ».
// Écrire : on saisit les poèmes (mémorisés sur l'appareil, export / import en fichier JSON).
// Lire : les poèmes complets deviennent un livre combinatoire, avec le même moteur que Queneau.
import { createReader, RHYMES, STANZAS, lastWord } from "./reader.js";

const GROUPS = 10;
const LINES = 14;
const STORE_KEY = "classe-poemes";
const $ = (id) => document.getElementById(id);

let groups = [];          // [{ nom, vers: [14 chaînes] }] × 10, chargés dans init()
let current = 0;          // groupe affiché dans l'éditeur
let line = 0;             // vers sélectionné (panneau « dans les autres poèmes »)
let mode = "edit";
let dirty = true;         // le lecteur doit être rechargé
let reader = null;

/* ---------- Données ---------- */

const empty = () => ({ nom: "", vers: Array(LINES).fill("") });
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const isComplete = (g) => g.vers.every((v) => v.trim() !== "");
const filled = (g) => g.vers.filter((v) => v.trim() !== "").length;

// Accepte le format de l'éditeur { groupes: [{ nom, vers }] } ou celui du moteur { vers: [[n] × 14] }
function normalize(data) {
  let list = [];
  if (Array.isArray(data?.groupes)) {
    list = data.groupes.map((g) => ({ nom: clean(g?.nom), vers: Array.isArray(g?.vers) ? g.vers : [] }));
  } else if (Array.isArray(data?.vers) && data.vers.length === LINES) {
    const n = Math.max(...data.vers.map((v) => (Array.isArray(v) ? v.length : 0)));
    list = Array.from({ length: n }, (_, k) => ({ nom: "", vers: data.vers.map((v) => v?.[k]) }));
  } else {
    throw new Error("format");
  }
  return Array.from({ length: GROUPS }, (_, k) => {
    const g = list[k] || empty();
    return { nom: g.nom, vers: Array.from({ length: LINES }, (_, i) => clean(g.vers[i])) };
  });
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {}
  return Array.from({ length: GROUPS }, empty);
}

function save() {
  dirty = true;
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ groupes: groups })); } catch {}
}

/* ---------- Initialisation ---------- */

export function init() {
  reader = createReader({ root: $("k-reader"), view: "classe", hash: "#classe/lire/", origin: "Poème du groupe" });
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "btn";
  edit.textContent = "Modifier les poèmes";
  edit.addEventListener("click", () => (location.hash = "#classe"));
  reader.el("combo-actions").append(edit);

  groups = load();
  buildTabs();
  buildLines();

  $("k-name").addEventListener("input", (e) => {
    groups[current].nom = e.target.value;
    save();
    renderTabs();
  });
  $("k-name").addEventListener("change", (e) => {
    groups[current].nom = clean(e.target.value);
    e.target.value = groups[current].nom;
    save();
  });
  $("k-read").addEventListener("click", () => (location.hash = "#classe/lire"));
  $("k-export").addEventListener("click", exportFile);
  $("k-import").addEventListener("click", () => $("k-file").click());
  $("k-file").addEventListener("change", importFile);
  $("k-clear").addEventListener("click", () => {
    if (!confirm("Effacer les 10 poèmes de cet appareil ? Pense à exporter d'abord si tu veux les garder.")) return;
    groups = Array.from({ length: GROUPS }, empty);
    save();
    showGroup(0);
  });

  showGroup(0);
}

export function onRoute(rest) {
  const [m, code = ""] = rest.split("/");
  if (m === "lire" && enterRead()) {
    if (code) reader.setCode(code);
    return;
  }
  setMode("edit");
  if (location.hash !== "#classe") history.replaceState(null, "", "#classe");
}

export function onKey(e) {
  if (mode === "read") reader.onKey(e);
}

function setMode(m) {
  mode = m;
  $("k-edit").hidden = m !== "edit";
  $("k-reader").hidden = m !== "read";
  // Les bascules « œil » ne concernent que la lecture
  document.querySelector('#show-toggles [data-for="classe"]').hidden = m !== "read";
}

/* ---------- Éditeur ---------- */

function buildTabs() {
  const nav = $("k-groups");
  for (let k = 0; k < GROUPS; k++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "k-tab";
    b.innerHTML = `<span class="k-d">${k}</span><span class="k-n"></span><span class="k-p"></span>`;
    b.addEventListener("click", () => showGroup(k));
    nav.append(b);
  }
}

function buildLines() {
  const box = $("k-lines");
  for (const [a, b] of STANZAS) {
    const st = document.createElement("div");
    st.className = "k-stanza";
    for (let i = a; i < b; i++) {
      const row = document.createElement("label");
      row.className = "k-line";
      row.style.setProperty("--rc", `var(--r${RHYMES.charCodeAt(i) - 64})`);
      row.innerHTML = `<span class="num">${i + 1}</span><span class="rime" title="Rime ${RHYMES[i]}">${RHYMES[i]}</span>`;
      const input = document.createElement("input");
      input.type = "text";
      input.dataset.i = i;
      input.spellcheck = true;
      input.lang = "fr";
      input.setAttribute("aria-label", `Vers ${i + 1}`);
      input.addEventListener("input", () => {
        groups[current].vers[i] = input.value;
        save();
        renderTabs();
        renderStatus();
        renderOthers();
      });
      input.addEventListener("change", () => {
        input.value = groups[current].vers[i] = clean(input.value);
        save();
        renderOthers();
      });
      input.addEventListener("focus", () => { line = i; renderOthers(); });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === "ArrowDown") focusLine(i + 1);
        else if (e.key === "ArrowUp") focusLine(i - 1);
        else return;
        e.preventDefault();
      });
      input.addEventListener("paste", (e) => onPaste(e, i));
      row.append(input);
      st.append(row);
    }
    box.append(st);
  }
}

const inputs = () => $("k-lines").querySelectorAll("input");

function focusLine(i) {
  if (i < 0 || i >= LINES) return;
  const el = inputs()[i];
  el.focus();
  el.select();
}

// Coller un poème entier (ou plusieurs vers) : une ligne par vers, les lignes vides sont ignorées
function onPaste(e, i) {
  const text = e.clipboardData?.getData("text") ?? "";
  if (!/\n/.test(text.trim())) return;
  e.preventDefault();
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  const start = lines.length >= LINES ? 0 : i; // un sonnet complet remplit tout depuis le vers 1
  const kept = lines.slice(0, LINES - start);
  kept.forEach((v, k) => (groups[current].vers[start + k] = v));
  save();
  showGroup(current, Math.min(start + kept.length, LINES - 1));
  const lost = lines.length - kept.length;
  flash(lost > 0
    ? `${kept.length} vers collés, ${lost} ligne${lost > 1 ? "s" : ""} en trop ignorée${lost > 1 ? "s" : ""}.`
    : `${kept.length} vers collés.`);
}

function showGroup(k, focus = null) {
  current = k;
  const g = groups[k];
  $("k-num").textContent = k;
  $("k-name").value = g.nom;
  inputs().forEach((el, i) => (el.value = g.vers[i]));
  renderTabs();
  renderStatus();
  renderOthers();
  if (focus !== null) focusLine(focus);
}

function renderTabs() {
  $("k-groups").querySelectorAll(".k-tab").forEach((b, k) => {
    const g = groups[k];
    const f = filled(g);
    b.setAttribute("aria-pressed", k === current);
    b.classList.toggle("complete", f === LINES);
    b.querySelector(".k-n").textContent = g.nom.trim() || `Groupe ${k}`;
    b.querySelector(".k-p").textContent = f === LINES ? "✓" : `${f}/${LINES}`;
    b.title = `Groupe ${k}${g.nom.trim() ? ` : ${g.nom.trim()}` : ""} — ${f} vers sur ${LINES}`;
  });
}

// Le vers sélectionné dans les 10 poèmes : pour vérifier rimes et raccords d'un coup d'œil
function renderOthers() {
  $("k-side-title").textContent = `Vers ${line + 1} dans les ${GROUPS} poèmes`;
  const list = $("k-others");
  list.style.setProperty("--rc", `var(--r${RHYMES.charCodeAt(line) - 64})`);
  list.replaceChildren(...groups.map((g, k) => {
    const li = document.createElement("li");
    li.classList.toggle("current", k === current);
    const d = document.createElement("span");
    d.className = "d";
    d.textContent = k;
    const t = document.createElement("span");
    t.className = "t";
    const v = g.vers[line].trim();
    if (v) {
      const [head, tail] = lastWord(v);
      const b = document.createElement("b");
      b.textContent = tail;
      t.append(head, b);
    } else {
      t.textContent = "—";
      li.classList.add("blank");
    }
    li.append(d, t);
    li.title = `Ouvrir le poème du groupe ${k}`;
    li.addEventListener("click", () => showGroup(k, line));
    return li;
  }));
}

function renderStatus() {
  const done = groups.filter(isComplete).length;
  const btn = $("k-read");
  btn.disabled = done < 2;
  btn.title = done < 2 ? "Il faut au moins 2 poèmes complets" : "";
  let s = `<strong>${done}</strong> poème${done > 1 ? "s" : ""} complet${done > 1 ? "s" : ""} sur ${GROUPS}`;
  if (done >= 2) {
    const total = BigInt(done) ** BigInt(LINES);
    s += ` → ${done}<sup>${LINES}</sup> = <strong>${total.toLocaleString("fr-FR")}</strong> poèmes`;
    if (done < GROUPS) s += ` <span class="k-muted">(lecture avec les poèmes complets seulement)</span>`;
  }
  $("k-status").innerHTML = s;
}

let flashTimer = 0;
function flash(msg) {
  const el = $("k-flash");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => (el.hidden = true), 4000);
}

/* ---------- Fichiers ---------- */

function exportFile() {
  const data = { titre: "Poèmes de la classe", groupes: groups.map((g) => ({ nom: clean(g.nom), vers: g.vers.map(clean) })) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `poemes-classe-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importFile(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  let next;
  try {
    next = normalize(JSON.parse(await file.text()));
  } catch {
    alert("Fichier illisible : il faut un fichier .json exporté depuis cet onglet.");
    return;
  }
  const hasData = groups.some((g) => filled(g) > 0 || g.nom.trim());
  if (hasData && !confirm("Remplacer les poèmes déjà saisis sur cet appareil par ceux du fichier ?")) return;
  groups = next;
  save();
  showGroup(0);
  flash(`Importé : ${groups.filter(isComplete).length} poème(s) complet(s).`);
}

/* ---------- Lecture ---------- */

function enterRead() {
  const complete = groups.map((g, k) => ({ ...g, k })).filter(isComplete);
  if (complete.length < 2) {
    flash("Il faut au moins 2 poèmes complets pour les lire.");
    return false;
  }
  if (dirty || !reader.loaded()) {
    const remapped = complete.length < GROUPS;
    const names = complete.map((g) => clean(g.nom) || (remapped ? `groupe ${g.k}` : ""));
    const vers = Array.from({ length: LINES }, (_, i) => complete.map((g) => clean(g.vers[i])));
    setMode("read"); // le lecteur doit être visible avant le chargement
    reader.load({ vers }, names);
    dirty = false;
  }
  setMode("read");
  return true;
}
