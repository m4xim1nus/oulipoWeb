// Routeur par hash (#sonnets, #lettres, #cesar), thème, plein écran, raccourcis.
import * as sonnets from "./sonnets.js";
import * as lettres from "./lettres.js";
import * as cesar from "./cesar.js";

const tools = { sonnets, lettres, cesar };
let current = null;

function route() {
  const [name, ...rest] = location.hash.slice(1).split("/");
  const view = tools[name] ? name : "sonnets";
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.dataset.view !== view));
  document.querySelectorAll(".tabs a").forEach((a) =>
    a.dataset.tab === view ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  if (current !== view) tools[view].show?.();
  tools[view].onRoute?.(rest.join("/"));
  current = view;
}

// Thème : clair ↔ sombre, mémorisé sur l'appareil
document.getElementById("theme-btn").addEventListener("click", () => {
  const root = document.documentElement;
  const dark = root.dataset.theme
    ? root.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
  tools[current]?.onTheme?.();
});

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}
document.getElementById("fs-btn").addEventListener("click", toggleFullscreen);

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest("input, textarea, select")) return;
  if (e.key === "f" || e.key === "F") { toggleFullscreen(); e.preventDefault(); return; }
  tools[current]?.onKey?.(e);
});

Object.values(tools).forEach((t) => t.init());
addEventListener("hashchange", route);
route();
