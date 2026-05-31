-- =============================================================================
-- ZapysUa — початкова схема бази даних (Етап 1)
-- Виконати в Supabase SQL Editor або через Supabase CLI
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUM-типи
-- -----------------------------------------------------------------------------

CREATE TYPE public.subscription_status AS ENUM (
  'trial',      -- пробний період
  'active',     -- активна підписка
  'expired',    -- підписка закінчилась
  'cancelled'   -- скасована користувачем
);

COMMENT ON TYPE public.subscription_status IS 'Статус підписки майстра';

CREATE TYPE public.plan_type AS ENUM (
  'basic',  -- базовий тариф
  'pro'     -- професійний тариф
);

COMMENT ON TYPE public.plan_type IS 'Тип тарифного плану';

CREATE TYPE public.booking_status AS ENUM (
  'pending',    -- очікує підтвердження
  'confirmed',  -- підтверджено
  'cancelled',  -- скасовано
  'completed',  -- завершено
  'no_show'     -- клієнт не прийшов
);

COMMENT ON TYPE public.booking_status IS 'Статус запису клієнта';

-- -----------------------------------------------------------------------------
-- 2. Допоміжні функції (RLS + тригер updated_at)
-- -----------------------------------------------------------------------------

-- Повертає telegram_id поточної сесії з локального параметра PostgreSQL.
-- Перед запитом з бекенду виконуйте в транзакції:
--   SET LOCAL app.current_telegram_id = '123456789';
--
-- Примітка: auth.uid() у Supabase — це UUID користувача Supabase Auth,
-- а не telegram_id (bigint). Тому на етапі MVP ми використовуємо session
-- variable. Пізніше можна замінити на JWT custom claim через auth.jwt().
CREATE OR REPLACE FUNCTION public.current_telegram_id()
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_telegram_id', true), '')::bigint;
$$;

COMMENT ON FUNCTION public.current_telegram_id() IS
  'Повертає Telegram ID поточного майстра з session variable app.current_telegram_id';

-- Повертає UUID майстра за поточним telegram_id
CREATE OR REPLACE FUNCTION public.current_master_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.masters
  WHERE telegram_id = public.current_telegram_id()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_master_id() IS
  'Повертає id майстра (tenant) для поточного telegram_id';

-- Автоматичне оновлення поля updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Тригерна функція: оновлює updated_at перед UPDATE';

-- -----------------------------------------------------------------------------
-- 3. Таблиці
-- -----------------------------------------------------------------------------

-- masters — основний tenant (провайдер послуг)
CREATE TABLE public.masters (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id   bigint      NOT NULL UNIQUE,
  username      text,
  business_name text        NOT NULL,
  logo_url      text,
  description   text,
  category      text        NOT NULL DEFAULT 'other'
                CHECK (category IN ('beauty', 'health', 'education', 'auto', 'other')),
  location      text,
  timezone      text        NOT NULL DEFAULT 'Europe/Kyiv',
  working_hours jsonb       NOT NULL DEFAULT '{}'::jsonb,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.masters IS 'Майстри / провайдери послуг (основний tenant)';
COMMENT ON COLUMN public.masters.telegram_id IS 'Telegram ID майстра (унікальний ідентифікатор)';
COMMENT ON COLUMN public.masters.username IS '@username у Telegram';
COMMENT ON COLUMN public.masters.business_name IS 'Назва студії або ім''я майстра';
COMMENT ON COLUMN public.masters.logo_url IS 'URL логотипу у Supabase Storage';
COMMENT ON COLUMN public.masters.description IS 'Опис бізнесу для AI-адміністратора';
COMMENT ON COLUMN public.masters.category IS 'Категорія: beauty, health, education, auto, other';
COMMENT ON COLUMN public.masters.location IS 'Адреса або місто';
COMMENT ON COLUMN public.masters.timezone IS 'Часовий пояс (IANA, напр. Europe/Kyiv)';
COMMENT ON COLUMN public.masters.working_hours IS 'Графік роботи: {"monday": {"start": "09:00", "end": "19:00"}, ...}';
COMMENT ON COLUMN public.masters.is_active IS 'Чи активний профіль майстра';

-- subscriptions — підписки та триали
CREATE TABLE public.subscriptions (
  id                       uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id                uuid                     NOT NULL REFERENCES public.masters(id) ON DELETE CASCADE,
  status                   public.subscription_status NOT NULL DEFAULT 'trial',
  plan_type                public.plan_type         NOT NULL DEFAULT 'basic',
  trial_start_date         timestamptz,
  trial_end_date           timestamptz,
  subscription_start_date  timestamptz,
  subscription_end_date    timestamptz,
  stars_amount             integer                  CHECK (stars_amount IS NULL OR stars_amount >= 0),
  created_at               timestamptz              NOT NULL DEFAULT now(),
  updated_at               timestamptz              NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscriptions IS 'Підписки та пробні періоди майстрів';
COMMENT ON COLUMN public.subscriptions.status IS 'Статус: trial, active, expired, cancelled';
COMMENT ON COLUMN public.subscriptions.plan_type IS 'Тариф: basic або pro';
COMMENT ON COLUMN public.subscriptions.trial_start_date IS 'Початок пробного періоду';
COMMENT ON COLUMN public.subscriptions.trial_end_date IS 'Кінець пробного періоду';
COMMENT ON COLUMN public.subscriptions.subscription_start_date IS 'Початок платної підписки';
COMMENT ON COLUMN public.subscriptions.subscription_end_date IS 'Кінець платної підписки';
COMMENT ON COLUMN public.subscriptions.stars_amount IS 'Сума оплати через Telegram Stars';

-- services — послуги майстра
CREATE TABLE public.services (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id        uuid        NOT NULL REFERENCES public.masters(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  price            integer     NOT NULL CHECK (price >= 0),
  duration_minutes integer     NOT NULL CHECK (duration_minutes > 0),
  description      text,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.services IS 'Послуги, які надає майстер';
COMMENT ON COLUMN public.services.name IS 'Назва послуги';
COMMENT ON COLUMN public.services.price IS 'Ціна в гривнях';
COMMENT ON COLUMN public.services.duration_minutes IS 'Тривалість послуги в хвилинах';
COMMENT ON COLUMN public.services.description IS 'Опис послуги для клієнтів та AI';
COMMENT ON COLUMN public.services.is_active IS 'Чи послуга доступна для запису';

-- bookings — записи клієнтів
CREATE TABLE public.bookings (
  id                 uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id          uuid                   NOT NULL REFERENCES public.masters(id) ON DELETE CASCADE,
  client_telegram_id bigint,
  client_name        text                   NOT NULL,
  client_phone       text,
  service_id         uuid                   REFERENCES public.services(id) ON DELETE SET NULL,
  booking_start      timestamptz            NOT NULL,
  duration_minutes   integer                NOT NULL CHECK (duration_minutes > 0),
  status             public.booking_status  NOT NULL DEFAULT 'pending',
  notes              text,
  created_at         timestamptz            NOT NULL DEFAULT now(),
  updated_at         timestamptz            NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bookings IS 'Записи клієнтів до майстра';
COMMENT ON COLUMN public.bookings.client_telegram_id IS 'Telegram ID клієнта (якщо відомий)';
COMMENT ON COLUMN public.bookings.client_name IS 'Ім''я клієнта';
COMMENT ON COLUMN public.bookings.client_phone IS 'Телефон клієнта';
COMMENT ON COLUMN public.bookings.service_id IS 'Послуга (може бути NULL після видалення послуги)';
COMMENT ON COLUMN public.bookings.booking_start IS 'Дата та час початку запису';
COMMENT ON COLUMN public.bookings.duration_minutes IS 'Тривалість запису в хвилинах';
COMMENT ON COLUMN public.bookings.status IS 'Статус: pending, confirmed, cancelled, completed, no_show';
COMMENT ON COLUMN public.bookings.notes IS 'Примітки до запису';

-- ai_settings — налаштування AI для кожного майстра
CREATE TABLE public.ai_settings (
  master_id               uuid    PRIMARY KEY REFERENCES public.masters(id) ON DELETE CASCADE,
  system_prompt           text,
  tone                    text    NOT NULL DEFAULT 'friendly'
                          CHECK (tone IN ('friendly', 'professional', 'formal')),
  auto_reminders_enabled  boolean NOT NULL DEFAULT true,
  return_clients_enabled  boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.ai_settings IS 'Налаштування AI-адміністратора для майстра';
COMMENT ON COLUMN public.ai_settings.system_prompt IS 'Базовий системний промпт для AI';
COMMENT ON COLUMN public.ai_settings.tone IS 'Тон спілкування: friendly, professional, formal';
COMMENT ON COLUMN public.ai_settings.auto_reminders_enabled IS 'Автоматичні нагадування клієнтам';
COMMENT ON COLUMN public.ai_settings.return_clients_enabled IS 'Повернення неактивних клієнтів';

-- notifications — лог надісланих повідомлень
CREATE TABLE public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  type       text        NOT NULL
               CHECK (type IN ('reminder_24h', 'reminder_2h', 'confirmation', 'return_client')),
  sent_at    timestamptz NOT NULL DEFAULT now(),
  status     text        NOT NULL DEFAULT 'sent'
               CHECK (status IN ('sent', 'failed'))
);

COMMENT ON TABLE public.notifications IS 'Журнал надісланих Telegram-повідомлень';
COMMENT ON COLUMN public.notifications.type IS 'Тип: reminder_24h, reminder_2h, confirmation, return_client';
COMMENT ON COLUMN public.notifications.sent_at IS 'Час відправки повідомлення';
COMMENT ON COLUMN public.notifications.status IS 'Результат: sent або failed';

-- -----------------------------------------------------------------------------
-- 4. Індекси
-- -----------------------------------------------------------------------------

-- masters.telegram_id вже має UNIQUE-індекс
CREATE INDEX idx_masters_category ON public.masters (category);
CREATE INDEX idx_masters_is_active ON public.masters (is_active);

CREATE INDEX idx_subscriptions_master_id ON public.subscriptions (master_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions (status);
CREATE INDEX idx_subscriptions_master_status ON public.subscriptions (master_id, status);

CREATE INDEX idx_services_master_id ON public.services (master_id);
CREATE INDEX idx_services_master_active ON public.services (master_id, is_active);

CREATE INDEX idx_bookings_master_id ON public.bookings (master_id);
CREATE INDEX idx_bookings_master_start ON public.bookings (master_id, booking_start);
CREATE INDEX idx_bookings_client_telegram_id ON public.bookings (client_telegram_id);
CREATE INDEX idx_bookings_service_id ON public.bookings (service_id);
CREATE INDEX idx_bookings_status ON public.bookings (status);
CREATE INDEX idx_bookings_start ON public.bookings (booking_start);

CREATE INDEX idx_notifications_booking_id ON public.notifications (booking_id);
CREATE INDEX idx_notifications_type ON public.notifications (type);
CREATE INDEX idx_notifications_sent_at ON public.notifications (sent_at);

-- -----------------------------------------------------------------------------
-- 5. Тригери updated_at
-- -----------------------------------------------------------------------------

CREATE TRIGGER trg_masters_updated_at
  BEFORE UPDATE ON public.masters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. Row Level Security (RLS)
-- -----------------------------------------------------------------------------
--
-- Стратегія доступу:
--   1. service_role (SUPABASE_SERVICE_ROLE_KEY) — обходить RLS автоматично.
--      Використовуйте лише на бекенді (webhook, cron). Ніколи у клієнті!
--   2. anon / authenticated — обмежені політиками нижче.
--   3. Ізоляція tenant: master_id = current_master_id(), де current_master_id()
--      читає app.current_telegram_id з session variable.
--
-- Приклад використання з бекенду (Next.js + Supabase):
--   await supabase.rpc('set_telegram_context', { tg_id: 123456789 });
--   або raw SQL у транзакції:
--   BEGIN;
--   SET LOCAL app.current_telegram_id = '123456789';
--   SELECT * FROM bookings;
--   COMMIT;

CREATE OR REPLACE FUNCTION public.set_telegram_context(tg_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_telegram_id', tg_id::text, true);
END;
$$;

COMMENT ON FUNCTION public.set_telegram_context(bigint) IS
  'Встановлює telegram_id для поточної транзакції (для RLS). Викликати перед запитами від імені майстра.';

-- Увімкнути RLS на всіх таблицях
ALTER TABLE public.masters         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;

-- ---------- masters ----------

CREATE POLICY "masters_select_own"
  ON public.masters FOR SELECT
  USING (telegram_id = public.current_telegram_id());

CREATE POLICY "masters_insert_own"
  ON public.masters FOR INSERT
  WITH CHECK (telegram_id = public.current_telegram_id());

CREATE POLICY "masters_update_own"
  ON public.masters FOR UPDATE
  USING (telegram_id = public.current_telegram_id())
  WITH CHECK (telegram_id = public.current_telegram_id());

CREATE POLICY "masters_delete_own"
  ON public.masters FOR DELETE
  USING (telegram_id = public.current_telegram_id());

-- ---------- subscriptions ----------

CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (master_id = public.current_master_id());

CREATE POLICY "subscriptions_insert_own"
  ON public.subscriptions FOR INSERT
  WITH CHECK (master_id = public.current_master_id());

CREATE POLICY "subscriptions_update_own"
  ON public.subscriptions FOR UPDATE
  USING (master_id = public.current_master_id())
  WITH CHECK (master_id = public.current_master_id());

CREATE POLICY "subscriptions_delete_own"
  ON public.subscriptions FOR DELETE
  USING (master_id = public.current_master_id());

-- ---------- services ----------

CREATE POLICY "services_select_own"
  ON public.services FOR SELECT
  USING (master_id = public.current_master_id());

CREATE POLICY "services_insert_own"
  ON public.services FOR INSERT
  WITH CHECK (master_id = public.current_master_id());

CREATE POLICY "services_update_own"
  ON public.services FOR UPDATE
  USING (master_id = public.current_master_id())
  WITH CHECK (master_id = public.current_master_id());

CREATE POLICY "services_delete_own"
  ON public.services FOR DELETE
  USING (master_id = public.current_master_id());

-- ---------- bookings ----------

CREATE POLICY "bookings_select_own"
  ON public.bookings FOR SELECT
  USING (master_id = public.current_master_id());

CREATE POLICY "bookings_insert_own"
  ON public.bookings FOR INSERT
  WITH CHECK (master_id = public.current_master_id());

CREATE POLICY "bookings_update_own"
  ON public.bookings FOR UPDATE
  USING (master_id = public.current_master_id())
  WITH CHECK (master_id = public.current_master_id());

CREATE POLICY "bookings_delete_own"
  ON public.bookings FOR DELETE
  USING (master_id = public.current_master_id());

-- ---------- ai_settings ----------

CREATE POLICY "ai_settings_select_own"
  ON public.ai_settings FOR SELECT
  USING (master_id = public.current_master_id());

CREATE POLICY "ai_settings_insert_own"
  ON public.ai_settings FOR INSERT
  WITH CHECK (master_id = public.current_master_id());

CREATE POLICY "ai_settings_update_own"
  ON public.ai_settings FOR UPDATE
  USING (master_id = public.current_master_id())
  WITH CHECK (master_id = public.current_master_id());

CREATE POLICY "ai_settings_delete_own"
  ON public.ai_settings FOR DELETE
  USING (master_id = public.current_master_id());

-- ---------- notifications (доступ через booking → master) ----------

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = notifications.booking_id
        AND b.master_id = public.current_master_id()
    )
  );

CREATE POLICY "notifications_insert_own"
  ON public.notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = notifications.booking_id
        AND b.master_id = public.current_master_id()
    )
  );

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = notifications.booking_id
        AND b.master_id = public.current_master_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = notifications.booking_id
        AND b.master_id = public.current_master_id()
    )
  );

CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = notifications.booking_id
        AND b.master_id = public.current_master_id()
    )
  );

-- ---------- MVP: тимчасовий повний доступ для authenticated ----------
-- TODO: видалити ці політики після впровадження Supabase Auth + JWT claims
-- Зараз дозволяють тестувати Mini App з anon/authenticated ключем.

CREATE POLICY "mvp_masters_authenticated_all"
  ON public.masters FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "mvp_subscriptions_authenticated_all"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "mvp_services_authenticated_all"
  ON public.services FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "mvp_bookings_authenticated_all"
  ON public.bookings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "mvp_ai_settings_authenticated_all"
  ON public.ai_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "mvp_notifications_authenticated_all"
  ON public.notifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- Кінець міграції
-- =============================================================================
