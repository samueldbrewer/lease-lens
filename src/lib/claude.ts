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

export async function* streamChatResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  systemPrompt: string
) {
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
