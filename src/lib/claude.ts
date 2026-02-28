import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ExtractedLeaseTerms {
  propertyAddress: string | null;
  tenantName: string | null;
  landlordName: string | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  monthlyRent: number | null;
  securityDeposit: number | null;
  leaseType: string | null;
  squareFootage: number | null;
  permittedUse: string | null;
  renewalOptions: string | null;
  terminationClauses: string | null;
  maintenanceObligations: { tenant: string[]; landlord: string[] } | null;
  insuranceRequirements: {
    types: string[];
    minimumCoverage: string;
  } | null;
  taxObligations: string | null;
  camCharges: string | null;
  escalationClauses: string | null;
  keyProvisions: string[] | null;
  summary: string | null;
}

const EXTRACTION_PROMPT = `You are a commercial real estate lease analyst. Extract structured information from the following lease document text.

Return ONLY a valid JSON object (no markdown, no code fences) with these fields:
- propertyAddress: string or null
- tenantName: string or null
- landlordName: string or null
- leaseStart: string (YYYY-MM-DD) or null
- leaseEnd: string (YYYY-MM-DD) or null
- monthlyRent: number or null
- securityDeposit: number or null
- leaseType: string (NNN, Gross, Modified Gross, Ground, Percentage, etc.) or null
- squareFootage: number or null
- permittedUse: string or null
- renewalOptions: string (description of renewal terms) or null
- terminationClauses: string (description of termination provisions) or null
- maintenanceObligations: { tenant: string[], landlord: string[] } or null
- insuranceRequirements: { types: string[], minimumCoverage: string } or null
- taxObligations: string or null
- camCharges: string (CAM/common area maintenance details) or null
- escalationClauses: string or null
- keyProvisions: string[] (list of notable provisions, exclusions, special terms) or null
- summary: string (2-3 sentence summary of the lease) or null

If a field cannot be determined from the document, use null. Be thorough and extract as much as possible.`;

export async function extractLeaseTerms(
  documentText: string
): Promise<ExtractedLeaseTerms> {
  const truncatedText = documentText.slice(0, 100000);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nLEASE DOCUMENT TEXT:\n${truncatedText}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  try {
    return JSON.parse(content.text) as ExtractedLeaseTerms;
  } catch {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ExtractedLeaseTerms;
    }
    throw new Error("Failed to parse lease terms from Claude response");
  }
}

const CHAT_SYSTEM_PROMPT = `You are LeaseLens AI, an expert commercial real estate lease analyst. You help real estate professionals understand, compare, and manage their lease portfolios.

Your capabilities:
- Analyze individual lease terms and provisions
- Compare terms across multiple leases in a portfolio
- Identify coverage gaps, risks, and compliance issues
- Explain complex lease language in plain terms
- Flag potential issues with maintenance obligations, insurance requirements, CAM charges, and escalation clauses
- Help determine what is or isn't covered under specific lease provisions

When answering:
1. Always reference specific documents by name and quote relevant sections when possible
2. Compare terms across leases when the question involves multiple properties
3. Highlight risks, discrepancies, or unusual terms
4. Provide actionable recommendations
5. Be precise about dates, dollar amounts, and obligations
6. If information is not available in the provided context, say so clearly

You are given context from the user's lease portfolio including structured lease terms and relevant document sections.`;

export async function* streamChatResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  context: string
) {
  const systemPrompt = `${CHAT_SYSTEM_PROMPT}\n\n--- LEASE PORTFOLIO CONTEXT ---\n${context}\n--- END CONTEXT ---`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
