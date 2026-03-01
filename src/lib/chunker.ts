import { PageBoundary } from "./pdf";

export interface TextChunk {
  content: string;
  chunkIndex: number;
  section: string | null;
  startPage: number | null;
  endPage: number | null;
}

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

/**
 * Build a mapping from cleaned-text offsets to raw-text offsets.
 * The cleaning collapses \s+ into single spaces, so we track
 * where each cleaned character maps to in the raw text.
 */
function buildOffsetMap(raw: string): number[] {
  const map: number[] = [];
  let i = 0;
  while (i < raw.length) {
    if (/\s/.test(raw[i])) {
      // Whitespace run → single space in cleaned
      map.push(i);
      while (i < raw.length && /\s/.test(raw[i])) i++;
    } else {
      map.push(i);
      i++;
    }
  }
  return map;
}

function getPageForOffset(rawOffset: number, pageBoundaries: PageBoundary[]): number {
  for (const pb of pageBoundaries) {
    if (rawOffset >= pb.startOffset && rawOffset < pb.endOffset) {
      return pb.page;
    }
  }
  // If beyond last boundary, return last page
  return pageBoundaries[pageBoundaries.length - 1]?.page ?? 1;
}

export function chunkDocument(text: string, pageBoundaries?: PageBoundary[]): TextChunk[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const chunks: TextChunk[] = [];

  // Build offset map if we have page boundaries
  const offsetMap = pageBoundaries && pageBoundaries.length > 0
    ? buildOffsetMap(text)
    : null;

  // Account for leading whitespace trim
  const leadingWhitespace = text.length - text.trimStart().length;

  function getPages(cleanedStart: number, cleanedEnd: number): { startPage: number | null; endPage: number | null } {
    if (!offsetMap || !pageBoundaries || pageBoundaries.length === 0) {
      return { startPage: null, endPage: null };
    }

    // Map cleaned offsets back to raw offsets, accounting for trim
    const adjustedStart = Math.min(cleanedStart + (leadingWhitespace > 0 ? 1 : 0), offsetMap.length - 1);
    const adjustedEnd = Math.min(cleanedEnd + (leadingWhitespace > 0 ? 1 : 0), offsetMap.length - 1);

    const rawStart = offsetMap[Math.max(0, adjustedStart)] ?? 0;
    const rawEnd = offsetMap[Math.max(0, adjustedEnd - 1)] ?? rawStart;

    return {
      startPage: getPageForOffset(rawStart, pageBoundaries),
      endPage: getPageForOffset(rawEnd, pageBoundaries),
    };
  }

  if (cleaned.length <= CHUNK_SIZE) {
    const pages = getPages(0, cleaned.length);
    chunks.push({
      content: cleaned,
      chunkIndex: 0,
      section: detectSection(cleaned),
      startPage: pages.startPage,
      endPage: pages.endPage,
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
      const pages = getPages(start, end);
      chunks.push({
        content: chunkContent,
        chunkIndex,
        section: detectSection(chunkContent),
        startPage: pages.startPage,
        endPage: pages.endPage,
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
