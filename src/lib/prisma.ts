import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function withDatabaseTimeouts(url: string | undefined) {
  if (!url) return url;

  let result = url;

  if (!result.includes("connect_timeout=")) {
    result += `${result.includes("?") ? "&" : "?"}connect_timeout=15`;
  }

  if (!result.includes("pool_timeout=")) {
    result += "&pool_timeout=15";
  }

  return result;
}

function createPrismaClient() {
  const url = withDatabaseTimeouts(process.env.DATABASE_URL);

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(url
      ? {
          datasources: {
            db: { url },
          },
        }
      : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
