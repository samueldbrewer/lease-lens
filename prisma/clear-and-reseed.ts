import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

const prisma = new PrismaClient();

// Inline the chunker to avoid import path issues in Railway build
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

interface TextChunk {
  content: string;
  chunkIndex: number;
  section: string | null;
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

function chunkDocument(text: string): TextChunk[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const chunks: TextChunk[] = [];
  if (cleaned.length <= CHUNK_SIZE) {
    chunks.push({ content: cleaned, chunkIndex: 0, section: detectSection(cleaned) });
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
      chunks.push({ content: chunkContent, chunkIndex, section: detectSection(chunkContent) });
      chunkIndex++;
    }
    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
    if (end >= cleaned.length) break;
  }
  return chunks;
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
    where: { email: "test@leaselens.com" },
    update: {},
    create: {
      email: "test@leaselens.com",
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

    // Extract text
    const data = await pdf(buffer);
    const text = data.text;
    const pageCount = data.numpages;
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

    // Chunk
    const chunks = chunkDocument(text);
    await prisma.documentChunk.createMany({
      data: chunks.map((chunk) => ({
        documentId: document.id,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        section: chunk.section,
      })),
    });
    console.log(`  ${chunks.length} chunks`);

    // AI extraction
    try {
      const terms = await extractLeaseTerms(text);
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
  console.log("Email: test@leaselens.com");
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
