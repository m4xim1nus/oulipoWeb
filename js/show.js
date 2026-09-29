// Bascules « œil » de la barre du haut : chaque élément masqué pose la classe hide-<nom> sur la vue
// concernée, pour dévoiler les outils pas à pas devant la classe. État mémorisé sur l'appareil.
const bar = document.getElementById("show-toggles");
const listeners = {};
const EYE = `<svg class="eye-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`
  + `<svg class="eye-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>`;

const view = (name) => document.querySelector(`.view[data-view="${name}"]`);
const buttons = (name) => bar.querySelectorAll(`[data-for="${name}"] [data-show]`);

export const shown = (name, what) => !view(name).classList.contains(`hide-${what}`);
export const onShow = (name, fn) => (listeners[name] = fn);

// N'affiche que les bascules de l'onglet courant
export function setView(name) {
  bar.querySelectorAll("[data-for]").forEach((g) => (g.hidden = g.dataset.for !== name));
}

function apply(name) {
  const state = {};
  buttons(name).forEach((b) => {
    const on = b.getAttribute("aria-pressed") === "true";
    state[b.dataset.show] = on;
    view(name).classList.toggle(`hide-${b.dataset.show}`, !on);
  });
  return state;
}

bar.querySelectorAll("[data-for]").forEach((g) => {
  const name = g.dataset.for;
  const key = `show:${name}`;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
  buttons(name).forEach((b) => {
    b.insertAdjacentHTML("afterbegin", EYE);
    if (b.dataset.show in saved) b.setAttribute("aria-pressed", saved[b.dataset.show]);
    b.addEventListener("click", () => {
      b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true");
      const state = apply(name);
      try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
      listeners[name]?.();
    });
  });
  apply(name);
});
