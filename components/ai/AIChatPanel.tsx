"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Calendar,
  HelpCircle,
  List,
  Loader2,
  MoreVertical,
  Notebook,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { AiChatResponse, AiConversationMessage } from "@/types/ai";

type ChatMessage = AiConversationMessage & {
  id: string;
  showQuickActions?: boolean;
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

const LEGACY_STORAGE_PREFIX = "zapysua-ai-chat-";

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
  options?: { showQuickActions?: boolean },
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    showQuickActions: options?.showQuickActions,
  };
}

function createWelcomeMessage(businessName: string): ChatMessage {
  return createMessage("assistant", buildWelcomeMessage(businessName), {
    showQuickActions: true,
  });
}

function getStorageKey(masterId: string): string {
  return `chat_history_${masterId}`;
}

function loadStoredMessages(masterId: string): ChatMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const keys = [getStorageKey(masterId), `${LEGACY_STORAGE_PREFIX}${masterId}`];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function saveMessages(masterId: string, messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(masterId), JSON.stringify(messages));
    localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}${masterId}`);
  } catch {
    // ignore quota errors
  }
}

function ensureWelcomeMessage(
  messages: ChatMessage[],
  businessName: string,
): ChatMessage[] {
  if (messages.length === 0) {
    return [createWelcomeMessage(businessName)];
  }

  const first = messages[0];
  if (first.role === "assistant" && first.showQuickActions) {
    return messages;
  }

  return [createWelcomeMessage(businessName), ...messages];
}

function ClearHistoryDialog({
  open,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="clear-chat-title"
    >
      <Card className="w-full max-w-sm animate-in fade-in p-5">
        <h2
          id="clear-chat-title"
          className="text-lg font-semibold text-foreground"
        >
          Очистити історію чату?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Усі повідомлення та логи AI будуть видалені. Привітання з кнопками
          з&apos;явиться знову.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Очищення…
              </>
            ) : (
              "Очистити"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onCancel}
          >
            Скасувати
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function AIChatPanel({
  masterId,
  businessName,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = loadStoredMessages(masterId);
    if (stored) {
      setMessages(ensureWelcomeMessage(stored, businessName));
    } else {
      setMessages([createWelcomeMessage(businessName)]);
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

  const handleClearHistory = useCallback(async () => {
    setClearing(true);
    try {
      await apiFetch("/api/ai/clear-history", {
        method: "POST",
        body: JSON.stringify({ masterId }),
      });
    } catch {
      // local reset still proceeds if API fails
    } finally {
      localStorage.removeItem(getStorageKey(masterId));
      localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}${masterId}`);
      setMessages([createWelcomeMessage(businessName)]);
      setClearing(false);
      setClearDialogOpen(false);
    }
  }, [masterId, businessName]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const canClearHistory = messages.length > 0;

  return (
    <div className="flex h-[calc(100%-4rem)] min-h-0 flex-col">
      <div className="flex items-center justify-end border-b border-border px-4 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Меню чату"
              disabled={loading || clearing}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={!canClearHistory}
              onClick={() => setClearDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Очистити історію
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
            {message.showQuickActions && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                {QUICK_ACTIONS.map(({ id, label, icon: Icon, message: actionMessage }) => (
                  <Button
                    key={id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto justify-start gap-2 bg-background py-2 text-foreground"
                    disabled={loading}
                    onClick={() => void sendMessage(actionMessage)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Думаю…
          </div>
        )}
      </div>

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

      <ClearHistoryDialog
        open={clearDialogOpen}
        loading={clearing}
        onConfirm={() => void handleClearHistory()}
        onCancel={() => setClearDialogOpen(false)}
      />
    </div>
  );
}
