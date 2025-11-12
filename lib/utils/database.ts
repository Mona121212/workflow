

import { PrismaClient } from '@prisma/client';

// ============================================
// Prisma Client Singleton Pattern
// ============================================
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ============================================
// Database Connection Test
// ============================================
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// ============================================
// Cleanup Function (Graceful Shutdown)
// ============================================
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
