import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const document = await prisma.document.findUnique({
      where: { id, userId: session.user.id },
      select: { pdfData: true, filename: true },
    });

    if (!document || !document.pdfData) {
      return NextResponse.json(
        { error: "PDF not found" },
        { status: 404 }
      );
    }

    return new NextResponse(document.pdfData, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${document.filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving PDF:", error);
    return NextResponse.json(
      { error: "Failed to serve PDF" },
      { status: 500 }
    );
  }
}
