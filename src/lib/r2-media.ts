import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const PRIVATE_R2_HOST = ".r2.cloudflarestorage.com";

export function isPrivateR2Url(url: string) {
  return url.includes(PRIVATE_R2_HOST);
}

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/** URL publique directe ou URL signée R2 pour la vidéo hero */
export async function getHeroVideoUrl(): Promise<string | null> {
  const publicUrl = process.env.NEXT_PUBLIC_HERO_VIDEO_URL?.trim();

  if (publicUrl && !isPrivateR2Url(publicUrl)) {
    return publicUrl;
  }

  const client = getR2Client();
  const bucket = process.env.R2_BUCKET ?? "guecho";
  const key =
    process.env.R2_HERO_VIDEO_KEY ?? "assets/videos/video-cover.mp4";

  if (!client) {
    return publicUrl && !isPrivateR2Url(publicUrl) ? publicUrl : null;
  }

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return await getSignedUrl(client, command, { expiresIn: 60 * 60 * 6 });
  } catch {
    return null;
  }
}
