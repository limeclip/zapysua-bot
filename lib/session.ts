import { session } from "grammy";
import type { SessionData } from "@/types";

export const sessionMiddleware = session({
  initial: (): SessionData => ({}),
  getSessionKey: (ctx) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    if (!chatId || !userId) return undefined;
    return `${chatId}:${userId}`;
  },
});
