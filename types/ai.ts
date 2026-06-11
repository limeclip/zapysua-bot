export type AiConversationRole = "user" | "assistant";

export type AiConversationMessage = {
  role: AiConversationRole;
  content: string;
};

export type AiActionShowServices = {
  action: "show_services";
};

export type AiActionShowSlots = {
  action: "show_slots";
  serviceId: string;
  date: string;
};

export type AiActionBook = {
  action: "book";
  serviceId: string;
  startTime: string;
};

export type AiActionCancel = {
  action: "cancel";
  bookingId: string;
};

export type AiActionReschedule = {
  action: "reschedule";
  bookingId: string;
  newStartTime: string;
};

export type AiAction =
  | AiActionShowServices
  | AiActionShowSlots
  | AiActionBook
  | AiActionCancel
  | AiActionReschedule;

export type AiResponse = {
  reply: string;
  action?: AiAction;
};

export type AiChatResponse = AiResponse & {
  actionResult?: string;
};
