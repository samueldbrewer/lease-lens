import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: appendConnectionLimit(process.env.DATABASE_URL),
  });

globalForPrisma.prisma = prisma;

function appendConnectionLimit(url: string | undefined): string | undefined {
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  if (url.includes("connection_limit")) return url;
  return `${url}${separator}connection_limit=5`;
}
