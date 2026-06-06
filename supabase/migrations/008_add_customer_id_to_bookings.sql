-- Зв'язок запису з клієнтом у таблиці customers
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id
  ON public.bookings (customer_id);

COMMENT ON COLUMN public.bookings.customer_id IS 'Посилання на клієнта в CRM майстра';
