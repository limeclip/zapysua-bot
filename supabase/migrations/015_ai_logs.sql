-- Етап 8: логування запитів AI-адміністратора

CREATE TABLE IF NOT EXISTS public.ai_logs (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id          uuid        NOT NULL REFERENCES public.masters(id) ON DELETE CASCADE,
  client_telegram_id bigint,
  request            text        NOT NULL,
  response           text        NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_master_id
  ON public.ai_logs (master_id);

CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at
  ON public.ai_logs (created_at DESC);

COMMENT ON TABLE public.ai_logs IS 'Логи запитів AI-адміністратора для налагодження';

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_logs_select_own"
  ON public.ai_logs FOR SELECT
  USING (master_id = public.current_master_id());

CREATE POLICY "mvp_ai_logs_service_role_all"
  ON public.ai_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
