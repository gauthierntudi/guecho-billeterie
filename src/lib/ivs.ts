import {
  CreateChannelCommand,
  GetStreamCommand,
  IvsClient,
  ChannelLatencyMode,
  ChannelType,
} from "@aws-sdk/client-ivs";

function getAwsCredentials() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const region =
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    "us-east-1";

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return { accessKeyId, secretAccessKey, region };
}

export function getIvsClient() {
  const credentials = getAwsCredentials();
  if (!credentials) return null;

  return new IvsClient({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
}

export function isIvsConfigured() {
  return Boolean(getAwsCredentials());
}

export type CreatedIvsChannel = {
  channelArn: string;
  channelName: string;
  ingestEndpoint: string;
  playbackUrl: string;
  streamKeyArn: string;
  streamKeyValue: string;
};

export async function createIvsChannel(
  name: string,
): Promise<CreatedIvsChannel> {
  const client = getIvsClient();
  if (!client) {
    throw new Error("Credentials AWS IVS manquants");
  }

  const response = await client.send(
    new CreateChannelCommand({
      name: name.slice(0, 128),
      latencyMode: ChannelLatencyMode.LowLatency,
      type: ChannelType.StandardChannelType,
      authorized: false,
    }),
  );

  const channel = response.channel;
  const streamKey = response.streamKey;

  if (
    !channel?.arn ||
    !channel.name ||
    !channel.ingestEndpoint ||
    !channel.playbackUrl ||
    !streamKey?.arn ||
    !streamKey.value
  ) {
    throw new Error("Réponse IVS incomplète lors de la création du canal");
  }

  return {
    channelArn: channel.arn,
    channelName: channel.name,
    ingestEndpoint: channel.ingestEndpoint,
    playbackUrl: channel.playbackUrl,
    streamKeyArn: streamKey.arn,
    streamKeyValue: streamKey.value,
  };
}

export type IvsStreamLiveState = {
  isBroadcasting: boolean;
  health?: string;
  startTime?: string;
  viewerCount?: number;
};

export async function getIvsStreamState(
  channelArn: string,
): Promise<IvsStreamLiveState> {
  const client = getIvsClient();
  if (!client) {
    throw new Error("Credentials AWS IVS manquants");
  }

  try {
    const response = await client.send(
      new GetStreamCommand({ channelArn }),
    );

    return {
      isBroadcasting: Boolean(response.stream),
      health: response.stream?.health,
      startTime: response.stream?.startTime?.toISOString(),
      viewerCount: response.stream?.viewerCount,
    };
  } catch (error) {
    const name =
      error && typeof error === "object" && "name" in error
        ? String((error as { name: unknown }).name)
        : "";
    const message = error instanceof Error ? error.message : String(error);

    if (
      name === "ChannelNotBroadcasting" ||
      name === "ResourceNotFoundException" ||
      message.includes("ChannelNotBroadcasting") ||
      message.includes("ResourceNotFoundException")
    ) {
      return { isBroadcasting: false };
    }
    throw error;
  }
}

export function buildRtmpIngestUrl(ingestEndpoint: string) {
  const host = ingestEndpoint.replace(/^rtmps?:\/\//, "").replace(/\/$/, "");
  return `rtmps://${host}:443/app/`;
}
