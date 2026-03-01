import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        filename: true,
        status: true,
        pageCount: true,
        createdAt: true,
        updatedAt: true,
        errorMessage: true,
        leaseTerms: {
          select: {
            id: true,
            propertyAddress: true,
            tenantName: true,
            landlordName: true,
            leaseStart: true,
            leaseEnd: true,
            monthlyRent: true,
            securityDeposit: true,
            leaseType: true,
            squareFootage: true,
            permittedUse: true,
            renewalOptions: true,
            terminationClauses: true,
            maintenanceObligations: true,
            insuranceRequirements: true,
            taxObligations: true,
            camCharges: true,
            escalationClauses: true,
            keyProvisions: true,
            summary: true,
            latitude: true,
            longitude: true,
          },
        },
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
