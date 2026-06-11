import type { Context, SessionFlavor } from "grammy";

export type MasterCategory =
  | "beauty"
  | "health"
  | "education"
  | "auto"
  | "other";

export type SocialLinks = {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  telegram?: string;
  youtube?: string;
  website?: string;
};

export type ServicesLayout = "list" | "grid";

export type Master = {
  id: string;
  telegram_id: number;
  username: string | null;
  business_name: string;
  slug: string | null;
  logo_url: string | null;
  description: string | null;
  category: MasterCategory;
  location: string | null;
  phone?: string | null;
  social_links?: SocialLinks | null;
  services_layout?: ServicesLayout;
  timezone: string;
  working_hours: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  master_id: string;
  telegram_id?: number | null;
  name: string;
  phone?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerWithStats = Customer & {
  bookings_count: number;
  last_visit: string | null;
};

export type ClientProfile = {
  telegram_id: number;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  has_profile: boolean;
};

export type ClientBooking = {
  id: string;
  master_id: string;
  business_name: string;
  master_slug: string | null;
  master_timezone: string;
  service_id: string | null;
  service_name: string | null;
  service_price: number | null;
  booking_start: string;
  duration_minutes: number;
  status: BookingStatus;
};

export type Service = {
  id: string;
  master_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description: string | null;
  image_url?: string | null;
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
  slug?: string | null;
  category?: MasterCategory;
  location?: string | null;
  description?: string | null;
  phone?: string | null;
  social_links?: SocialLinks;
  services_layout?: ServicesLayout;
  username?: string | null;
};

export type PublicMasterProfile = {
  id: string;
  business_name: string;
  logo_url?: string | null;
  description?: string | null;
  category: MasterCategory;
  location?: string | null;
  phone?: string | null;
  social_links?: SocialLinks | null;
  services_layout?: ServicesLayout;
  timezone: string;
  working_hours: WorkingHours;
  services: Pick<
    Service,
    "id" | "name" | "price" | "duration_minutes" | "description" | "image_url"
  >[];
};

export type BookingSlot = {
  start: string;
  end: string;
};

export type AiTone = "friendly" | "professional" | "caring" | "formal";

export type AiSettings = {
  master_id: string;
  system_prompt: string | null;
  tone: AiTone;
  auto_reminders_enabled: boolean;
  return_clients_enabled: boolean;
};

export type WorkingHoursDay = {
  enabled: boolean;
  start: string;
  end: string;
};

export type WorkingHours = Record<
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday",
  WorkingHoursDay
>;

export type MasterWithMeta = Master & {
  ai_settings: AiSettings | null;
  subscription: {
    status: string;
    plan_type: string;
    trial_end_date: string | null;
    subscription_start_date?: string | null;
    subscription_end_date?: string | null;
    last_payment_amount?: number | null;
    last_payment_date?: string | null;
  } | null;
  is_onboarded: boolean;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type Booking = {
  id: string;
  master_id: string;
  customer_id?: string | null;
  client_telegram_id: number | null;
  client_name: string;
  client_phone: string | null;
  service_id: string | null;
  booking_start: string;
  duration_minutes: number;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingService = {
  id: string;
  name: string;
  price: number;
};

export type BookingWithService = Booking & {
  services: BookingService | null;
};

export type BookingStatistics = {
  period: "week" | "month";
  total_bookings: number;
  confirmed_count: number;
  cancelled_count: number;
  no_show_count: number;
  completed_count: number;
  pending_count: number;
  confirmed_percent: number;
  cancelled_percent: number;
  no_show_percent: number;
  revenue: number | null;
  avg_per_day: number;
};

export type CreateServiceInput = {
  name: string;
  price: number;
  duration_minutes: number;
  description?: string | null;
  image_url?: string | null;
};

export type OnboardingPayload = {
  telegram_id: number;
  username?: string;
  business_name: string;
  category: MasterCategory;
  location?: string | null;
  tone: AiTone;
  logo_url?: string | null;
  skip_trial?: boolean;
};

export type SessionStep =
  | "onboarding_name"
  | "onboarding_location"
  | "add_service_name"
  | "add_service_price"
  | "add_service_duration"
  | "add_service_description";

export type AiSessionMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PendingSlot = {
  serviceId: string;
  startTime: string;
};

export type SessionData = {
  step?: SessionStep;
  masterId?: string;
  history?: AiSessionMessage[];
  pendingSlots?: PendingSlot[];
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
