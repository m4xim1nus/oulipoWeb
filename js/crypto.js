// Déchiffrement du fichier produit par tools/encrypt.mjs (PBKDF2-SHA256 → AES-GCM).
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function decryptJson(url, password) {
  const box = await (await fetch(url)).json();
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: unb64(box.salt), iterations: box.iter, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  // Lève une exception si le mot de passe est faux (tag GCM invalide)
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, key, unb64(box.data));
  return JSON.parse(new TextDecoder().decode(plain));
}

// Mot de passe de la séquence, mémorisé sur l'appareil (partagé par tous les onglets)
const PASS_KEY = "oulipo-pass";
export const savedPass = {
  get: () => { try { return localStorage.getItem(PASS_KEY); } catch { return null; } },
  set: (v) => { try { localStorage.setItem(PASS_KEY, v); } catch {} },
  del: () => { try { localStorage.removeItem(PASS_KEY); } catch {} },
};

// Déchiffre avec le mot de passe mémorisé, sinon le demande (et le mémorise s'il est bon)
export async function decryptWithPrompt(url) {
  const saved = savedPass.get();
  if (saved) {
    try { return await decryptJson(url, saved); } catch { savedPass.del(); }
  }
  const pass = prompt("Mot de passe de la séquence :");
  if (!pass) return null;
  try {
    const data = await decryptJson(url, pass);
    savedPass.set(pass);
    return data;
  } catch {
    alert("Mot de passe incorrect.");
    return null;
  }
}
