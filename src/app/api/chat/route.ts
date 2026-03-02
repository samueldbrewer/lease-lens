import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { streamChatResponse } from "@/lib/claude";
import { buildConversationContext, fitDocumentsInBudget, trimMessageHistory, estimateTokens } from "@/lib/context";
import { detectTopicShift, runArbitrator, applyArbitrationResult } from "@/lib/arbitrator";
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

    // Load or create conversation with documents relation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, userId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 20,
          },
          documents: {
            include: {
              document: {
                select: {
                  id: true,
                  filename: true,
                  leaseTerms: {
                    select: { tenantName: true, propertyAddress: true },
                  },
                },
              },
            },
          },
        },
      });
    }

    if (!conversation) {
      const title =
        message.length > 60 ? message.slice(0, 57) + "..." : message;
      conversation = await prisma.conversation.create({
        data: { title, userId },
        include: {
          messages: true,
          documents: {
            include: {
              document: {
                select: {
                  id: true,
                  filename: true,
                  leaseTerms: {
                    select: { tenantName: true, propertyAddress: true },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // Build message history
    const previousMessages = conversation.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    previousMessages.push({ role: "user" as const, content: message });

    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const convId = conversation!.id;

          // Emit conversation ID
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "conversation_id", id: convId })}\n\n`
            )
          );

          // --- ARBITRATION PHASE ---
          const hasAttachedDocs = conversation!.documents.length > 0;

          // Load all user docs for arbitrator
          const allDocs = await prisma.document.findMany({
            where: { userId, status: "ready" },
            select: {
              id: true,
              filename: true,
              leaseTerms: {
                select: {
                  tenantName: true,
                  propertyAddress: true,
                  monthlyRent: true,
                },
              },
            },
          });

          const docIndex = allDocs.map((d) => ({
            id: d.id,
            filename: d.filename,
            tenantName: d.leaseTerms?.tenantName ?? null,
            propertyAddress: d.leaseTerms?.propertyAddress ?? null,
            monthlyRent: d.leaseTerms?.monthlyRent ? Number(d.leaseTerms.monthlyRent) : null,
          }));

          let needsArbitration = false;

          if (!hasAttachedDocs) {
            // First message — always arbitrate
            needsArbitration = true;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "status", message: "Analyzing your question..." })}\n\n`
              )
            );
          } else {
            // Check for topic shift or depth shift (summary → full text needed)
            const attachedDocInfo = conversation!.documents.map((cd) => ({
              id: cd.document.id,
              filename: cd.document.filename,
              mode: cd.mode,
              tenantName: cd.document.leaseTerms?.tenantName,
              propertyAddress: cd.document.leaseTerms?.propertyAddress,
            }));

            const shifted = detectTopicShift(message, attachedDocInfo, docIndex, conversation!.contextMode);

            if (shifted) {
              needsArbitration = true;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "status", message: "Switching context..." })}\n\n`
                )
              );
            }
          }

          if (needsArbitration && docIndex.length > 0) {
            const currentAttachments = conversation!.documents.map((cd) => ({
              documentId: cd.document.id,
              mode: cd.mode,
            }));

            // Include enough recent messages for the arbitrator to understand context
            // (e.g., the assistant's previous answer names the specific lease)
            const recentMsgs = previousMessages.slice(-5).map((m) => ({
              role: m.role,
              content: m.content.slice(0, 500), // truncate long responses for the arbitrator
            }));

            const result = await runArbitrator(
              message,
              recentMsgs,
              currentAttachments,
              docIndex
            );

            // Fit within token budget
            const { fullIds, summaryIds } = await fitDocumentsInBudget(
              result.documentIds,
              result.summaryIds,
              userId
            );

            result.documentIds = fullIds;
            result.summaryIds = summaryIds;

            await applyArbitrationResult(convId, result);
          }

          // --- CONTEXT PHASE ---
          const { systemPrompt, tokenEstimate } = await buildConversationContext(
            convId,
            userId
          );

          // Trim message history to leave room for system prompt + output
          const msgBudget = 400000 - tokenEstimate - 8000; // reserve for output
          const trimmedMessages = trimMessageHistory(
            previousMessages,
            Math.max(msgBudget, 10000)
          );

          // Load updated conversation documents for context event
          const updatedDocs = await prisma.conversationDocument.findMany({
            where: { conversationId: convId },
            include: {
              document: { select: { id: true, filename: true } },
            },
          });

          const contextMode = (
            await prisma.conversation.findUnique({
              where: { id: convId },
              select: { contextMode: true },
            })
          )?.contextMode || "none";

          // Emit context event so frontend knows what's attached
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "context",
                documents: updatedDocs.map((cd) => ({
                  id: cd.document.id,
                  filename: cd.document.filename,
                  mode: cd.mode,
                })),
                contextMode,
              })}\n\n`
            )
          );

          // Clear status
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "status", message: "" })}\n\n`
            )
          );

          // --- STREAM PHASE ---
          for await (const text of streamChatResponse(
            trimmedMessages,
            systemPrompt
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
