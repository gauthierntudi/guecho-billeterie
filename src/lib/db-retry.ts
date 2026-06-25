import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const CONNECTION_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2028"]);

export function isPrismaConnectionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return CONNECTION_ERROR_CODES.has(error.code);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Error) {
    return /can't reach database server|connection terminated|ECONNRESET|ETIMEDOUT/i.test(
      error.message,
    );
  }

  return false;
}

async function resetPrismaConnection() {
  try {
    await prisma.$disconnect();
  } catch {
    // ignore disconnect errors on a broken connection
  }
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isPrismaConnectionError(error) || attempt === retries - 1) {
        throw error;
      }

      await resetPrismaConnection();
      await wait(600 * (attempt + 1));
    }
  }

  throw lastError;
}
