import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
export const prisma = new PrismaClient({ adapter });

export async function withDbRetry<T>(fn: () => Promise<T>, maxRetries = 5, delayMs = 100): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= maxRetries || (!err?.message?.includes('timed out') && !err?.message?.includes('busy') && !err?.message?.includes('database is locked'))) {
        throw err;
      }
      await new Promise((res) => setTimeout(res, Math.floor(delayMs * Math.pow(1.5, attempt))));
    }
  }
}



