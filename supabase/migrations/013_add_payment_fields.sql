-- Поля для оплати через Telegram Stars
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS telegram_payment_charge_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS telegram_invoice_payload TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_payment_amount INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;

-- Тарифи оплати (місяць / рік)
ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'monthly';
ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'yearly';
