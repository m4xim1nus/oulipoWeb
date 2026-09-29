// Menu « Afficher » : chaque case décochée pose la classe hide-<nom> sur la vue concernée,
// pour dévoiler les outils pas à pas devant la classe. État mémorisé sur l'appareil.
const menu = document.getElementById("show-menu");
const listeners = {};

const view = (name) => document.querySelector(`.view[data-view="${name}"]`);
const boxes = (name) => menu.querySelectorAll(`[data-for="${name}"] input[data-show]`);

export const shown = (name, what) => !view(name).classList.contains(`hide-${what}`);
export const onShow = (name, fn) => (listeners[name] = fn);

// N'affiche dans le menu que les cases de l'onglet courant
export function setView(name) {
  menu.querySelectorAll("[data-for]").forEach((f) => (f.hidden = f.dataset.for !== name));
}

function apply(name) {
  const state = {};
  boxes(name).forEach((b) => {
    state[b.dataset.show] = b.checked;
    view(name).classList.toggle(`hide-${b.dataset.show}`, !b.checked);
  });
  return state;
}

menu.querySelectorAll("[data-for]").forEach((f) => {
  const name = f.dataset.for;
  const key = `show:${name}`;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
  boxes(name).forEach((b) => {
    if (b.dataset.show in saved) b.checked = saved[b.dataset.show];
    b.addEventListener("change", () => {
      const state = apply(name);
      try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
      listeners[name]?.();
    });
  });
  apply(name);
});

// Fermeture au clic ailleurs ou avec Échap
document.addEventListener("click", (e) => { if (!menu.contains(e.target)) menu.open = false; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") menu.open = false; });
