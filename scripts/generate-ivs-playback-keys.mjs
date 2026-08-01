#!/usr/bin/env node
/**
 * Génère une paire ECDSA P-384 pour IVS Playback Authorization.
 *
 * Usage: node scripts/generate-ivs-playback-keys.mjs
 *
 * Ensuite:
 * 1. Importer keys/ivs-playback-public.pem dans AWS IVS > Playback keys
 * 2. Mettre le contenu de keys/ivs-playback-private.pem dans IVS_PLAYBACK_PRIVATE_KEY
 * 3. Admin streaming > Activer auth lecture IVS
 */
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "keys");
mkdirSync(dir, { recursive: true });

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "P-384",
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const pubPath = join(dir, "ivs-playback-public.pem");
const privPath = join(dir, "ivs-playback-private.pem");

writeFileSync(pubPath, publicKey);
writeFileSync(privPath, privateKey);

console.log("Clés générées:");
console.log(`  Public : ${pubPath}`);
console.log(`  Privée : ${privPath}`);
console.log("");
console.log("Importez la clé publique dans IVS Console > Playback security > Playback keys.");
console.log("Ajoutez la clé privée dans .env :");
console.log('IVS_PLAYBACK_PRIVATE_KEY="' + privateKey.replace(/\n/g, "\\n") + '"');
