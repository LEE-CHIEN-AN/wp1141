import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const globalForPrisma = typeof global !== 'undefined' ? global : globalThis;

export const prisma: PrismaClient =
  (globalForPrisma as any).prismaGlobal ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  (globalForPrisma as any).prismaGlobal = prisma;
}


