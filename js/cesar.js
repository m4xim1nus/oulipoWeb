// Chiffre de César : chaque lettre est décalée de k rangs dans l'alphabet.
const $ = (id) => document.getElementById(id);
const A = "abcdefghijklmnopqrstuvwxyz";

let dir = -1;   // -1 : déchiffrer, +1 : chiffrer
let k = 0;

// Décale les lettres ; les accents sont retirés (une lettre accentuée devient sa lettre de base),
// la casse est conservée, le reste (espaces, ponctuation, chiffres) ne bouge pas.
export function caesar(text, shift) {
  const s = ((shift % 26) + 26) % 26;
  return text
    .replace(/œ/g, "oe").replace(/Œ/g, "OE").replace(/æ/g, "ae").replace(/Æ/g, "AE")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[a-z]/gi, (ch) => {
      const lower = ch.toLowerCase();
      const out = A[(A.indexOf(lower) + s) % 26];
      return ch === lower ? out : out.toUpperCase();
    });
}

export function init() {
  $("c-in").value = caesar("Oulipo : ouvroir de littérature potentielle.", 5);
  $("c-in").addEventListener("input", update);
  $("c-shift").addEventListener("input", (e) => setShift(Number(e.target.value)));
  $("c-minus").addEventListener("click", () => setShift(k - 1));
  $("c-plus").addEventListener("click", () => setShift(k + 1));
  document.querySelectorAll("#view-cesar [data-dir]").forEach((b) =>
    b.addEventListener("click", () => setDir(Number(b.dataset.dir))));
  $("c-guess").addEventListener("click", guess);
  $("c-all").addEventListener("click", openBrute);
  $("c-brute-close").addEventListener("click", closeBrute);
  update();
}

function setShift(v) {
  k = ((v % 26) + 26) % 26;
  update();
}

function setDir(d) {
  if (d === dir) return;
  // On garde le fil : le résultat affiché devient le nouveau texte d'entrée
  $("c-in").value = $("c-out").textContent;
  dir = d;
  document.querySelectorAll("#view-cesar [data-dir]").forEach((b) => b.setAttribute("aria-pressed", Number(b.dataset.dir) === d));
  closeBrute();
  update();
}

function guess() {
  const counts = {};
  for (const ch of caesar($("c-in").value.toLowerCase(), 0)) if (A.includes(ch)) counts[ch] = (counts[ch] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top) return;
  // La lettre la plus fréquente du message chiffré est supposée être un E en clair
  setShift(A.indexOf(top[0]) - A.indexOf("e"));
}

function openBrute() {
  const src = $("c-in").value.replace(/\s+/g, " ").trim().slice(0, 140);
  $("c-brute-list").replaceChildren(...Array.from({ length: 26 }, (_, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="k">${i}</span><span class="t"></span>`;
    li.querySelector(".t").textContent = caesar(src, -i);
    li.classList.toggle("current", i === k);
    li.addEventListener("click", () => { setShift(i); closeBrute(); });
    return li;
  }));
  $("c-brute").hidden = false;
}

function closeBrute() { $("c-brute").hidden = true; }

function update() {
  const input = $("c-in").value;
  const output = caesar(input, dir * k);
  $("c-out").textContent = output;
  $("c-shift").value = k;
  $("c-shift-out").textContent = k;
  $("c-in-label").textContent = dir < 0 ? "Message chiffré" : "Message en clair";
  $("c-out-label").textContent = dir < 0 ? "Message déchiffré" : "Message chiffré";
  $("c-guess").hidden = $("c-all").hidden = dir > 0;

  // Les deux alphabets : clair en haut, chiffré en bas (décalé de k)
  const plain = caesar(dir < 0 ? output : input, 0).toLowerCase();
  const wheel = $("c-wheel");
  const cells = [`<span class="rl">clair</span>`];
  for (const c of A) cells.push(`<span class="c top${plain.includes(c) ? " used" : ""}">${c.toUpperCase()}</span>`);
  cells.push(`<span></span>`);
  for (let i = 0; i < 26; i++) cells.push(`<span class="arrow">↓</span>`);
  cells.push(`<span class="rl">chiffré</span>`);
  for (const c of A) cells.push(`<span class="c bot${plain.includes(c) ? " used" : ""}">${A[(A.indexOf(c) + k) % 26].toUpperCase()}</span>`);
  wheel.innerHTML = cells.join("");
}

export function onKey(e) {
  if (e.key === "ArrowLeft" || e.key === "-") setShift(k - 1);
  else if (e.key === "ArrowRight" || e.key === "+") setShift(k + 1);
  else if (e.key === "Escape") closeBrute();
  else return;
  e.preventDefault();
}
