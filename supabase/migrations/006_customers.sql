-- =============================================================================
-- ZapysUa — клієнтське бронювання (Етап 5.1)
-- Таблиця customers може вже існувати з 005; міграція ідемпотентна.
-- =============================================================================

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

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'customers_select_own'
  ) THEN
    CREATE POLICY customers_select_own ON public.customers
      FOR SELECT
      USING (master_id = public.current_master_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'customers_insert_own'
  ) THEN
    CREATE POLICY customers_insert_own ON public.customers
      FOR INSERT
      WITH CHECK (master_id = public.current_master_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'customers_update_own'
  ) THEN
    CREATE POLICY customers_update_own ON public.customers
      FOR UPDATE
      USING (master_id = public.current_master_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'customers_delete_own'
  ) THEN
    CREATE POLICY customers_delete_own ON public.customers
      FOR DELETE
      USING (master_id = public.current_master_id());
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
