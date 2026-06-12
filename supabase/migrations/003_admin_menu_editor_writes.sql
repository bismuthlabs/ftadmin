-- Allow the existing admin menu editor to create products and manage modifiers.
-- This matches the public-write pattern already used by the menu inventory page.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow public product insert') THEN
    CREATE POLICY "Allow public product insert" ON products FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_modifiers' AND policyname = 'Allow public modifier insert') THEN
    CREATE POLICY "Allow public modifier insert" ON product_modifiers FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_modifiers' AND policyname = 'Allow public modifier update') THEN
    CREATE POLICY "Allow public modifier update" ON product_modifiers FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_modifiers' AND policyname = 'Allow public modifier delete') THEN
    CREATE POLICY "Allow public modifier delete" ON product_modifiers FOR DELETE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'modifier_options' AND policyname = 'Allow public option insert') THEN
    CREATE POLICY "Allow public option insert" ON modifier_options FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'modifier_options' AND policyname = 'Allow public option update') THEN
    CREATE POLICY "Allow public option update" ON modifier_options FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'modifier_options' AND policyname = 'Allow public option delete') THEN
    CREATE POLICY "Allow public option delete" ON modifier_options FOR DELETE USING (true);
  END IF;
END $$;
