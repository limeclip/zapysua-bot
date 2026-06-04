-- =============================================================================
-- ZapysUa — slug для коротких персональних посилань (Етап 4.5)
-- =============================================================================

ALTER TABLE public.masters
  ADD COLUMN IF NOT EXISTS slug text;

COMMENT ON COLUMN public.masters.slug IS 'Короткий ідентифікатор для посилання t.me/bot?start=slug';

-- Унікальний slug (NULL дозволено для кількох майстрів без slug)
CREATE UNIQUE INDEX IF NOT EXISTS idx_masters_slug
  ON public.masters (slug)
  WHERE slug IS NOT NULL;

-- Дефолт для існуючих майстрів: m{telegram_id}
UPDATE public.masters
SET slug = 'm' || telegram_id::text
WHERE slug IS NULL;
