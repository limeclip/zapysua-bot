import type { Context, SessionFlavor } from "grammy";

export type MasterCategory =
  | "beauty"
  | "health"
  | "education"
  | "auto"
  | "other";

export type Master = {
  id: string;
  telegram_id: number;
  username: string | null;
  business_name: string;
  logo_url: string | null;
  description: string | null;
  category: MasterCategory;
  location: string | null;
  timezone: string;
  working_hours: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Service = {
  id: string;
  master_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateMasterInput = {
  telegram_id: number;
  username?: string | null;
  business_name: string;
  category?: MasterCategory;
  location?: string | null;
};

export type UpdateMasterInput = {
  business_name?: string;
  category?: MasterCategory;
  location?: string | null;
  username?: string | null;
};

export type CreateServiceInput = {
  name: string;
  price: number;
  duration_minutes: number;
  description?: string | null;
};

export type SessionStep =
  | "onboarding_name"
  | "onboarding_location"
  | "add_service_name"
  | "add_service_price"
  | "add_service_duration"
  | "add_service_description";

export type SessionData = {
  step?: SessionStep;
  onboarding?: {
    business_name?: string;
    category?: MasterCategory;
    location?: string;
  };
  newService?: {
    name?: string;
    price?: number;
    duration_minutes?: number;
  };
  pendingDeleteServiceId?: string;
};

export interface BotContext extends Context, SessionFlavor<SessionData> {
  master?: Master;
}
