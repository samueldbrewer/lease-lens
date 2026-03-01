import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

const prisma = new PrismaClient();

// Inline the chunker to avoid import path issues in Railway build
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

interface PageBoundary {
  page: number;
  startOffset: number;
  endOffset: number;
}

interface TextChunk {
  content: string;
  chunkIndex: number;
  section: string | null;
  startPage: number | null;
  endPage: number | null;
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
];

function detectSection(text: string): string | null {
  for (const [pattern, section] of SECTION_PATTERNS) {
    if (pattern.test(text)) return section;
  }
  return null;
}

function buildOffsetMap(raw: string): number[] {
  const map: number[] = [];
  let i = 0;
  while (i < raw.length) {
    if (/\s/.test(raw[i])) {
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
  return pageBoundaries[pageBoundaries.length - 1]?.page ?? 1;
}

function chunkDocument(text: string, pageBoundaries?: PageBoundary[]): TextChunk[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const chunks: TextChunk[] = [];

  const offsetMap = pageBoundaries && pageBoundaries.length > 0
    ? buildOffsetMap(text)
    : null;

  const leadingWhitespace = text.length - text.trimStart().length;

  function getPages(cleanedStart: number, cleanedEnd: number): { startPage: number | null; endPage: number | null } {
    if (!offsetMap || !pageBoundaries || pageBoundaries.length === 0) {
      return { startPage: null, endPage: null };
    }
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
    chunks.push({ content: cleaned, chunkIndex: 0, section: detectSection(cleaned), startPage: pages.startPage, endPage: pages.endPage });
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
        if (spaceEnd > start) end = spaceEnd;
      }
    } else {
      end = cleaned.length;
    }
    const chunkContent = cleaned.slice(start, end).trim();
    if (chunkContent.length > 0) {
      const pages = getPages(start, end);
      chunks.push({ content: chunkContent, chunkIndex, section: detectSection(chunkContent), startPage: pages.startPage, endPage: pages.endPage });
      chunkIndex++;
    }
    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
    if (end >= cleaned.length) break;
  }
  return chunks;
}

// Inline PDF extraction with page boundary tracking
async function extractTextWithPages(buffer: Buffer): Promise<{ text: string; pageCount: number; pageBoundaries: PageBoundary[] }> {
  const pageTextsCollector: string[] = [];
  const data = await pdf(buffer, {
    pagerender: (pageData) => {
      return pageData.getTextContent().then((textContent) => {
        const pageText = textContent.items.map((item) => item.str).join("");
        pageTextsCollector.push(pageText);
        return pageText;
      });
    },
  });

  const pageBoundaries: PageBoundary[] = [];
  const finalPageTexts = pageTextsCollector.length > 0 ? pageTextsCollector : [data.text];
  let offset = 0;
  for (let i = 0; i < finalPageTexts.length; i++) {
    const pageStart = offset;
    const pageEnd = pageStart + finalPageTexts[i].length;
    pageBoundaries.push({ page: i + 1, startOffset: pageStart, endOffset: pageEnd });
    offset = pageEnd + 2;
  }

  return { text: data.text, pageCount: data.numpages, pageBoundaries };
}

// Inline geocoding with fallback
let lastGeoRequestTime = 0;

async function nominatimSearch(query: string): Promise<{ latitude: number; longitude: number } | null> {
  const now = Date.now();
  const timeSinceLast = now - lastGeoRequestTime;
  if (timeSinceLast < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastGeoRequestTime = Date.now();
  try {
    const params = new URLSearchParams({ q: query, format: "json", limit: "1", countrycodes: "us" });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "LeaseSimple/1.0" },
    });
    if (!response.ok) return null;
    const results = await response.json();
    if (results.length === 0) return null;
    return { latitude: parseFloat(results[0].lat), longitude: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

function extractCityState(address: string): string | null {
  const match = address.match(/([A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)\s*$/);
  if (match) return match[1].trim();
  const match2 = address.match(/([A-Za-z\s]+,\s*[A-Z]{2})\s*$/);
  if (match2) return match2[1].trim();
  const match3 = address.match(/([A-Za-z\s]+,\s*[A-Za-z\s]{4,})\s*$/);
  if (match3) return match3[1].trim();
  return null;
}

function simplifyAddress(address: string): string {
  let simplified = address.replace(/^[^,\d]*[-:]\s*/i, "");
  simplified = simplified.replace(/\s*[-,]?\s*(suite|ste|unit|bldg|building|floor|level|#)\s*\S+/gi, "");
  simplified = simplified.replace(/,\s*,/g, ",").replace(/^\s*,\s*/, "").trim();
  return simplified;
}

async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const result1 = await nominatimSearch(address);
    if (result1) return result1;

    const simplified = simplifyAddress(address);
    if (simplified !== address && simplified.length > 5) {
      const result2 = await nominatimSearch(simplified);
      if (result2) return result2;
    }

    const cityState = extractCityState(address);
    if (cityState) {
      const result3 = await nominatimSearch(cityState);
      if (result3) return result3;
    }

    return null;
  } catch {
    return null;
  }
}

// Inline OpenAI call to avoid tsconfig path issues
async function extractLeaseTerms(documentText: string) {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const truncatedText = documentText.slice(0, 100000);
  const response = await client.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `You are a commercial real estate lease analyst. Extract structured information from the following lease document text.

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

If a field cannot be determined from the document, use null. Be thorough and extract as much as possible.`,
      },
      { role: "user", content: `LEASE DOCUMENT TEXT:\n${truncatedText}` },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Failed to parse lease terms");
  }
}

const TEST_PDFS_DIR = path.join(__dirname, "test-pdfs");

const TEST_PDF_FILES = [
  "Downtown Office Tower - Suite 1500.pdf",
  "Suburban Strip Mall - Unit 4B.pdf",
  "Industrial Warehouse - Building C.pdf",
  "Medical Office - Dr. Chen Practice.pdf",
  "Restaurant Space - The Rustic Table.pdf",
  "Tech Startup Flex Space - Level 3.pdf",
  "Anchor Retail - Big Box Store.pdf",
  "Ground Lease - Gas Station Parcel.pdf",
  "Coworking Sublease - WeSpace Floor 12.pdf",
  "Agricultural Land Lease - Valley Farm.pdf",
];

async function main() {
  console.log("=== Clear & Re-seed with Real PDFs ===\n");

  // Create/get test user
  const passwordHash = await bcrypt.hash("TestPass123!", 12);
  const user = await prisma.user.upsert({
    where: { email: "test@leasesimple.com" },
    update: {},
    create: {
      email: "test@leasesimple.com",
      passwordHash,
      name: "Test User",
    },
  });
  console.log(`Test user: ${user.email} (id: ${user.id})`);

  // Delete old test user documents (cascades to chunks and terms)
  const deleted = await prisma.document.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted ${deleted.count} old documents\n`);

  // Process each PDF through the real pipeline
  for (const filename of TEST_PDF_FILES) {
    const pdfPath = path.join(TEST_PDFS_DIR, filename);
    if (!fs.existsSync(pdfPath)) {
      console.error(`  PDF not found: ${pdfPath}`);
      continue;
    }

    console.log(`Processing: ${filename}`);
    const buffer = fs.readFileSync(pdfPath);

    // Extract text with page boundaries
    const { text, pageCount, pageBoundaries } = await extractTextWithPages(buffer);
    console.log(`  Text: ${text.length} chars, ${pageCount} pages`);

    if (!text || text.trim().length < 50) {
      console.error(`  Insufficient text extracted`);
      continue;
    }

    // Create document with PDF data
    const document = await prisma.document.create({
      data: {
        filename,
        originalText: text,
        pdfData: buffer,
        pageCount,
        status: "processing",
        userId: user.id,
      },
    });

    // Chunk with page boundaries
    const chunks = chunkDocument(text, pageBoundaries);
    await prisma.documentChunk.createMany({
      data: chunks.map((chunk) => ({
        documentId: document.id,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        section: chunk.section,
        startPage: chunk.startPage,
        endPage: chunk.endPage,
      })),
    });
    console.log(`  ${chunks.length} chunks`);

    // AI extraction
    try {
      const terms = await extractLeaseTerms(text);

      // Geocode the property address
      let latitude: number | null = null;
      let longitude: number | null = null;
      if (terms.propertyAddress) {
        try {
          const coords = await geocodeAddress(terms.propertyAddress);
          if (coords) {
            latitude = coords.latitude;
            longitude = coords.longitude;
            console.log(`  Geocoded: ${terms.propertyAddress}`);
          }
        } catch (geoError) {
          console.error(`  Geocoding failed: ${geoError}`);
        }
      }

      await prisma.leaseTerms.create({
        data: {
          documentId: document.id,
          propertyAddress: terms.propertyAddress,
          tenantName: terms.tenantName,
          landlordName: terms.landlordName,
          leaseStart: terms.leaseStart ? new Date(terms.leaseStart) : null,
          leaseEnd: terms.leaseEnd ? new Date(terms.leaseEnd) : null,
          monthlyRent: terms.monthlyRent,
          securityDeposit: terms.securityDeposit,
          leaseType: terms.leaseType,
          squareFootage: terms.squareFootage,
          permittedUse: terms.permittedUse,
          renewalOptions: terms.renewalOptions,
          terminationClauses: terms.terminationClauses,
          maintenanceObligations: terms.maintenanceObligations ?? undefined,
          insuranceRequirements: terms.insuranceRequirements ?? undefined,
          taxObligations: terms.taxObligations,
          camCharges: terms.camCharges,
          escalationClauses: terms.escalationClauses,
          keyProvisions: terms.keyProvisions ?? undefined,
          summary: terms.summary,
          latitude,
          longitude,
        },
      });
      console.log(`  AI extraction complete`);
    } catch (err) {
      console.error(`  AI extraction failed: ${err}`);
    }

    await prisma.document.update({
      where: { id: document.id },
      data: { status: "ready" },
    });
    console.log(`  Done\n`);
  }

  console.log("--- Test Credentials ---");
  console.log("Email: test@leasesimple.com");
  console.log("Password: TestPass123!");
  console.log("------------------------");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
