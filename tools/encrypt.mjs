// Chiffre chaque data/<nom>.json (textes sous droits, non versionnés) → data/<nom>.enc.json
// (AES-GCM, clé PBKDF2-SHA256). Tous les fichiers partagent le même mot de passe.
// Usage : node tools/encrypt.mjs   (mot de passe demandé, ou variable OULIPO_PASS)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";
import { createInterface } from "node:readline/promises";

const ITER = 250000;
const dir = new URL("../data/", import.meta.url);

let pass = process.env.OULIPO_PASS;
if (!pass) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  pass = await rl.question("Mot de passe : ");
  rl.close();
}

const b64 = (u) => Buffer.from(u).toString("base64");
const names = readdirSync(dir).filter(
  (f) => f.endsWith(".json") && !f.endsWith(".enc.json"),
);

for (const name of names) {
  const plain = readFileSync(new URL(name, dir));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pass),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain),
  );
  const out = name.replace(/\.json$/, ".enc.json");
  writeFileSync(
    new URL(out, dir),
    JSON.stringify({ iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(ct) }),
  );
  console.log(`OK : data/${name} → data/${out}`);
}
