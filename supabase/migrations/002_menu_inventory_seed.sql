-- Menu + inventory schema and seed for Frozen Treats Menu.
-- Paste this whole file into the Supabase SQL editor, or run it as a migration.

CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES product_categories(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  image_src TEXT,
  icon TEXT NOT NULL DEFAULT '🍨',
  is_bestseller BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  track_inventory BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_modifiers (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'option',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS modifier_options (
  id TEXT PRIMARY KEY,
  modifier_id TEXT NOT NULL REFERENCES product_modifiers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta NUMERIC(10, 2) NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_delta INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'adjustment',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_categories' AND policyname = 'Allow public category read') THEN
    CREATE POLICY "Allow public category read" ON product_categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow public product read') THEN
    CREATE POLICY "Allow public product read" ON products FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_modifiers' AND policyname = 'Allow public modifier read') THEN
    CREATE POLICY "Allow public modifier read" ON product_modifiers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'modifier_options' AND policyname = 'Allow public option read') THEN
    CREATE POLICY "Allow public option read" ON modifier_options FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow public product update') THEN
    CREATE POLICY "Allow public product update" ON products FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO product_categories (id, name, display_order) VALUES
  ('ice-cream', 'Ice Cream', 1),
  ('boba-drinks', 'Boba Drinks', 2),
  ('yogurt-parfait', 'Yogurt Parfait', 3),
  ('milkshakes', 'Milkshakes', 4),
  ('slushies', 'Slushies', 5),
  ('smoothies', 'Smoothies', 6),
  ('toppings', 'Toppings', 7),
  ('popcorn', 'Popcorn', 8),
  ('waffles-pancakes', 'Waffles & Pancakes', 9)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

INSERT INTO products (id, category_id, name, description, base_price, icon, display_order, stock_quantity, low_stock_threshold, track_inventory) VALUES
  ('ice-cream-vanilla', 'ice-cream', 'Vanilla Ice Cream', 'Frozen Treats ice cream flavor', 15, '🍦', 1, 100, 10, true),
  ('ice-cream-strawberry', 'ice-cream', 'Strawberry Ice Cream', 'Frozen Treats ice cream flavor', 15, '🍓', 2, 100, 10, true),
  ('ice-cream-chocolate', 'ice-cream', 'Chocolate Ice Cream', 'Frozen Treats ice cream flavor', 15, '🍫', 3, 100, 10, true),
  ('ice-cream-cheesecake', 'ice-cream', 'Cheesecake Ice Cream', 'Frozen Treats ice cream flavor', 15, '🍰', 4, 100, 10, true),
  ('ice-cream-oreo', 'ice-cream', 'Oreo Ice Cream', 'Frozen Treats ice cream flavor', 15, '🍪', 5, 100, 10, true),
  ('ice-cream-coconut', 'ice-cream', 'Coconut Ice Cream', 'Frozen Treats ice cream flavor', 15, '🥥', 6, 100, 10, true),
  ('ice-cream-pineapple', 'ice-cream', 'Pineapple Ice Cream', 'Frozen Treats ice cream flavor', 15, '🍍', 7, 100, 10, true),
  ('ice-cream-bubble-gum', 'ice-cream', 'Bubble Gum Ice Cream', 'Frozen Treats ice cream flavor', 15, '🍬', 8, 100, 10, true),
  ('ice-cream-mint', 'ice-cream', 'Mint Ice Cream', 'Frozen Treats ice cream flavor', 15, '🌿', 9, 100, 10, true),
  ('ice-cream-cappuccino', 'ice-cream', 'Cappuccino Ice Cream', 'Frozen Treats ice cream flavor', 15, '☕', 10, 100, 10, true),
  ('boba-vanilla', 'boba-drinks', 'Vanilla Boba', 'Boba drink', 30, '🧋', 1, 100, 10, true),
  ('boba-strawberry', 'boba-drinks', 'Strawberry Boba', 'Boba drink', 30, '🧋', 2, 100, 10, true),
  ('boba-pineapple', 'boba-drinks', 'Pineapple Boba', 'Boba drink', 30, '🧋', 3, 100, 10, true),
  ('boba-tiramisu', 'boba-drinks', 'Tiramisu Boba', 'Boba drink', 30, '🧋', 4, 100, 10, true),
  ('boba-purple-blueberry', 'boba-drinks', 'Purple Blueberry Boba', 'Boba drink', 30, '🧋', 5, 100, 10, true),
  ('boba-original', 'boba-drinks', 'Original Boba', 'Boba drink', 30, '🧋', 6, 100, 10, true),
  ('boba-passion-fruit', 'boba-drinks', 'Passion Fruit Boba', 'Boba drink', 30, '🧋', 7, 100, 10, true),
  ('boba-black-tea', 'boba-drinks', 'Black Tea Boba', 'Boba drink', 30, '🧋', 8, 100, 10, true),
  ('boba-brown-sugar', 'boba-drinks', 'Brown Sugar Boba', 'Boba drink', 30, '🧋', 9, 100, 10, true),
  ('boba-custard', 'boba-drinks', 'Custard Boba', 'Boba drink', 30, '🧋', 10, 100, 10, true),
  ('parfait-apple-creation', 'yogurt-parfait', 'Apple Creation Parfait', 'Yogurt parfait', 50, '🥣', 1, 50, 5, true),
  ('parfait-pineapple', 'yogurt-parfait', 'Pineapple Parfait', 'Yogurt parfait', 50, '🥣', 2, 50, 5, true),
  ('parfait-full-house', 'yogurt-parfait', 'Full House Parfait', 'Yogurt parfait', 60, '🥣', 3, 50, 5, true),
  ('milkshake-vanilla', 'milkshakes', 'Vanilla Milkshake', 'Milkshake', 30, '🥤', 1, 80, 8, true),
  ('milkshake-strawberry', 'milkshakes', 'Strawberry Milkshake', 'Milkshake', 30, '🥤', 2, 80, 8, true),
  ('milkshake-chocolate', 'milkshakes', 'Chocolate Milkshake', 'Milkshake', 30, '🥤', 3, 80, 8, true),
  ('milkshake-oreo', 'milkshakes', 'Oreo Milkshake', 'Milkshake', 30, '🥤', 4, 80, 8, true),
  ('milkshake-kitkat', 'milkshakes', 'KitKat Milkshake', 'Milkshake', 30, '🥤', 5, 80, 8, true),
  ('milkshake-baileys', 'milkshakes', 'Baileys Milkshake', 'Milkshake', 30, '🥤', 6, 80, 8, true),
  ('milkshake-cheese-cake', 'milkshakes', 'Cheese Cake Milkshake', 'Milkshake', 30, '🥤', 7, 80, 8, true),
  ('milkshake-custom', 'milkshakes', 'Design Your Own Milkshake', 'Custom milkshake', 30, '🥤', 8, 80, 8, true),
  ('slushie-strawberry', 'slushies', 'Strawberry Slushie', 'Slushie', 40, '🥤', 1, 80, 8, true),
  ('slushie-cocktail', 'slushies', 'Cocktail Slushie', 'Slushie', 40, '🥤', 2, 80, 8, true),
  ('slushie-mango', 'slushies', 'Mango Slushie', 'Slushie', 40, '🥭', 3, 80, 8, true),
  ('slushie-lemon', 'slushies', 'Lemon Slushie', 'Slushie', 40, '🍋', 4, 80, 8, true),
  ('slushie-orange', 'slushies', 'Orange Slushie', 'Slushie', 40, '🍊', 5, 80, 8, true),
  ('slushie-mint', 'slushies', 'Mint Slushie', 'Slushie', 40, '🌿', 6, 80, 8, true),
  ('slushie-watermelon', 'slushies', 'Watermelon Slushie', 'Slushie', 40, '🍉', 7, 80, 8, true),
  ('slushie-cola', 'slushies', 'Cola Slushie', 'Slushie', 40, '🥤', 8, 80, 8, true),
  ('slushie-grape', 'slushies', 'Grape Slushie', 'Slushie', 40, '🍇', 9, 80, 8, true),
  ('slushie-pineapple', 'slushies', 'Pineapple Slushie', 'Slushie', 40, '🍍', 10, 80, 8, true),
  ('smoothie-kenkey', 'smoothies', 'Kenkey Smoothie', 'Smoothie', 25, '🥤', 1, 80, 8, true),
  ('smoothie-fula', 'smoothies', 'Fula Smoothie', 'Smoothie', 25, '🥤', 2, 80, 8, true),
  ('smoothie-strawberry-banana', 'smoothies', 'Strawberry Banana Smoothie', 'Smoothie', 45, '🍓', 3, 80, 8, true),
  ('smoothie-mango-strawberry', 'smoothies', 'Mango Strawberry Smoothie', 'Smoothie', 45, '🥭', 4, 80, 8, true),
  ('smoothie-very-berry', 'smoothies', 'Very Berry Smoothie', 'Smoothie', 45, '🫐', 5, 80, 8, true),
  ('smoothie-strawberry-pineapple', 'smoothies', 'Strawberry Pineapple Smoothie', 'Smoothie', 45, '🍍', 6, 80, 8, true),
  ('smoothie-honey-ginger', 'smoothies', 'Honey Ginger Smoothie', 'Smoothie', 40, '🍯', 7, 80, 8, true),
  ('smoothie-passion-mango', 'smoothies', 'Passion Mango Smoothie', 'Smoothie', 50, '🥭', 8, 80, 8, true),
  ('smoothie-mango-orange', 'smoothies', 'Mango and Orange Smoothie', 'Smoothie', 40, '🍊', 9, 80, 8, true),
  ('smoothie-tropical-delight', 'smoothies', 'Tropical Delight Smoothie', 'Smoothie', 45, '🍹', 10, 80, 8, true),
  ('smoothie-custom', 'smoothies', 'Design Your Own Smoothie', 'Custom smoothie', 45, '🍹', 11, 80, 8, true),
  ('topping-marshmallows', 'toppings', 'Marshmallows', 'Extra topping', 5, '🍡', 1, 100, 10, true),
  ('topping-extra-boba', 'toppings', 'Extra Boba', 'Extra topping', 10, '🧋', 2, 100, 10, true),
  ('topping-oreo-crumbles', 'toppings', 'Oreo Crumbles', 'Extra topping', 10, '🍪', 3, 100, 10, true),
  ('topping-sprinkles', 'toppings', 'Sprinkles', 'Extra topping', 5, '✨', 4, 100, 10, true),
  ('topping-syrup', 'toppings', 'Syrup', 'Extra topping', 5, '🍯', 5, 100, 10, true),
  ('topping-pebbles', 'toppings', 'Pebbles', 'Extra topping', 5, '🍬', 6, 100, 10, true),
  ('popcorn-colored', 'popcorn', 'Colored Popcorn', 'Popcorn', 15, '🍿', 1, 100, 10, true),
  ('popcorn-plain', 'popcorn', 'Plain Popcorn', 'Popcorn', 10, '🍿', 2, 100, 10, true),
  ('waffle-hotdog', 'waffles-pancakes', 'Hotdog Waffle', 'Waffles and pancakes', 15, '🧇', 1, 50, 5, true),
  ('waffle-plain', 'waffles-pancakes', 'Plain Waffle', 'Waffles and pancakes', 30, '🧇', 2, 50, 5, true),
  ('waffle-creamy', 'waffles-pancakes', 'Creamy Waffle (Waffle and Ice Cream)', 'Waffles and pancakes', 40, '🧇', 3, 50, 5, true),
  ('waffle-fruity', 'waffles-pancakes', 'Fruity Waffle', 'Waffles and pancakes', 50, '🧇', 4, 50, 5, true),
  ('waffle-chocolate', 'waffles-pancakes', 'Chocolate Waffle', 'Waffles and pancakes', 50, '🧇', 5, 50, 5, true),
  ('pancake-plain', 'waffles-pancakes', 'Plain Pancakes', 'Waffles and pancakes', 30, '🥞', 6, 50, 5, true),
  ('pancake-creamy', 'waffles-pancakes', 'Creamy Pancake', 'Waffles and pancakes', 40, '🥞', 7, 50, 5, true),
  ('pancake-fruity', 'waffles-pancakes', 'Fruity Pancake', 'Waffles and pancakes', 50, '🥞', 8, 50, 5, true),
  ('pancake-chocolate', 'waffles-pancakes', 'Chocolate Pancake', 'Waffles and pancakes', 40, '🥞', 9, 50, 5, true),
  ('waffle-hotdog-cheese', 'waffles-pancakes', 'Waffle Hotdog with Cheese', 'Waffles and pancakes', 20, '🧇', 10, 50, 5, true),
  ('waffle-hotdog-and-cheese', 'waffles-pancakes', 'Waffle Hotdog and Cheese', 'Waffles and pancakes', 25, '🧇', 11, 50, 5, true)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

INSERT INTO product_modifiers (id, product_id, name, type, required, display_order)
SELECT id || '-scoops', id, 'Scoops', 'size', true, 1
FROM products
WHERE category_id = 'ice-cream'
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, required = EXCLUDED.required;

INSERT INTO modifier_options (id, modifier_id, name, price_delta, display_order)
SELECT product_modifiers.id || '-' || option_id, product_modifiers.id, option_name, price_delta, options.display_order
FROM product_modifiers
CROSS JOIN (VALUES
  ('1-scoop', '1 Scoop', 0, 1),
  ('2-scoops', '2 Scoops', 15, 2),
  ('3-scoops', '3 Scoops', 25, 3),
  ('cone', 'Cone', 7, 4)
) AS options(option_id, option_name, price_delta, display_order)
WHERE product_modifiers.id LIKE 'ice-cream-%-scoops'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  display_order = EXCLUDED.display_order;

INSERT INTO product_modifiers (id, product_id, name, type, required, display_order)
SELECT id || '-size', id, 'Size', 'size', true, 1
FROM products
WHERE category_id IN ('boba-drinks', 'yogurt-parfait', 'milkshakes', 'slushies', 'smoothies')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, required = EXCLUDED.required;

INSERT INTO modifier_options (id, modifier_id, name, price_delta, display_order)
SELECT product_modifiers.id || '-small', product_modifiers.id, 'Small', 0, 1
FROM product_modifiers
WHERE id LIKE 'boba-%-size'
   OR id LIKE 'parfait-%-size'
   OR id LIKE 'milkshake-%-size'
   OR id LIKE 'slushie-%-size'
   OR id LIKE 'smoothie-%-size'
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_delta = EXCLUDED.price_delta;

INSERT INTO modifier_options (id, modifier_id, name, price_delta, display_order)
SELECT product_modifiers.id || '-medium', product_modifiers.id, 'Medium', 15, 2
FROM product_modifiers
WHERE id LIKE 'boba-%-size'
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_delta = EXCLUDED.price_delta;

INSERT INTO modifier_options (id, modifier_id, name, price_delta, display_order)
SELECT product_modifiers.id || '-large', product_modifiers.id, 'Large',
  CASE
    WHEN product_id LIKE 'boba-%' THEN 35
    WHEN product_id IN ('parfait-full-house') THEN 20
    WHEN product_id LIKE 'parfait-%' THEN 10
    WHEN product_id IN ('milkshake-kitkat', 'milkshake-baileys', 'milkshake-cheese-cake') THEN 40
    WHEN product_id LIKE 'milkshake-%' THEN 50
    WHEN product_id LIKE 'slushie-%' THEN 25
    WHEN product_id IN ('smoothie-kenkey', 'smoothie-fula') THEN 10
    WHEN product_id IN ('smoothie-passion-mango', 'smoothie-tropical-delight') THEN 15
    ELSE 15
  END,
  CASE WHEN product_id LIKE 'boba-%' THEN 3 ELSE 2 END
FROM product_modifiers
WHERE id LIKE 'boba-%-size'
   OR id LIKE 'parfait-%-size'
   OR id LIKE 'milkshake-%-size'
   OR id LIKE 'slushie-%-size'
   OR id LIKE 'smoothie-%-size'
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_delta = EXCLUDED.price_delta;
