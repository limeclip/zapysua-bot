-- Додати тип thank_you для подяки після візиту
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'reminder_24h',
    'reminder_2h',
    'confirmation',
    'return_client',
    'thank_you'
  ));

COMMENT ON COLUMN public.notifications.type IS
  'Тип: reminder_24h, reminder_2h, confirmation, return_client, thank_you';
