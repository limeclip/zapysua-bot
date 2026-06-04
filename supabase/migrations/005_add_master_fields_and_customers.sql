-- =============================================================================
-- ZapysUa — поля профілю майстра та таблиця клієнтів (Етап 4.6)
-- =============================================================================

ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.masters
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.masters.phone IS 'Контактний телефон майстра';
COMMENT ON COLUMN public.masters.social_links IS 'Посилання на соцмережі (instagram, tiktok, facebook, telegram)';

CREATE TABLE IF NOT EXISTS public.customers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id   uuid        NOT NULL REFERENCES public.masters(id) ON DELETE CASCADE,
  telegram_id bigint,
  name        text        NOT NULL,
  phone       text,
  avatar_url  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (master_id, telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_customers_master_id
  ON public.customers (master_id);

CREATE INDEX IF NOT EXISTS idx_customers_telegram_id
  ON public.customers (telegram_id)
  WHERE telegram_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_master_telegram
  ON public.customers (master_id, telegram_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select_own ON public.customers
  FOR SELECT
  USING (master_id = public.current_master_id());

CREATE POLICY customers_insert_own ON public.customers
  FOR INSERT
  WITH CHECK (master_id = public.current_master_id());

CREATE POLICY customers_update_own ON public.customers
  FOR UPDATE
  USING (master_id = public.current_master_id());

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
