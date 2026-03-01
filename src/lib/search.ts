import { prisma } from "./db";

export interface SearchResult {
  chunkId: string;
  documentId: string;
  filename: string;
  content: string;
  section: string | null;
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

export async function buildChatContext(query: string, userId: string): Promise<string> {
  let results: SearchResult[];

  try {
    results = await searchChunks(query, userId, 15);
  } catch {
    results = await searchChunksFallback(query, userId, 15);
  }

  if (results.length === 0) {
    results = await searchChunksFallback(query, userId, 15);
  }

  const allLeaseTerms = await prisma.leaseTerms.findMany({
    where: { document: { userId } },
    include: { document: { select: { id: true, filename: true } } },
  });

  let context = "## Portfolio Summary\n\n";

  for (const lt of allLeaseTerms) {
    context += `### ${lt.document.filename} (ID: ${lt.document.id})\n`;
    if (lt.propertyAddress) context += `- Property: ${lt.propertyAddress}\n`;
    if (lt.tenantName) context += `- Tenant: ${lt.tenantName}\n`;
    if (lt.landlordName) context += `- Landlord: ${lt.landlordName}\n`;
    if (lt.leaseStart)
      context += `- Start: ${new Date(lt.leaseStart).toLocaleDateString()}\n`;
    if (lt.leaseEnd)
      context += `- End: ${new Date(lt.leaseEnd).toLocaleDateString()}\n`;
    if (lt.monthlyRent)
      context += `- Monthly Rent: $${Number(lt.monthlyRent).toLocaleString()}\n`;
    if (lt.leaseType) context += `- Type: ${lt.leaseType}\n`;
    if (lt.summary) context += `- Summary: ${lt.summary}\n`;
    context += "\n";
  }

  if (results.length > 0) {
    context += "\n## Relevant Document Sections\n\n";
    const byDoc: Record<string, SearchResult[]> = {};
    for (const r of results) {
      if (!byDoc[r.filename]) byDoc[r.filename] = [];
      byDoc[r.filename].push(r);
    }

    for (const [filename, chunks] of Object.entries(byDoc)) {
      const docId = chunks[0].documentId;
      context += `### From: ${filename} (ID: ${docId})\n`;
      for (const chunk of chunks) {
        if (chunk.section) context += `[Section: ${chunk.section}]\n`;
        context += `${chunk.content}\n\n`;
      }
    }
  }

  return context;
}
