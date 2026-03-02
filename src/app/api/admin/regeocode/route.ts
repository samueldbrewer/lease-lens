import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { geocodeAddress } from "@/lib/geocode";
import { auth } from "@/lib/auth";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all lease terms for this user that are missing coordinates
    const termsToGeocode = await prisma.leaseTerms.findMany({
      where: {
        document: { userId: session.user.id },
        propertyAddress: { not: null },
        latitude: null,
      },
      select: {
        id: true,
        propertyAddress: true,
        documentId: true,
        document: { select: { filename: true } },
      },
    });

    const results: { filename: string; address: string; success: boolean }[] = [];

    for (const term of termsToGeocode) {
      if (!term.propertyAddress) continue;

      try {
        const coords = await geocodeAddress(term.propertyAddress);
        if (coords) {
          await prisma.leaseTerms.update({
            where: { id: term.id },
            data: {
              latitude: coords.latitude,
              longitude: coords.longitude,
            },
          });
          results.push({
            filename: term.document.filename,
            address: term.propertyAddress,
            success: true,
          });
        } else {
          results.push({
            filename: term.document.filename,
            address: term.propertyAddress,
            success: false,
          });
        }
      } catch (error) {
        console.error(`Geocode failed for ${term.propertyAddress}:`, error);
        results.push({
          filename: term.document.filename,
          address: term.propertyAddress,
          success: false,
        });
      }
    }

    return NextResponse.json({
      total: termsToGeocode.length,
      geocoded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    console.error("Regeocode error:", error);
    return NextResponse.json(
      { error: "Failed to regeocode" },
      { status: 500 }
    );
  }
}
