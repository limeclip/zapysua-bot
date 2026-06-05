import { webhookCallback } from "grammy";
import { bot } from "@/lib/bot";

const handleUpdate = webhookCallback(bot, "std/http");

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "https://web.telegram.org",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const raw = await req.clone().json().catch(() => null);
    if (raw?.message?.text) {
      const text = String(raw.message.text);
      if (text.startsWith("/start")) {
        console.log("[webhook] /start received:", {
          text,
          from: raw.message.from?.id,
          username: raw.message.from?.username,
        });
      }
    }

    const response = await handleUpdate(req);

    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error("[webhook] Помилка обробки:", error);

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
}
