import { prisma } from "./db";

// --- Static system prompt (cache-friendly: identical across all messages) ---

const STATIC_SYSTEM_PROMPT = `You are LeaseSimple AI, an expert commercial real estate lease analyst. You help real estate professionals understand, compare, and manage their lease portfolios.

Your capabilities:
- Analyze individual lease terms and provisions
- Compare terms across multiple leases in a portfolio
- Identify coverage gaps, risks, and compliance issues
- Explain complex lease language in plain terms
- Flag potential issues with maintenance obligations, insurance requirements, CAM charges, and escalation clauses
- Help determine what is or isn't covered under specific lease provisions

When answering:
1. ALWAYS base your answers on the lease data and document text provided below. Every document listed is a real lease the user uploaded.
2. When referencing a document, ALWAYS make it a clickable markdown link with the specific page: [Document Name (p.N)](/api/documents/DOC_ID/pdf#page=N). Use the document ID shown in the header for each document.
3. You have access to the FULL TEXT of attached documents. Quote exact lease language when relevant, always citing the page number.
4. Compare terms across leases when the question involves multiple properties.
5. Highlight risks, discrepancies, or unusual terms.
6. Provide actionable recommendations.
7. Be precise about dates, dollar amounts, and obligations — use the exact figures from the documents.
8. If information is not available in the provided context, say so clearly.`;

// --- Token estimation ---

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// --- Build portfolio index (compact, one line per doc) ---

function buildPortfolioIndex(
  allDocs: {
    id: string;
    filename: string;
    leaseTerms: {
      tenantName: string | null;
      propertyAddress: string | null;
      monthlyRent: unknown;
      leaseStart: Date | null;
      leaseEnd: Date | null;
    } | null;
  }[]
): string {
  if (allDocs.length === 0) return "";

  let index = "\n## Portfolio Index\n\n";
  for (const doc of allDocs) {
    const lt = doc.leaseTerms;
    const parts = [doc.filename];
    if (lt?.tenantName) parts.push(`Tenant: ${lt.tenantName}`);
    if (lt?.propertyAddress) parts.push(`Address: ${lt.propertyAddress}`);
    if (lt?.monthlyRent) parts.push(`Rent: $${Number(lt.monthlyRent).toLocaleString()}/mo`);
    if (lt?.leaseStart) parts.push(`Start: ${new Date(lt.leaseStart).toLocaleDateString()}`);
    if (lt?.leaseEnd) parts.push(`End: ${new Date(lt.leaseEnd).toLocaleDateString()}`);
    index += `- ${parts.join(" | ")}\n`;
  }
  return index;
}

// --- Format lease terms as summary ---

function formatLeaseTermsSummary(
  docId: string,
  filename: string,
  lt: Record<string, unknown>
): string {
  let text = `### ${filename} (ID: ${docId}) [SUMMARY]\n`;
  text += `PDF link: /api/documents/${docId}/pdf\n`;

  if (lt.propertyAddress) text += `- Property Address: ${lt.propertyAddress}\n`;
  if (lt.tenantName) text += `- Tenant: ${lt.tenantName}\n`;
  if (lt.landlordName) text += `- Landlord: ${lt.landlordName}\n`;
  if (lt.leaseStart) text += `- Lease Start: ${new Date(lt.leaseStart as string).toLocaleDateString()}\n`;
  if (lt.leaseEnd) text += `- Lease End: ${new Date(lt.leaseEnd as string).toLocaleDateString()}\n`;
  if (lt.monthlyRent) text += `- Monthly Rent: $${Number(lt.monthlyRent).toLocaleString()}\n`;
  if (lt.securityDeposit) text += `- Security Deposit: $${Number(lt.securityDeposit).toLocaleString()}\n`;
  if (lt.leaseType) text += `- Lease Type: ${lt.leaseType}\n`;
  if (lt.squareFootage) text += `- Square Footage: ${Number(lt.squareFootage).toLocaleString()} sq ft\n`;
  if (lt.permittedUse) text += `- Permitted Use: ${lt.permittedUse}\n`;
  if (lt.renewalOptions) text += `- Renewal Options: ${lt.renewalOptions}\n`;
  if (lt.terminationClauses) text += `- Termination Clauses: ${lt.terminationClauses}\n`;
  if (lt.taxObligations) text += `- Tax Obligations: ${lt.taxObligations}\n`;
  if (lt.camCharges) text += `- CAM Charges: ${lt.camCharges}\n`;
  if (lt.escalationClauses) text += `- Escalation Clauses: ${lt.escalationClauses}\n`;

  const maint = lt.maintenanceObligations as { tenant?: string[]; landlord?: string[] } | null;
  if (maint) {
    if (maint.tenant?.length) text += `- Tenant Maintenance: ${maint.tenant.join("; ")}\n`;
    if (maint.landlord?.length) text += `- Landlord Maintenance: ${maint.landlord.join("; ")}\n`;
  }

  const ins = lt.insuranceRequirements as { types?: string[]; minimumCoverage?: string } | null;
  if (ins) {
    if (ins.types?.length) text += `- Insurance Types: ${ins.types.join("; ")}\n`;
    if (ins.minimumCoverage) text += `- Minimum Coverage: ${ins.minimumCoverage}\n`;
  }

  const kp = lt.keyProvisions as string[] | null;
  if (kp?.length) text += `- Key Provisions: ${kp.join("; ")}\n`;

  if (lt.summary) text += `- Summary: ${lt.summary}\n`;

  return text + "\n";
}

// --- Token budget management ---

const TOKEN_BUDGET = 250000; // leaves headroom for output + message history

export async function fitDocumentsInBudget(
  fullDocIds: string[],
  summaryDocIds: string[],
  userId: string
): Promise<{ fullIds: string[]; summaryIds: string[] }> {
  if (fullDocIds.length === 0 && summaryDocIds.length === 0) {
    return { fullIds: [], summaryIds: [] };
  }

  // Fetch full-text docs with their text lengths
  const fullDocs = fullDocIds.length > 0
    ? await prisma.document.findMany({
        where: { id: { in: fullDocIds }, userId },
        select: { id: true, originalText: true },
      })
    : [];

  const fitted: string[] = [];
  const downgraded: string[] = [...summaryDocIds];
  let usedTokens = estimateTokens(STATIC_SYSTEM_PROMPT) + 5000; // buffer for portfolio index

  for (const doc of fullDocs) {
    const docTokens = estimateTokens(doc.originalText || "");
    if (usedTokens + docTokens <= TOKEN_BUDGET) {
      fitted.push(doc.id);
      usedTokens += docTokens;
    } else {
      // Downgrade to summary mode
      downgraded.push(doc.id);
    }
  }

  return { fullIds: fitted, summaryIds: downgraded };
}

// --- Trim message history ---

export function trimMessageHistory(
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens: number
): { role: "user" | "assistant"; content: string }[] {
  if (messages.length <= 2) return messages;

  let totalTokens = 0;
  for (const m of messages) {
    totalTokens += estimateTokens(m.content);
  }

  if (totalTokens <= maxTokens) return messages;

  // Keep first message (sets topic) and trim from middle, keeping recent messages
  const first = messages[0];
  const recent = messages.slice(-Math.min(messages.length - 1, 10));
  let trimmedTokens = estimateTokens(first.content);
  for (const m of recent) {
    trimmedTokens += estimateTokens(m.content);
  }

  if (trimmedTokens <= maxTokens) {
    return [first, ...recent];
  }

  // If still over budget, just keep the most recent messages
  const result: { role: "user" | "assistant"; content: string }[] = [];
  let budget = maxTokens;
  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = estimateTokens(messages[i].content);
    if (budget - tokens < 0 && result.length > 0) break;
    result.unshift(messages[i]);
    budget -= tokens;
  }

  return result;
}

// --- Main context builder ---

export async function buildConversationContext(
  conversationId: string,
  userId: string
): Promise<{ systemPrompt: string; tokenEstimate: number }> {
  // Load conversation documents
  const convDocs = await prisma.conversationDocument.findMany({
    where: { conversationId },
    include: {
      document: {
        select: {
          id: true,
          filename: true,
          originalText: true,
          pageCount: true,
        },
      },
    },
  });

  // Load all user docs for portfolio index
  const allDocs = await prisma.document.findMany({
    where: { userId, status: "ready" },
    select: {
      id: true,
      filename: true,
      leaseTerms: {
        select: {
          tenantName: true,
          propertyAddress: true,
          monthlyRent: true,
          leaseStart: true,
          leaseEnd: true,
        },
      },
    },
  });

  // Separate full-text vs summary docs
  const fullDocs = convDocs.filter((cd) => cd.mode === "full");
  const summaryDocs = convDocs.filter((cd) => cd.mode === "summary");

  // Build the system prompt in cache-friendly order
  let prompt = STATIC_SYSTEM_PROMPT;

  // Attached documents section
  if (convDocs.length > 0) {
    prompt += "\n\n--- ATTACHED LEASE DOCUMENTS ---\n";

    // Full-text documents
    for (const cd of fullDocs) {
      const doc = cd.document;
      prompt += `\n### ${doc.filename} (ID: ${doc.id}) [FULL TEXT]\n`;
      prompt += `PDF link: /api/documents/${doc.id}/pdf\n`;
      prompt += `Pages: ${doc.pageCount}\n\n`;
      prompt += doc.originalText || "[No text available]";
      prompt += "\n\n";
    }

    // Summary documents
    if (summaryDocs.length > 0) {
      for (const cd of summaryDocs) {
        const lt = await prisma.leaseTerms.findUnique({
          where: { documentId: cd.document.id },
        });
        if (lt) {
          prompt += formatLeaseTermsSummary(
            cd.document.id,
            cd.document.filename,
            lt as unknown as Record<string, unknown>
          );
        }
      }
    }

    prompt += "--- END ATTACHED DOCUMENTS ---\n";
  }

  // Portfolio index (always included so AI knows what's available)
  prompt += buildPortfolioIndex(allDocs);

  const tokenEstimate = estimateTokens(prompt);

  return { systemPrompt: prompt, tokenEstimate };
}
