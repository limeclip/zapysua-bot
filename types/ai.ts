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
  startTime?: string;
  date?: string;
  requestedTime?: string;
};

export type AiActionCancel = {
  action: "cancel";
  bookingId: string;
};

export type AiActionReschedule = {
  action: "reschedule";
  bookingId: string;
  newStartTime?: string;
  date?: string;
  requestedTime?: string;
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

export type PendingBooking = {
  masterId: string;
  serviceId: string;
  startTime: string;
  dateKey: string;
  requestedTime: string;
  clientName?: string;
  clientPhone?: string;
};

export type AiChatResponse = AiResponse & {
  actionResult?: string;
  pendingBooking?: PendingBooking;
};
