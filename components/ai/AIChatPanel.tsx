"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, HelpCircle, List, Loader2, Notebook, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { AiChatResponse, AiConversationMessage } from "@/types/ai";

type ChatMessage = AiConversationMessage & {
  id: string;
};

type AIChatPanelProps = {
  masterId: string;
  businessName: string;
  onClose?: () => void;
};

const QUICK_ACTIONS = [
  {
    id: "book",
    label: "Записатися",
    icon: Calendar,
    message:
      "Хочу записатися на послугу. Допоможи мені обрати послугу, дату та час.",
  },
  {
    id: "services",
    label: "Послуги",
    icon: List,
    message: "Покажи послуги та ціни.",
  },
  {
    id: "bookings",
    label: "Мої записи",
    icon: Notebook,
    message: "Покажи мої майбутні записи.",
  },
  {
    id: "help",
    label: "Допомога",
    icon: HelpCircle,
    message: "Що ти вмієш робити?",
  },
] as const;

function buildWelcomeMessage(businessName: string): string {
  return (
    `Привіт! Я AI-адміністратор студії «${businessName}».\n\n` +
    `Я можу допомогти тобі:\n` +
    `• Записатися на послугу\n` +
    `• Розповісти про ціни та послуги\n` +
    `• Показати твої записи\n` +
    `• Перенести або скасувати запис\n\n` +
    `Просто напиши мені, що тобі потрібно, або скористайся кнопками нижче.`
  );
}

function createMessage(
  role: AiConversationMessage["role"],
  content: string,
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
  };
}

function getStorageKey(masterId: string): string {
  return `zapysua-ai-chat-${masterId}`;
}

function loadStoredMessages(masterId: string): ChatMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getStorageKey(masterId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveMessages(masterId: string, messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(masterId), JSON.stringify(messages));
  } catch {
    // ignore quota errors
  }
}

export function AIChatPanel({
  masterId,
  businessName,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = loadStoredMessages(masterId);
    if (stored && stored.length > 0) {
      setMessages(stored);
    } else {
      setMessages([
        createMessage("assistant", buildWelcomeMessage(businessName)),
      ]);
    }
    setInitialized(true);
  }, [masterId, businessName]);

  useEffect(() => {
    if (!initialized) return;
    saveMessages(masterId, messages);
  }, [masterId, messages, initialized]);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMessage = createMessage("user", trimmed);
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10)
        .map(({ role, content }) => ({ role, content }));

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);

      try {
        const response = await apiFetch<AiChatResponse>("/api/ai/chat", {
          method: "POST",
          body: JSON.stringify({
            masterId,
            message: trimmed,
            history,
          }),
        });

        let assistantText = response.reply;
        if (response.actionResult) {
          assistantText = assistantText
            ? `${assistantText}\n\n${response.actionResult}`
            : response.actionResult;
        }

        setMessages((prev) => [
          ...prev,
          createMessage("assistant", assistantText || "Готово!"),
        ]);
      } catch (error) {
        const errorText =
          error instanceof Error
            ? error.message
            : "Вибач, зараз я не можу відповісти. Спробуй пізніше.";
        setMessages((prev) => [
          ...prev,
          createMessage("assistant", errorText),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, masterId, messages],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const showQuickActions =
    messages.length === 1 && messages[0]?.role === "assistant";

  return (
    <div className="flex h-[calc(100%-4rem)] min-h-0 flex-col">
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
              message.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto bg-muted text-foreground",
            )}
          >
            {message.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Думаю…
          </div>
        )}
      </div>

      {showQuickActions && (
        <div className="grid grid-cols-2 gap-2 px-4 pb-2">
          {QUICK_ACTIONS.map(({ id, label, icon: Icon, message }) => (
            <Button
              key={id}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto justify-start gap-2 py-2"
              disabled={loading}
              onClick={() => void sendMessage(message)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 border-t border-border p-4"
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Напишіть повідомлення…"
          rows={1}
          className="min-h-[44px] max-h-32 resize-none"
          disabled={loading}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage(input);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={loading || !input.trim()}
          aria-label="Надіслати"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
