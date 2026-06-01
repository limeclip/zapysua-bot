-- Додати тон 'caring' (Дбайливий) для ai_settings
ALTER TABLE public.ai_settings
  DROP CONSTRAINT IF EXISTS ai_settings_tone_check;

ALTER TABLE public.ai_settings
  ADD CONSTRAINT ai_settings_tone_check
  CHECK (tone IN ('friendly', 'professional', 'formal', 'caring'));

COMMENT ON COLUMN public.ai_settings.tone IS
  'Тон спілкування: friendly, professional, formal, caring';
