import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import {
  buildDefaultSystemPrompt,
  getMasterContext,
} from "@/lib/ai-context";
import { parseAiResponse } from "@/lib/ai-tools";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AiConversationMessage, AiResponse } from "@/types/ai";

const LLM_ERROR_REPLY = "Сталася помилка. Спробуйте пізніше.";

const FALLBACK_REPLY =
  "Вибач, зараз я не можу відповісти. Будь ласка, спробуй пізніше або звернись безпосередньо до майстра.";

const MAX_HISTORY = 10;

type AiProvider = "gemini" | "openai";

function getPreferredProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "openai") return "openai";
  return "gemini";
}

function trimHistory(
  history: AiConversationMessage[],
): AiConversationMessage[] {
  return history.slice(-MAX_HISTORY);
}

export async function buildSystemPrompt(
  masterId: string,
  tone?: string,
  clientTelegramId?: string,
): Promise<string> {
  const context = await getMasterContext(masterId, clientTelegramId);
  if (!context) {
    throw new Error("Майстра не знайдено");
  }

  const customPrompt = context.aiSettings.system_prompt?.trim();
  if (customPrompt) {
    return customPrompt;
  }

  return buildDefaultSystemPrompt(context, tone);
}

async function callGemini(
  systemPrompt: string,
  history: AiConversationMessage[],
  userMessage: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY не встановлено");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  const chat = model.startChat({
    history: history.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
  });

  const result = await chat.sendMessage(userMessage);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Порожня відповідь Gemini");
  }
  return text.trim();
}

async function callOpenAI(
  systemPrompt: string,
  history: AiConversationMessage[],
  userMessage: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY не встановлено");
  }

  const openai = new OpenAI({ apiKey });
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map(
      (message): OpenAI.Chat.ChatCompletionMessageParam => ({
        role: message.role,
        content: message.content,
      }),
    ),
    { role: "user", content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content;
  if (!text?.trim()) {
    throw new Error("Порожня відповідь OpenAI");
  }
  return text.trim();
}

async function callLlm(
  provider: AiProvider,
  systemPrompt: string,
  history: AiConversationMessage[],
  userMessage: string,
): Promise<string> {
  if (provider === "openai") {
    return callOpenAI(systemPrompt, history, userMessage);
  }
  return callGemini(systemPrompt, history, userMessage);
}

async function logAiRequest(params: {
  masterId: string;
  clientTelegramId?: string;
  request: string;
  response: string;
}): Promise<void> {
  try {
    await supabaseAdmin.from("ai_logs").insert({
      master_id: params.masterId,
      client_telegram_id: params.clientTelegramId
        ? Number(params.clientTelegramId)
        : null,
      request: params.request,
      response: params.response,
    });
  } catch (error) {
    console.error("[ai] logAiRequest:", error);
  }
}

export async function generateAIResponse(
  masterId: string,
  userMessage: string,
  conversationHistory: AiConversationMessage[] = [],
  clientTelegramId?: string,
): Promise<AiResponse> {
  const history = trimHistory(conversationHistory);
  const primary = getPreferredProvider();
  const fallback: AiProvider = primary === "gemini" ? "openai" : "gemini";

  let systemPrompt: string;
  try {
    systemPrompt = await buildSystemPrompt(
      masterId,
      undefined,
      clientTelegramId,
    );
  } catch (error) {
    console.error("[ai] buildSystemPrompt:", error);
    return { reply: FALLBACK_REPLY };
  }

  let rawText: string | null = null;

  for (const provider of [primary, fallback]) {
    try {
      rawText = await callLlm(provider, systemPrompt, history, userMessage);
      break;
    } catch (error) {
      console.error(`[ai] ${provider} error:`, error);
    }
  }

  if (!rawText) {
    await logAiRequest({
      masterId,
      clientTelegramId,
      request: userMessage,
      response: LLM_ERROR_REPLY,
    });
    return { reply: LLM_ERROR_REPLY };
  }

  try {
    const parsed = parseAiResponse(rawText);

    await logAiRequest({
      masterId,
      clientTelegramId,
      request: userMessage,
      response: JSON.stringify(parsed),
    });

    return parsed;
  } catch (error) {
    console.error("[ai] parseAiResponse:", error);
    return { reply: LLM_ERROR_REPLY };
  }
}

export { FALLBACK_REPLY, LLM_ERROR_REPLY, MAX_HISTORY };
