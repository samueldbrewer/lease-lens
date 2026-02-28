export interface TextChunk {
  content: string;
  chunkIndex: number;
  section: string | null;
}

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

export function chunkDocument(text: string): TextChunk[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const chunks: TextChunk[] = [];

  if (cleaned.length <= CHUNK_SIZE) {
    chunks.push({
      content: cleaned,
      chunkIndex: 0,
      section: detectSection(cleaned),
    });
    return chunks;
  }

  let start = 0;
  let chunkIndex = 0;

  while (start < cleaned.length) {
    let end = start + CHUNK_SIZE;

    if (end < cleaned.length) {
      const sentenceEnd = cleaned.lastIndexOf(". ", end);
      if (sentenceEnd > start + CHUNK_SIZE / 2) {
        end = sentenceEnd + 1;
      } else {
        const spaceEnd = cleaned.lastIndexOf(" ", end);
        if (spaceEnd > start) {
          end = spaceEnd;
        }
      }
    } else {
      end = cleaned.length;
    }

    const chunkContent = cleaned.slice(start, end).trim();
    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        chunkIndex,
        section: detectSection(chunkContent),
      });
      chunkIndex++;
    }

    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
    if (end >= cleaned.length) break;
  }

  return chunks;
}

const SECTION_PATTERNS: [RegExp, string][] = [
  [/\b(rent|base rent|monthly rent|rental)\b/i, "Rent"],
  [/\b(security deposit|deposit)\b/i, "Security Deposit"],
  [/\b(term|lease term|commencement|expiration)\b/i, "Lease Term"],
  [/\b(maintenance|repair|upkeep)\b/i, "Maintenance"],
  [/\b(insurance|liability|coverage|indemnif)/i, "Insurance"],
  [/\b(tax|taxes|property tax|real estate tax)\b/i, "Taxes"],
  [/\b(cam|common area|operating expense)\b/i, "CAM Charges"],
  [/\b(renewal|option to renew|extension)\b/i, "Renewal"],
  [/\b(terminat|early termination|default)\b/i, "Termination"],
  [/\b(permitted use|use clause|exclusive use)\b/i, "Permitted Use"],
  [/\b(assignment|subletting|sublet|sublease)\b/i, "Assignment & Subletting"],
  [/\b(escalat|increase|adjustment|cpi)\b/i, "Escalation"],
  [/\b(sign|signage|exterior sign)\b/i, "Signage"],
  [/\b(parking|vehicle|garage)\b/i, "Parking"],
  [/\b(hazard|environmental|asbestos|mold)\b/i, "Environmental"],
  [/\b(force majeure|act of god)\b/i, "Force Majeure"],
  [/\b(arbitrat|mediat|dispute|litigation)\b/i, "Dispute Resolution"],
];

function detectSection(text: string): string | null {
  for (const [pattern, section] of SECTION_PATTERNS) {
    if (pattern.test(text)) {
      return section;
    }
  }
  return null;
}
