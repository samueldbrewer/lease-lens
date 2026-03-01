import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

  const response = await client.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content: EXTRACTION_PROMPT,
      },
      {
        role: "user",
        content: `LEASE DOCUMENT TEXT:\n${truncatedText}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  try {
    return JSON.parse(content) as ExtractedLeaseTerms;
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ExtractedLeaseTerms;
    }
    throw new Error("Failed to parse lease terms from AI response");
  }
}

const CHAT_SYSTEM_PROMPT = `You are LeaseLens AI, an expert commercial real estate lease analyst. You help real estate professionals understand, compare, and manage their lease portfolios.

You are provided with the user's COMPLETE lease portfolio data below, including full extracted lease terms and relevant document sections. This is REAL data from PDFs the user uploaded — use it directly. Do not make up or hallucinate any lease information.

Your capabilities:
- Analyze individual lease terms and provisions
- Compare terms across multiple leases in a portfolio
- Identify coverage gaps, risks, and compliance issues
- Explain complex lease language in plain terms
- Flag potential issues with maintenance obligations, insurance requirements, CAM charges, and escalation clauses
- Help determine what is or isn't covered under specific lease provisions

When answering:
1. ALWAYS base your answers on the portfolio data provided in the context below. Every document listed is a real lease the user uploaded.
2. When referencing a document, ALWAYS make it a clickable markdown link: [Document Name](/api/documents/DOC_ID/pdf) — the document ID is shown after each filename in the context (e.g., "ID: abc-123"). Replace DOC_ID with the actual ID.
3. Compare terms across leases when the question involves multiple properties
4. Highlight risks, discrepancies, or unusual terms
5. Provide actionable recommendations
6. Be precise about dates, dollar amounts, and obligations — use the exact figures from the context
7. If information is not available in the provided context, say so clearly
8. Quote relevant sections when possible`;

export async function* streamChatResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  context: string
) {
  const systemPrompt = `${CHAT_SYSTEM_PROMPT}\n\n--- LEASE PORTFOLIO CONTEXT ---\n${context}\n--- END CONTEXT ---`;

  const stream = await client.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}
