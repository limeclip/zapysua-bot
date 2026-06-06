ALTER TABLE masters ADD COLUMN IF NOT EXISTS services_layout text DEFAULT 'list' CHECK (services_layout IN ('list', 'grid'));
