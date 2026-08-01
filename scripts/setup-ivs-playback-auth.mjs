import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  IvsClient,
  ImportPlaybackKeyPairCommand,
  UpdateChannelCommand,
} from "@aws-sdk/client-ivs";

const root = process.cwd();
const privPath = join(root, "keys/ivs-playback-private.pem");
const pubPath = join(root, "keys/ivs-playback-public.pem");

if (!existsSync(privPath) || !existsSync(pubPath)) {
  console.error("Clés manquantes. Lancez: npm run stream:ivs-keys");
  process.exit(1);
}

const privatePem = readFileSync(privPath, "utf8").trim();
const publicPem = readFileSync(pubPath, "utf8").trim();
const envPath = join(root, ".env");
const envText = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

if (!envText.includes("IVS_PLAYBACK_PRIVATE_KEY=")) {
  const escaped = privatePem.replace(/\n/g, "\\n");
  appendFileSync(
    envPath,
    `\n# IVS private playback (ECDSA P-384)\nIVS_PLAYBACK_PRIVATE_KEY="${escaped}"\n`,
  );
  console.log("✓ IVS_PLAYBACK_PRIVATE_KEY ajouté dans .env");
} else {
  console.log("• IVS_PLAYBACK_PRIVATE_KEY déjà présent dans .env");
}

const region =
  process.env.AWS_REGION?.trim() ||
  process.env.AWS_DEFAULT_REGION?.trim() ||
  "us-east-1";

const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

if (!accessKeyId || !secretAccessKey) {
  // load from .env manually for this script
  for (const line of envText.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2] ?? "";
    if (!key) continue;
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const awsKey = process.env.AWS_ACCESS_KEY_ID;
const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;
if (!awsKey || !awsSecret) {
  console.error("AWS credentials manquants dans .env");
  process.exit(1);
}

const client = new IvsClient({
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || region,
  credentials: {
    accessKeyId: awsKey,
    secretAccessKey: awsSecret,
  },
});

console.log("Import de la clé publique dans IVS…");
try {
  const imported = await client.send(
    new ImportPlaybackKeyPairCommand({
      name: `guecho-playback-${Date.now()}`,
      publicKeyMaterial: publicPem,
    }),
  );
  console.log("✓ Playback key importée:", imported.keyPair?.arn);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Conflict") || message.includes("already")) {
    console.log("• Clé déjà présente côté IVS (ok)");
  } else {
    console.error("Import IVS échoué:", message);
    console.error(
      "Importez manuellement keys/ivs-playback-public.pem dans IVS Console > Playback keys",
    );
  }
}

const prisma = new PrismaClient();
try {
  const cfg = await prisma.streamConfig.findFirst();
  if (!cfg?.channelArn) {
    console.log("• Aucun canal IVS en base — créez-le dans /admin/streaming");
  } else {
    console.log("Activation authorized=true sur", cfg.channelArn);
    await client.send(
      new UpdateChannelCommand({
        arn: cfg.channelArn,
        authorized: true,
      }),
    );
    console.log("✓ Canal privé activé (playback token requis)");
  }
} finally {
  await prisma.$disconnect();
}

console.log("\nRedémarrez le serveur Next (npm run dev) pour charger la clé.");
