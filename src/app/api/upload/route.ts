import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTextFromPDF } from "@/lib/pdf";
import { extractLeaseTerms } from "@/lib/claude";
import { chunkDocument } from "@/lib/chunker";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        results.push({
          filename: file.name,
          status: "error",
          error: "Only PDF files are supported",
        });
        continue;
      }

      const document = await prisma.document.create({
        data: {
          filename: file.name,
          status: "processing",
          userId,
        },
      });

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const { text, pageCount } = await extractTextFromPDF(buffer);

        if (!text || text.trim().length < 50) {
          await prisma.document.update({
            where: { id: document.id },
            data: {
              pdfData: buffer,
              status: "error",
              errorMessage:
                "Could not extract sufficient text from PDF. The file may be scanned or image-based.",
            },
          });
          results.push({
            filename: file.name,
            id: document.id,
            status: "error",
            error: "Could not extract text",
          });
          continue;
        }

        await prisma.document.update({
          where: { id: document.id },
          data: { originalText: text, pageCount, pdfData: buffer },
        });

        const chunks = chunkDocument(text);
        await prisma.documentChunk.createMany({
          data: chunks.map((chunk) => ({
            documentId: document.id,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            section: chunk.section,
          })),
        });

        let leaseTerms;
        try {
          leaseTerms = await extractLeaseTerms(text);
        } catch (extractionError) {
          console.error("Lease extraction error:", extractionError);
          await prisma.document.update({
            where: { id: document.id },
            data: { status: "ready" },
          });
          results.push({
            filename: file.name,
            id: document.id,
            status: "ready",
            note: "Text extracted but structured analysis failed",
          });
          continue;
        }

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

        await prisma.document.update({
          where: { id: document.id },
          data: { status: "ready" },
        });

        results.push({
          filename: file.name,
          id: document.id,
          status: "ready",
        });
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        await prisma.document.update({
          where: { id: document.id },
          data: {
            status: "error",
            errorMessage:
              error instanceof Error
                ? error.message
                : "Unknown processing error",
          },
        });
        results.push({
          filename: file.name,
          id: document.id,
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Unknown processing error",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
