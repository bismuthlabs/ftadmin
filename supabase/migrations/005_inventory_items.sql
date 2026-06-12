-- Ingredient and packaging inventory for the manager inventory page.

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  unit TEXT NOT NULL DEFAULT 'units',
  stock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(12, 2) NOT NULL DEFAULT 0,
  par_level NUMERIC(12, 2) NOT NULL DEFAULT 1,
  track_inventory BOOLEAN NOT NULL DEFAULT TRUE,
  used_by JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_item_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_delta NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL DEFAULT 'adjustment',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_track ON inventory_items(track_inventory);
CREATE INDEX IF NOT EXISTS idx_inventory_item_movements_item_id ON inventory_item_movements(inventory_item_id);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item_movements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Allow public inventory item read') THEN
    CREATE POLICY "Allow public inventory item read" ON inventory_items FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Allow public inventory item insert') THEN
    CREATE POLICY "Allow public inventory item insert" ON inventory_items FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Allow public inventory item update') THEN
    CREATE POLICY "Allow public inventory item update" ON inventory_items FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Allow public inventory item delete') THEN
    CREATE POLICY "Allow public inventory item delete" ON inventory_items FOR DELETE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_item_movements' AND policyname = 'Allow public inventory movement read') THEN
    CREATE POLICY "Allow public inventory movement read" ON inventory_item_movements FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_item_movements' AND policyname = 'Allow public inventory movement insert') THEN
    CREATE POLICY "Allow public inventory movement insert" ON inventory_item_movements FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_item_movements' AND policyname = 'Allow public inventory movement update') THEN
    CREATE POLICY "Allow public inventory movement update" ON inventory_item_movements FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_item_movements' AND policyname = 'Allow public inventory movement delete') THEN
    CREATE POLICY "Allow public inventory movement delete" ON inventory_item_movements FOR DELETE USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION adjust_inventory_item_stock(
  p_item_id TEXT,
  p_quantity_delta NUMERIC,
  p_reason TEXT DEFAULT 'adjustment',
  p_note TEXT DEFAULT NULL
)
RETURNS SETOF inventory_items
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO inventory_item_movements (inventory_item_id, quantity_delta, reason, note)
  VALUES (p_item_id, p_quantity_delta, p_reason, p_note);

  RETURN QUERY
  UPDATE inventory_items
  SET
    stock_quantity = GREATEST(0, stock_quantity + p_quantity_delta),
    updated_at = NOW()
  WHERE id = p_item_id
  RETURNING *;
END;
$$;

INSERT INTO inventory_items (
  id,
  name,
  category,
  unit,
  stock_quantity,
  low_stock_threshold,
  par_level,
  track_inventory,
  used_by
) VALUES
  ('vanilla-ice-cream', 'Vanilla ice cream tub', 'Ice Cream', 'scoops', 88, 24, 120, true, '["Vanilla Ice Cream", "Milkshakes", "Waffles & Pancakes"]'::JSONB),
  ('strawberry-ice-cream', 'Strawberry ice cream tub', 'Ice Cream', 'scoops', 34, 24, 120, true, '["Strawberry Ice Cream", "Smoothies", "Milkshakes"]'::JSONB),
  ('chocolate-ice-cream', 'Chocolate ice cream tub', 'Ice Cream', 'scoops', 18, 24, 120, true, '["Chocolate Ice Cream", "Milkshakes", "Waffles & Pancakes"]'::JSONB),
  ('boba-pearls', 'Boba pearls', 'Drinks', 'servings', 42, 30, 100, true, '["Boba Drinks", "Extra Boba"]'::JSONB),
  ('milk-base', 'Milk base', 'Drinks', 'cups', 76, 32, 140, true, '["Boba Drinks", "Milkshakes", "Smoothies"]'::JSONB),
  ('slushie-mix', 'Slushie mix', 'Drinks', 'servings', 29, 25, 90, true, '["Slushies"]'::JSONB),
  ('yogurt-base', 'Yogurt base', 'Drinks', 'cups', 22, 20, 70, true, '["Yogurt Parfait"]'::JSONB),
  ('oreo-crumbles', 'Oreo crumbles', 'Toppings', 'servings', 16, 18, 80, true, '["Toppings", "Oreo Ice Cream", "Milkshakes"]'::JSONB),
  ('sprinkles', 'Sprinkles', 'Toppings', 'servings', 55, 20, 90, true, '["Toppings", "Ice Cream"]'::JSONB),
  ('waffle-batter', 'Waffle and pancake batter', 'Bakery', 'servings', 28, 15, 60, true, '["Waffles & Pancakes"]'::JSONB),
  ('hotdogs', 'Hotdogs', 'Bakery', 'pieces', 14, 12, 50, true, '["Hotdog Waffle"]'::JSONB),
  ('popcorn-kernels', 'Popcorn kernels', 'Bakery', 'servings', 64, 22, 100, true, '["Popcorn"]'::JSONB),
  ('serving-cups', 'Serving cups and lids', 'Packaging', 'sets', 118, 50, 250, true, '["All takeaway items"]'::JSONB),
  ('cones', 'Ice cream cones', 'Packaging', 'pieces', 38, 25, 120, true, '["Ice Cream"]'::JSONB),
  ('straws-spoons', 'Straws and spoons', 'Packaging', 'sets', 210, 80, 350, true, '["Drinks", "Desserts"]'::JSONB)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  par_level = EXCLUDED.par_level,
  track_inventory = EXCLUDED.track_inventory,
  used_by = EXCLUDED.used_by,
  updated_at = NOW();
