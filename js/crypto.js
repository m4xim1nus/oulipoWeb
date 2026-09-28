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
