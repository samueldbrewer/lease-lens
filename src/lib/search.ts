import { prisma } from "./db";

export interface SearchResult {
  chunkId: string;
  documentId: string;
  filename: string;
  content: string;
  section: string | null;
  startPage: number | null;
  endPage: number | null;
  rank: number;
}

export async function searchChunks(
  query: string,
  userId: string,
  limit: number = 20
): Promise<SearchResult[]> {
  const words = query
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => w.replace(/[^\w]/g, ""))
    .filter(Boolean);

  if (words.length === 0) return [];

  const tsQuery = words.join(" & ");

  const results = await prisma.$queryRawUnsafe<SearchResult[]>(
    `
    SELECT
      dc.id as "chunkId",
      dc."documentId",
      d.filename,
      dc.content,
      dc.section,
      dc."startPage",
      dc."endPage",
      ts_rank(to_tsvector('english', dc.content), to_tsquery('english', $1)) as rank
    FROM "DocumentChunk" dc
    JOIN "Document" d ON dc."documentId" = d.id
    WHERE to_tsvector('english', dc.content) @@ to_tsquery('english', $1)
      AND d."userId" = $3
    ORDER BY rank DESC
    LIMIT $2
    `,
    tsQuery,
    limit,
    userId
  );

  return results;
}

export async function searchChunksFallback(
  query: string,
  userId: string,
  limit: number = 20
): Promise<SearchResult[]> {
  const words = query
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 10);

  if (words.length === 0) return [];

  const conditions = words.map(
    (_, i) => `dc.content ILIKE $${i + 1}`
  );
  const whereClause = `(${conditions.join(" OR ")}) AND d."userId" = $${words.length + 1}`;
  const params = words.map((w) => `%${w}%`);

  const results = await prisma.$queryRawUnsafe<SearchResult[]>(
    `
    SELECT
      dc.id as "chunkId",
      dc."documentId",
      d.filename,
      dc.content,
      dc.section,
      dc."startPage",
      dc."endPage",
      1.0 as rank
    FROM "DocumentChunk" dc
    JOIN "Document" d ON dc."documentId" = d.id
    WHERE ${whereClause}
    ORDER BY dc."chunkIndex" ASC
    LIMIT $${words.length + 2}
    `,
    ...params,
    userId,
    limit
  );

  return results;
}

