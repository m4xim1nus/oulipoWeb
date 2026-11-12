// Cent mille milliards de poèmes (Queneau) : vers chiffrés, déverrouillés par le mot de passe,
// puis lus avec le moteur commun (reader.js).
import { decryptJson, savedPass as store } from "./crypto.js";
import { createReader } from "./reader.js";

const DATA_URL = "data/queneau.enc.json";
const $ = (id) => document.getElementById(id);

let reader = null;

export function init() {
  reader = createReader({ root: $("sonnets"), view: "sonnets", hash: "#sonnets/" });
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
}

export async function show() {
  if (reader.loaded()) return;
  const saved = store.get();
  if (saved && (await unlock(saved))) return;
  if (saved) store.del();
  $("lock").hidden = false;
  $("lock-pass").focus();
}

export const onRoute = (rest) => reader.setCode(rest);
export const onKey = (e) => reader.onKey(e);

async function unlock(pass) {
  let data;
  try {
    data = await decryptJson(DATA_URL, pass);
  } catch {
    return false;
  }
  $("lock").hidden = true;
  $("sonnets").hidden = false;
  reader.load(data);
  return true;
}
