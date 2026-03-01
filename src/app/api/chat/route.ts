import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { streamChatResponse, triageQuery } from "@/lib/claude";
import { buildChatContext, fetchDeepReadPages } from "@/lib/search";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = session.user.id;

    const { message, conversationId } = await request.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, userId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 20,
          },
        },
      });
    }

    if (!conversation) {
      const title =
        message.length > 60 ? message.slice(0, 57) + "..." : message;
      conversation = await prisma.conversation.create({
        data: { title, userId },
        include: { messages: true },
      });
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    const previousMessages = conversation.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    previousMessages.push({ role: "user", content: message });

    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const convId = conversation!.id;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "conversation_id", id: convId })}\n\n`
            )
          );

          // Status: analyzing
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "status", message: "Analyzing your question..." })}\n\n`
            )
          );

          const context = await buildChatContext(message, userId);

          // Triage: decide if deep read is needed
          const triage = await triageQuery(message, context);
          let enrichedContext = context;

          if (!triage.sufficient && triage.reads && triage.reads.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "status", message: "Reading lease documents for details..." })}\n\n`
              )
            );

            const deepReadText = await fetchDeepReadPages(triage.reads, userId);
            enrichedContext = context + deepReadText;
          }

          // Clear status
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "status", message: "" })}\n\n`
            )
          );

          for await (const text of streamChatResponse(
            previousMessages,
            enrichedContext
          )) {
            fullResponse += text;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content: text })}\n\n`
              )
            );
          }

          await prisma.message.create({
            data: {
              conversationId: convId,
              role: "assistant",
              content: fullResponse,
            },
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done" })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "An error occurred" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
