import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { extractTextFromPDF } from "../src/lib/pdf";
import { chunkDocument } from "../src/lib/chunker";
import { extractLeaseTerms } from "../src/lib/claude";

const prisma = new PrismaClient();

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
  // Create test user
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

  console.log(`Created test user: ${user.email} (id: ${user.id})`);

  for (const filename of TEST_PDF_FILES) {
    // Check if document already exists for this user
    const existing = await prisma.document.findFirst({
      where: { filename, userId: user.id },
    });
    if (existing) {
      console.log(`  Skipping (exists): ${filename}`);
      continue;
    }

    const pdfPath = path.join(TEST_PDFS_DIR, filename);
    if (!fs.existsSync(pdfPath)) {
      console.error(`  PDF not found: ${pdfPath}`);
      console.error(`  Run 'npx tsx prisma/generate-test-pdfs.ts' first.`);
      continue;
    }

    console.log(`  Processing: ${filename}`);
    const buffer = fs.readFileSync(pdfPath);

    // Extract text using the real PDF pipeline
    const { text, pageCount } = await extractTextFromPDF(buffer);
    console.log(`    Extracted ${text.length} chars, ${pageCount} pages`);

    if (!text || text.trim().length < 50) {
      console.error(`    Insufficient text extracted from ${filename}`);
      continue;
    }

    // Create the document with the real PDF data
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

    // Chunk using the real chunker
    const chunks = chunkDocument(text);
    await prisma.documentChunk.createMany({
      data: chunks.map((chunk) => ({
        documentId: document.id,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        section: chunk.section,
      })),
    });
    console.log(`    Created ${chunks.length} chunks`);

    // Extract lease terms using AI
    try {
      const leaseTerms = await extractLeaseTerms(text);
      await prisma.leaseTerms.create({
        data: {
          documentId: document.id,
          propertyAddress: leaseTerms.propertyAddress,
          tenantName: leaseTerms.tenantName,
          landlordName: leaseTerms.landlordName,
          leaseStart: leaseTerms.leaseStart
            ? new Date(leaseTerms.leaseStart)
            : null,
          leaseEnd: leaseTerms.leaseEnd
            ? new Date(leaseTerms.leaseEnd)
            : null,
          monthlyRent: leaseTerms.monthlyRent,
          securityDeposit: leaseTerms.securityDeposit,
          leaseType: leaseTerms.leaseType,
          squareFootage: leaseTerms.squareFootage,
          permittedUse: leaseTerms.permittedUse,
          renewalOptions: leaseTerms.renewalOptions,
          terminationClauses: leaseTerms.terminationClauses,
          maintenanceObligations: leaseTerms.maintenanceObligations ?? undefined,
          insuranceRequirements: leaseTerms.insuranceRequirements ?? undefined,
          taxObligations: leaseTerms.taxObligations,
          camCharges: leaseTerms.camCharges,
          escalationClauses: leaseTerms.escalationClauses,
          keyProvisions: leaseTerms.keyProvisions ?? undefined,
          summary: leaseTerms.summary,
        },
      });
      console.log(`    Extracted lease terms via AI`);
    } catch (extractionError) {
      console.error(`    AI extraction failed: ${extractionError}`);
      // Still mark as ready - text and chunks are available
    }

    await prisma.document.update({
      where: { id: document.id },
      data: { status: "ready" },
    });

    console.log(`    Done: ${filename}`);
  }

  console.log("\n--- Test Credentials ---");
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
