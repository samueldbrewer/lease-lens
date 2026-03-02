import OpenAI from "openai";
import { prisma } from "./db";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Types ---

export interface ArbitrationResult {
  action: "keep" | "switch" | "add" | "portfolio";
  documentIds: string[];   // full text attached
  summaryIds: string[];     // structured terms only
  reason: string;
}

interface DocIndex {
  id: string;
  filename: string;
  tenantName: string | null;
  propertyAddress: string | null;
  monthlyRent: number | null;
}

// --- Topic shift detection (local heuristic, no LLM call) ---

const TOPIC_SHIFT_PHRASES = [
  "all leases",
  "all my leases",
  "switch to",
  "compare all",
  "different lease",
  "other lease",
  "another lease",
  "every lease",
  "across all",
  "portfolio",
  "all properties",
  "all tenants",
  "every tenant",
  "every property",
  "all documents",
];

// Phrases indicating the user needs full document text, not just summaries
const DETAIL_REQUEST_PHRASES = [
  "exact clause",
  "exact language",
  "specific clause",
  "specific language",
  "specific page",
  "specific section",
  "verbatim",
  "quote the",
  "quote from",
  "what does it say",
  "what does the lease say",
  "full text",
  "original text",
  "word for word",
  "actual language",
  "lease language",
  "which page",
  "what page",
  "section number",
  "article number",
  "clause number",
];

export function detectTopicShift(
  message: string,
  attachedDocs: { id: string; filename: string; mode?: string; tenantName?: string | null; propertyAddress?: string | null }[],
  allDocs: DocIndex[],
  contextMode: string
): boolean {
  const msgLower = message.toLowerCase();

  // In portfolio mode (all summaries), always re-arbitrate.
  // The user may be drilling from an overview question into a specific lease
  // that needs full text. The arbitrator (cheap LLM call) decides whether to
  // switch to a specific doc or stay in portfolio mode.
  if (contextMode === "portfolio") {
    return true;
  }

  // If all attached docs are summaries and user asks for detailed info,
  // re-arbitrate so the arbitrator can upgrade the relevant doc to full text
  const allSummaries = attachedDocs.length > 0 && attachedDocs.every((d) => d.mode === "summary");
  if (allSummaries && DETAIL_REQUEST_PHRASES.some((p) => msgLower.includes(p))) {
    return true;
  }

  // Check for explicit shift phrases
  if (TOPIC_SHIFT_PHRASES.some((phrase) => msgLower.includes(phrase))) {
    return true;
  }

  // Check if message mentions a tenant or address NOT in attached docs
  const attachedNames = new Set(
    attachedDocs
      .map((d) => [d.tenantName, d.propertyAddress, d.filename])
      .flat()
      .filter(Boolean)
      .map((n) => n!.toLowerCase())
  );

  for (const doc of allDocs) {
    const isAttached = attachedDocs.some((ad) => ad.id === doc.id);
    if (isAttached) continue;

    // Check if message mentions this unattached doc's tenant or address
    const identifiers = [doc.tenantName, doc.propertyAddress, doc.filename]
      .filter(Boolean)
      .map((s) => s!.toLowerCase());

    for (const identifier of identifiers) {
      // Check for substantial substring match (at least 4 chars to avoid false positives)
      const words = identifier.split(/\s+/).filter((w) => w.length >= 4);
      if (words.some((word) => msgLower.includes(word))) {
        // Make sure this word isn't also in an attached doc
        if (!attachedNames.has(identifier) && !words.some((w) => [...attachedNames].some((an) => an.includes(w)))) {
          return true;
        }
      }
    }
  }

  return false;
}

// --- LLM Arbitrator ---

const ARBITRATOR_PROMPT = `You are a document routing agent for a lease analysis tool. Given the user's question, recent conversation, and a list of available documents, decide which documents to attach for context.

Return a JSON object:
{
  "action": "keep" | "switch" | "add" | "portfolio",
  "documentIds": ["id1"],
  "summaryIds": ["id2"],
  "reason": "brief explanation"
}

Actions:
- "keep": Current attachments are correct (return empty arrays — existing attachments stay)
- "switch": User wants a different document or needs to upgrade a summary to full text (documentIds = doc(s) to attach as full text)
- "add": User wants additional documents alongside current ones
- "portfolio": User wants to compare across all/many leases (put most relevant as full text in documentIds, rest as summaryIds)

Guidelines:
- For questions about a specific lease/tenant/property → attach that ONE document as full text via "switch"
- IMPORTANT: If all current attachments are summaries and the user is asking about a SPECIFIC lease (e.g., "on that lease", "tell me more about...", asking about maintenance/clauses/terms of a specific property), use "switch" to attach that document as full text. Look at the recent conversation to determine which lease the user is referring to.
- For questions requesting exact clauses, specific page references, verbatim language, or deep detail about a lease → that document MUST be in documentIds (full text), not summaryIds
- For broad comparison questions across all/many leases → "portfolio" mode, put the 2-3 most relevant as full text, rest as summaries
- For general portfolio overview questions (rankings, totals, counts) → "portfolio" with all as summaries
- Maximum 3 documents as full text to stay within context limits
- When only one document exists, always use it as full text`;

export async function runArbitrator(
  message: string,
  recentMessages: { role: string; content: string }[],
  currentAttachments: { documentId: string; mode: string }[],
  allDocs: DocIndex[]
): Promise<ArbitrationResult> {
  try {
    // Build compact doc index (~100 tokens per doc)
    const docIndex = allDocs
      .map((d) => {
        const parts = [`ID: ${d.id}`, d.filename];
        if (d.tenantName) parts.push(`Tenant: ${d.tenantName}`);
        if (d.propertyAddress) parts.push(`Address: ${d.propertyAddress}`);
        if (d.monthlyRent) parts.push(`Rent: $${d.monthlyRent}/mo`);
        return parts.join(" | ");
      })
      .join("\n");

    const currentInfo = currentAttachments.length > 0
      ? `Currently attached: ${currentAttachments.map((a) => `${a.documentId} (${a.mode})`).join(", ")}`
      : "No documents currently attached.";

    const conversationContext = recentMessages.length > 0
      ? `Recent conversation:\n${recentMessages.slice(-2).map((m) => `${m.role}: ${m.content}`).join("\n")}`
      : "";

    const response = await client.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 256,
      messages: [
        { role: "system", content: ARBITRATOR_PROMPT },
        {
          role: "user",
          content: `QUESTION: ${message}\n\n${conversationContext}\n\n${currentInfo}\n\nAVAILABLE DOCUMENTS:\n${docIndex}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return fallbackResult(allDocs);
    }

    const result = JSON.parse(content) as ArbitrationResult;

    // Validate document IDs
    const validIds = new Set(allDocs.map((d) => d.id));
    result.documentIds = (result.documentIds || []).filter((id) => validIds.has(id));
    result.summaryIds = (result.summaryIds || []).filter((id) => validIds.has(id));

    // Cap full-text docs at 3
    if (result.documentIds.length > 3) {
      const overflow = result.documentIds.splice(3);
      result.summaryIds.push(...overflow);
    }

    // Remove duplicates between documentIds and summaryIds (full text takes priority)
    const fullSet = new Set(result.documentIds);
    result.summaryIds = result.summaryIds.filter((id) => !fullSet.has(id));

    return result;
  } catch (error) {
    console.error("Arbitrator error (falling back to portfolio):", error);
    return fallbackResult(allDocs);
  }
}

function fallbackResult(allDocs: DocIndex[]): ArbitrationResult {
  // If only 1 doc, attach it full text. Otherwise portfolio mode with all summaries.
  if (allDocs.length === 1) {
    return {
      action: "switch",
      documentIds: [allDocs[0].id],
      summaryIds: [],
      reason: "Fallback: single document",
    };
  }
  return {
    action: "portfolio",
    documentIds: [],
    summaryIds: allDocs.map((d) => d.id),
    reason: "Fallback: portfolio mode",
  };
}

// --- Apply arbitration result to database ---

export async function applyArbitrationResult(
  conversationId: string,
  result: ArbitrationResult
): Promise<void> {
  if (result.action === "keep") {
    return; // No changes needed
  }

  // Determine the new context mode
  const totalDocs = result.documentIds.length + result.summaryIds.length;
  let contextMode: string;
  if (result.action === "portfolio") {
    contextMode = "portfolio";
  } else if (totalDocs > 1) {
    contextMode = "multi";
  } else if (totalDocs === 1) {
    contextMode = "single";
  } else {
    contextMode = "none";
  }

  // Delete existing attachments and insert new ones in a transaction
  await prisma.$transaction(async (tx) => {
    // Remove all current attachments
    await tx.conversationDocument.deleteMany({
      where: { conversationId },
    });

    // Insert new full-text attachments
    for (const docId of result.documentIds) {
      await tx.conversationDocument.create({
        data: {
          conversationId,
          documentId: docId,
          mode: "full",
        },
      });
    }

    // Insert new summary attachments
    for (const docId of result.summaryIds) {
      await tx.conversationDocument.create({
        data: {
          conversationId,
          documentId: docId,
          mode: "summary",
        },
      });
    }

    // Update conversation context mode
    await tx.conversation.update({
      where: { id: conversationId },
      data: { contextMode },
    });
  });
}
