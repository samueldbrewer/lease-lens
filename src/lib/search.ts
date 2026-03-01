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

export async function fetchDeepReadPages(
  reads: { documentId: string; pages: number[] }[],
  userId: string
): Promise<string> {
  const CHAR_LIMIT = 30000;
  let result = "\n## Deep Read — Full Document Pages\n\n";
  let totalChars = result.length;

  for (const read of reads) {
    const doc = await prisma.document.findFirst({
      where: { id: read.documentId, userId },
      select: { filename: true, originalText: true },
    });

    if (!doc?.originalText) continue;

    const pages = doc.originalText.split("\n\n");

    result += `### Deep Read: ${doc.filename}\n`;
    totalChars += doc.filename.length + 20;

    for (const pageNum of read.pages) {
      // Pages are 1-indexed, array is 0-indexed
      const pageIndex = pageNum - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const pageText = pages[pageIndex];
      if (totalChars + pageText.length > CHAR_LIMIT) {
        result += `#### Page ${pageNum}\n[Truncated — context limit reached]\n\n`;
        return result;
      }

      result += `#### Page ${pageNum}\n${pageText}\n\n`;
      totalChars += pageText.length + 20;
    }
  }

  return result;
}

export async function buildChatContext(query: string, userId: string): Promise<string> {
  // Search for relevant document chunks based on the user's query
  let results: SearchResult[];

  try {
    results = await searchChunks(query, userId, 15);
  } catch {
    results = await searchChunksFallback(query, userId, 15);
  }

  if (results.length === 0) {
    results = await searchChunksFallback(query, userId, 15);
  }

  // Fetch ALL lease terms with full detail — this is the same data the portfolio page shows
  const allLeaseTerms = await prisma.leaseTerms.findMany({
    where: { document: { userId } },
    include: { document: { select: { id: true, filename: true, pageCount: true } } },
  });

  // Fetch chunk page indexes for all user documents — tells the AI which pages cover which sections
  const allChunkPages = await prisma.documentChunk.findMany({
    where: { document: { userId } },
    select: {
      documentId: true,
      section: true,
      startPage: true,
      endPage: true,
    },
    orderBy: { chunkIndex: "asc" },
  });

  // Group chunk page info by document
  const chunkPagesByDoc: Record<string, { section: string | null; startPage: number | null; endPage: number | null }[]> = {};
  for (const cp of allChunkPages) {
    if (!chunkPagesByDoc[cp.documentId]) chunkPagesByDoc[cp.documentId] = [];
    chunkPagesByDoc[cp.documentId].push(cp);
  }

  // Build the full portfolio context so the AI has everything the user sees on the dashboard
  let context = "## Portfolio Summary\n\n";
  context += `Total documents: ${allLeaseTerms.length}\n\n`;

  for (const lt of allLeaseTerms) {
    context += `### ${lt.document.filename} (ID: ${lt.document.id})\n`;
    context += `PDF link: /api/documents/${lt.document.id}/pdf\n`;
    if (lt.propertyAddress) context += `- Property Address: ${lt.propertyAddress}\n`;
    if (lt.tenantName) context += `- Tenant: ${lt.tenantName}\n`;
    if (lt.landlordName) context += `- Landlord: ${lt.landlordName}\n`;
    if (lt.leaseStart)
      context += `- Lease Start: ${new Date(lt.leaseStart).toLocaleDateString()}\n`;
    if (lt.leaseEnd)
      context += `- Lease End: ${new Date(lt.leaseEnd).toLocaleDateString()}\n`;
    if (lt.monthlyRent)
      context += `- Monthly Rent: $${Number(lt.monthlyRent).toLocaleString()}\n`;
    if (lt.securityDeposit)
      context += `- Security Deposit: $${Number(lt.securityDeposit).toLocaleString()}\n`;
    if (lt.leaseType) context += `- Lease Type: ${lt.leaseType}\n`;
    if (lt.squareFootage)
      context += `- Square Footage: ${lt.squareFootage.toLocaleString()} sq ft\n`;
    if (lt.permittedUse) context += `- Permitted Use: ${lt.permittedUse}\n`;
    if (lt.renewalOptions) context += `- Renewal Options: ${lt.renewalOptions}\n`;
    if (lt.terminationClauses) context += `- Termination Clauses: ${lt.terminationClauses}\n`;
    if (lt.taxObligations) context += `- Tax Obligations: ${lt.taxObligations}\n`;
    if (lt.camCharges) context += `- CAM Charges: ${lt.camCharges}\n`;
    if (lt.escalationClauses) context += `- Escalation Clauses: ${lt.escalationClauses}\n`;

    const maint = lt.maintenanceObligations as { tenant?: string[]; landlord?: string[] } | null;
    if (maint) {
      if (maint.tenant && maint.tenant.length > 0)
        context += `- Tenant Maintenance: ${maint.tenant.join("; ")}\n`;
      if (maint.landlord && maint.landlord.length > 0)
        context += `- Landlord Maintenance: ${maint.landlord.join("; ")}\n`;
    }

    const ins = lt.insuranceRequirements as { types?: string[]; minimumCoverage?: string } | null;
    if (ins) {
      if (ins.types && ins.types.length > 0)
        context += `- Insurance Types: ${ins.types.join("; ")}\n`;
      if (ins.minimumCoverage)
        context += `- Minimum Coverage: ${ins.minimumCoverage}\n`;
    }

    const kp = lt.keyProvisions as string[] | null;
    if (kp && kp.length > 0)
      context += `- Key Provisions: ${kp.join("; ")}\n`;

    if (lt.summary) context += `- Summary: ${lt.summary}\n`;
    context += `- Pages: ${lt.document.pageCount}\n`;

    // Add page index — maps sections to specific pages so the AI can cite them
    const docChunks = chunkPagesByDoc[lt.document.id];
    if (docChunks && docChunks.length > 0) {
      const pageIndex: Record<number, Set<string>> = {};
      for (const chunk of docChunks) {
        if (chunk.startPage && chunk.section) {
          if (!pageIndex[chunk.startPage]) pageIndex[chunk.startPage] = new Set();
          pageIndex[chunk.startPage].add(chunk.section);
          if (chunk.endPage && chunk.endPage !== chunk.startPage) {
            if (!pageIndex[chunk.endPage]) pageIndex[chunk.endPage] = new Set();
            pageIndex[chunk.endPage].add(chunk.section);
          }
        }
      }
      const pageEntries = Object.entries(pageIndex)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([page, sections]) => `Page ${page}: ${[...sections].join(", ")}`)
        .join("; ");
      if (pageEntries) {
        context += `- Page Index: ${pageEntries}\n`;
      }
    }

    context += "\n";
  }

  // Add the raw document sections that match the user's query
  if (results.length > 0) {
    context += "\n## Relevant Document Sections (matching your query)\n\n";
    const byDoc: Record<string, SearchResult[]> = {};
    for (const r of results) {
      if (!byDoc[r.documentId]) byDoc[r.documentId] = [];
      byDoc[r.documentId].push(r);
    }

    for (const [docId, chunks] of Object.entries(byDoc)) {
      const filename = chunks[0].filename;
      context += `### From: ${filename} (ID: ${docId})\n`;
      for (const chunk of chunks) {
        const labels: string[] = [];
        if (chunk.section) labels.push(`Section: ${chunk.section}`);
        if (chunk.startPage) {
          labels.push(
            chunk.endPage && chunk.endPage !== chunk.startPage
              ? `Pages ${chunk.startPage}-${chunk.endPage}`
              : `Page ${chunk.startPage}`
          );
        }
        if (labels.length > 0) context += `[${labels.join(" | ")}]\n`;
        context += `${chunk.content}\n\n`;
      }
    }
  }

  return context;
}
