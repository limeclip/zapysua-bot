import { NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/ai";
import { executeAiAction } from "@/lib/ai-tools";
import { badRequest, serverError } from "@/lib/api/response";
import { getTelegramUserFromRequest } from "@/lib/telegram/auth";
import type { AiChatResponse, AiConversationMessage } from "@/types/ai";

type ChatRequestBody = {
  masterId?: string;
  message?: string;
  history?: AiConversationMessage[];
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const masterId = String(body.masterId ?? "").trim();
    const message = String(body.message ?? "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!masterId) {
      return badRequest("masterId обов'язковий");
    }
    if (!message) {
      return badRequest("message обов'язковий");
    }

    const telegramAuth = getTelegramUserFromRequest(request);
    const clientTelegramId = telegramAuth?.user.id?.toString();

    const aiResponse = await generateAIResponse(
      masterId,
      message,
      history,
      clientTelegramId,
    );

    const result: AiChatResponse = {
      reply: aiResponse.reply,
      action: aiResponse.action,
    };

    if (aiResponse.action) {
      try {
        const actionResult = await executeAiAction({
          masterId,
          action: aiResponse.action,
          clientTelegramId: telegramAuth?.user.id,
          clientName: telegramAuth?.user.first_name,
        });
        result.actionResult = actionResult.message;
        if (actionResult.pendingBooking) {
          result.pendingBooking = actionResult.pendingBooking;
        }
      } catch (actionError) {
        console.error("[api/ai/chat] executeAiAction:", actionError);
        result.actionResult =
          "Не вдалося виконати дію. Спробуйте пізніше.";
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/ai/chat POST]", error);
    return serverError("Не вдалося отримати відповідь AI");
  }
}
