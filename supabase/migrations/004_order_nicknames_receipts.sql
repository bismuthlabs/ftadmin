-- Add order identification and receipt preference fields.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_nickname TEXT,
  ADD COLUMN IF NOT EXISTS receipt_type TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS receipt_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_order_nickname ON orders(order_nickname);
