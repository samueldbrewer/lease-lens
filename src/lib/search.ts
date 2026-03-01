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
        if (chunk.section) context += `[Section: ${chunk.section}]\n`;
        context += `${chunk.content}\n\n`;
      }
    }
  }

  return context;
}
