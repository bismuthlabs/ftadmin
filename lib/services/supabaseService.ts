/**
 * Supabase Service
 * Handles persistence of completed orders to Supabase
 * 
 * Database Schema:
 * - orders: id, order_number, subtotal, tax, total, payment_method, notes, status, created_at
 * - order_items: id, order_id, product_id, product_name, quantity, price, modifiers, created_at
 */

import type {
  InventoryItem,
  InventoryMovementReason,
  Modifier,
  Product,
  ProductCategory,
  Order,
} from '@/lib/types'

type ServiceResult<T> = {
  data: T | null
  error?: string
}

// Lazy load Supabase client to avoid SSR issues
let supabaseClient: any = null

async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient
  
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found')
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey)
    return supabaseClient
  } catch (error) {
    console.error('[v0] Failed to initialize Supabase client:', error)
    return null
  }
}

function createRecordId(parts: string[]) {
  const slug = parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48)

  const suffix =
    globalThis.crypto?.randomUUID?.().slice(0, 8) || Date.now().toString(36)

  return `${slug || 'record'}-${suffix}`
}

class SupabaseService {
  private mapProductRow(product: any): Product {
    const modifiers: Modifier[] = (product.product_modifiers || []).map((modifier: any) => ({
      id: modifier.id,
      name: modifier.name,
      type: modifier.type,
      required: modifier.required,
      options: (modifier.modifier_options || []).map((option: any) => ({
        id: option.id,
        name: option.name,
        price: Number(option.price_delta || 0),
      })),
    }))

    return {
      id: product.id,
      name: product.name,
      price: Number(product.base_price || 0),
      category: product.product_categories?.name || 'Menu',
      description: product.description || '',
      icon: product.icon || '🍨',
      imageSrc: product.image_src,
      modifiers,
      isBestseller: product.is_bestseller,
      isActive: product.is_active,
      stockQuantity: product.stock_quantity,
      lowStockThreshold: product.low_stock_threshold,
      trackInventory: product.track_inventory,
    }
  }

  private mapInventoryItemRow(row: any): InventoryItem {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      unit: row.unit,
      stock: Number(row.stock_quantity || 0),
      lowThreshold: Number(row.low_stock_threshold || 0),
      parLevel: Number(row.par_level || 1),
      track: row.track_inventory,
      usedBy: Array.isArray(row.used_by) ? row.used_by : [],
      lastUpdated: row.updated_at || row.created_at || new Date().toISOString(),
    }
  }

  /**
   * Fetch active menu categories, products, modifiers, and inventory fields.
   */
  async fetchMenu(includeInactive = false): Promise<{ categories: string[]; products: Product[] }> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return { categories: [], products: [] }

      let categoryQuery = supabase
        .from('product_categories')
        .select('id, name')
        .order('display_order', { ascending: true })

      if (!includeInactive) {
        categoryQuery = categoryQuery.eq('is_active', true)
      }

      const { data: categoryRows, error: categoryError } = await categoryQuery

      if (categoryError) {
        console.error('[v0] Error fetching categories:', categoryError)
        return { categories: [], products: [] }
      }

      let productQuery = supabase
        .from('products')
        .select(
          `
          id,
          name,
          description,
          base_price,
          image_src,
          icon,
          is_bestseller,
          is_active,
          stock_quantity,
          low_stock_threshold,
          track_inventory,
          product_categories ( name ),
          product_modifiers (
            id,
            name,
            type,
            required,
            display_order,
            modifier_options (
              id,
              name,
              price_delta,
              display_order
            )
          )
        `
        )
        .order('display_order', { ascending: true })
        .order('display_order', {
          referencedTable: 'product_modifiers',
          ascending: true,
        })
        .order('display_order', {
          referencedTable: 'product_modifiers.modifier_options',
          ascending: true,
        })

      if (!includeInactive) {
        productQuery = productQuery.eq('is_active', true)
      }

      const { data: productRows, error: productError } = await productQuery

      if (productError) {
        console.error('[v0] Error fetching products:', productError)
        return { categories: [], products: [] }
      }

      const categories = ['All', ...(categoryRows || []).map((category: any) => category.name)]
      const products = (productRows || []).map((product: any) => this.mapProductRow(product))

      return { categories, products }
    } catch (error) {
      console.error('[v0] Unexpected error fetching menu:', error)
      return { categories: [], products: [] }
    }
  }

  async fetchProductCategories(): Promise<ProductCategory[]> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return []

      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) {
        console.error('[v0] Error fetching product categories:', error)
        return []
      }

      return (data || []).map((category: any) => ({
        id: category.id,
        name: category.name,
      }))
    } catch (error) {
      console.error('[v0] Unexpected error fetching product categories:', error)
      return []
    }
  }

  async createProduct(input: {
    categoryId: string
    name: string
    description: string
    basePrice: number
    imageSrc: string | null
    icon: string
    isActive: boolean
    stockQuantity: number
    lowStockThreshold: number
    trackInventory: boolean
  }): Promise<Product | null> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return null

      const { data: lastProducts } = await supabase
        .from('products')
        .select('display_order')
        .eq('category_id', input.categoryId)
        .order('display_order', { ascending: false })
        .limit(1)

      const displayOrder = Number(lastProducts?.[0]?.display_order || 0) + 1
      const id = createRecordId([input.categoryId, input.name])

      const { data, error } = await supabase
        .from('products')
        .insert({
          id,
          category_id: input.categoryId,
          name: input.name,
          description: input.description,
          base_price: input.basePrice,
          image_src: input.imageSrc,
          icon: input.icon || '🍨',
          is_active: input.isActive,
          display_order: displayOrder,
          stock_quantity: input.stockQuantity,
          low_stock_threshold: input.lowStockThreshold,
          track_inventory: input.trackInventory,
          updated_at: new Date().toISOString(),
        })
        .select(
          `
          id,
          name,
          description,
          base_price,
          image_src,
          icon,
          is_bestseller,
          is_active,
          stock_quantity,
          low_stock_threshold,
          track_inventory,
          product_categories ( name ),
          product_modifiers (
            id,
            name,
            type,
            required,
            display_order,
            modifier_options (
              id,
              name,
              price_delta,
              display_order
            )
          )
        `
        )
        .single()

      if (error) {
        console.error('[v0] Error creating product:', error)
        return null
      }

      return this.mapProductRow(data)
    } catch (error) {
      console.error('[v0] Unexpected error creating product:', error)
      return null
    }
  }

  async updateProduct(
    productId: string,
    updates: Partial<{
      name: string
      description: string
      base_price: number
      image_src: string | null
      icon: string
      is_active: boolean
      stock_quantity: number
      low_stock_threshold: number
      track_inventory: boolean
    }>
  ): Promise<boolean> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return false

      const { error } = await supabase
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', productId)

      if (error) {
        console.error('[v0] Error updating product:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[v0] Unexpected error updating product:', error)
      return false
    }
  }

  async saveProductModifiers(productId: string, modifiers: Modifier[]): Promise<boolean> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return false

      const sanitizedModifiers = modifiers
        .map((modifier, modifierIndex) => ({
          ...modifier,
          name: modifier.name.trim(),
          type: modifier.type || 'option',
          options: modifier.options
            .map((option, optionIndex) => ({
              ...option,
              name: option.name.trim(),
              price: Number(option.price || 0),
              displayOrder: optionIndex + 1,
            }))
            .filter((option) => option.name.length > 0),
          displayOrder: modifierIndex + 1,
        }))
        .filter((modifier) => modifier.name.length > 0)

      const { data: existingRows, error: existingError } = await supabase
        .from('product_modifiers')
        .select('id, modifier_options ( id )')
        .eq('product_id', productId)

      if (existingError) {
        console.error('[v0] Error fetching existing modifiers:', existingError)
        return false
      }

      const existingModifiers = existingRows || []
      const incomingModifierIds = new Set(sanitizedModifiers.map((modifier) => modifier.id))
      const removedModifierIds = existingModifiers
        .map((modifier: any) => modifier.id)
        .filter((id: string) => !incomingModifierIds.has(id))

      if (removedModifierIds.length > 0) {
        const { error } = await supabase
          .from('product_modifiers')
          .delete()
          .in('id', removedModifierIds)

        if (error) {
          console.error('[v0] Error deleting modifiers:', error)
          return false
        }
      }

      if (sanitizedModifiers.length > 0) {
        const { error } = await supabase.from('product_modifiers').upsert(
          sanitizedModifiers.map((modifier) => ({
            id: modifier.id,
            product_id: productId,
            name: modifier.name,
            type: modifier.type,
            required: modifier.required,
            display_order: modifier.displayOrder,
          })),
          { onConflict: 'id' }
        )

        if (error) {
          console.error('[v0] Error upserting modifiers:', error)
          return false
        }
      }

      for (const modifier of sanitizedModifiers) {
        const existingModifier = existingModifiers.find((row: any) => row.id === modifier.id)
        const existingOptionIds = (existingModifier?.modifier_options || []).map(
          (option: any) => option.id
        )
        const incomingOptionIds = new Set(modifier.options.map((option) => option.id))
        const removedOptionIds = existingOptionIds.filter(
          (id: string) => !incomingOptionIds.has(id)
        )

        if (removedOptionIds.length > 0) {
          const { error } = await supabase
            .from('modifier_options')
            .delete()
            .in('id', removedOptionIds)

          if (error) {
            console.error('[v0] Error deleting modifier options:', error)
            return false
          }
        }
      }

      const optionRows = sanitizedModifiers.flatMap((modifier) =>
        modifier.options.map((option) => ({
          id: option.id,
          modifier_id: modifier.id,
          name: option.name,
          price_delta: option.price,
          display_order: option.displayOrder,
        }))
      )

      if (optionRows.length > 0) {
        const { error } = await supabase
          .from('modifier_options')
          .upsert(optionRows, { onConflict: 'id' })

        if (error) {
          console.error('[v0] Error upserting modifier options:', error)
          return false
        }
      }

      return true
    } catch (error) {
      console.error('[v0] Unexpected error saving product modifiers:', error)
      return false
    }
  }

  async fetchInventoryItems(): Promise<ServiceResult<InventoryItem[]>> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return { data: null, error: 'Supabase credentials are missing.' }

      const { data, error } = await supabase
        .from('inventory_items')
        .select(
          `
          id,
          name,
          category,
          unit,
          stock_quantity,
          low_stock_threshold,
          par_level,
          track_inventory,
          used_by,
          created_at,
          updated_at
        `
        )
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        console.error('[v0] Error fetching inventory items:', error)
        return { data: null, error: error.message }
      }

      return { data: (data || []).map((row: any) => this.mapInventoryItemRow(row)) }
    } catch (error) {
      console.error('[v0] Unexpected error fetching inventory items:', error)
      return { data: null, error: 'Could not load inventory items.' }
    }
  }

  async createInventoryItem(input: {
    name: string
    category: string
    unit: string
    stock: number
    lowThreshold: number
    parLevel: number
    track: boolean
    usedBy: string[]
  }): Promise<ServiceResult<InventoryItem>> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return { data: null, error: 'Supabase credentials are missing.' }

      const id = createRecordId(['inventory', input.category, input.name])
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          id,
          name: input.name,
          category: input.category,
          unit: input.unit,
          stock_quantity: input.stock,
          low_stock_threshold: input.lowThreshold,
          par_level: input.parLevel,
          track_inventory: input.track,
          used_by: input.usedBy,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('[v0] Error creating inventory item:', error)
        return { data: null, error: error.message }
      }

      return { data: this.mapInventoryItemRow(data) }
    } catch (error) {
      console.error('[v0] Unexpected error creating inventory item:', error)
      return { data: null, error: 'Could not create inventory item.' }
    }
  }

  async updateInventoryItem(
    itemId: string,
    updates: Partial<{
      name: string
      category: string
      unit: string
      lowThreshold: number
      parLevel: number
      track: boolean
      usedBy: string[]
    }>
  ): Promise<ServiceResult<InventoryItem>> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return { data: null, error: 'Supabase credentials are missing.' }

      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.category !== undefined) dbUpdates.category = updates.category
      if (updates.unit !== undefined) dbUpdates.unit = updates.unit
      if (updates.lowThreshold !== undefined) dbUpdates.low_stock_threshold = updates.lowThreshold
      if (updates.parLevel !== undefined) dbUpdates.par_level = updates.parLevel
      if (updates.track !== undefined) dbUpdates.track_inventory = updates.track
      if (updates.usedBy !== undefined) dbUpdates.used_by = updates.usedBy

      const { data, error } = await supabase
        .from('inventory_items')
        .update(dbUpdates)
        .eq('id', itemId)
        .select()
        .single()

      if (error) {
        console.error('[v0] Error updating inventory item:', error)
        return { data: null, error: error.message }
      }

      return { data: this.mapInventoryItemRow(data) }
    } catch (error) {
      console.error('[v0] Unexpected error updating inventory item:', error)
      return { data: null, error: 'Could not update inventory item.' }
    }
  }

  async adjustInventoryItemStock(
    itemId: string,
    quantityDelta: number,
    reason: InventoryMovementReason,
    note?: string
  ): Promise<ServiceResult<InventoryItem>> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return { data: null, error: 'Supabase credentials are missing.' }

      const { data, error } = await supabase.rpc('adjust_inventory_item_stock', {
        p_item_id: itemId,
        p_quantity_delta: quantityDelta,
        p_reason: reason,
        p_note: note || null,
      })

      if (error) {
        console.error('[v0] Error adjusting inventory item stock:', error)
        return { data: null, error: error.message }
      }

      const row = Array.isArray(data) ? data[0] : data
      if (!row) return { data: null, error: 'Inventory item was not found.' }

      return { data: this.mapInventoryItemRow(row) }
    } catch (error) {
      console.error('[v0] Unexpected error adjusting inventory item stock:', error)
      return { data: null, error: 'Could not adjust inventory stock.' }
    }
  }

  /**
   * Save a completed order to Supabase
   * Inserts order and associated order_items
   */
  async saveOrder(order: Order): Promise<ServiceResult<number>> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return { data: null, error: 'Supabase client not available' }

      const baseOrderInsert = {
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        payment_method: order.paymentMethod,
        notes: order.notes,
        status: order.status,
        created_at: new Date(order.timestamp).toISOString(),
      }

      const maxAttempts = 10
      let lastError: any = null

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const attemptOrderNumber = order.orderNumber + attempt

        // Insert order with the attempted order number
        let { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            ...baseOrderInsert,
            order_number: attemptOrderNumber,
            order_nickname: order.nickname || null,
            receipt_type: order.receiptPreference || 'none',
            receipt_phone: order.receiptPhone || null,
          })
          .select()

        // Retry without optional receipt columns if columns are missing
        if (
          orderError &&
          (orderError.code === '42703' || String(orderError.message).includes('column'))
        ) {
          console.warn('[v0] Retrying order save without optional receipt columns:', orderError)
          const retry = await supabase
            .from('orders')
            .insert({ ...baseOrderInsert, order_number: attemptOrderNumber })
            .select()
          orderData = retry.data
          orderError = retry.error
        }

        if (orderError) {
          const msg = String(orderError?.message || orderError)
          // Detect duplicate order number constraint and retry with next number
          if (msg.includes('orders_order_number_key') || msg.includes('duplicate key value') && msg.includes('order_number')) {
            lastError = orderError
            console.warn(`[v0] Duplicate order_number ${attemptOrderNumber}, trying ${attemptOrderNumber + 1}`)
            continue
          }

          console.error('[v0] Error saving order:', orderError)
          return { data: null, error: String(orderError?.message || orderError) }
        }

        const savedOrderId = orderData?.[0]?.id
        const savedOrderNumber = orderData?.[0]?.order_number || attemptOrderNumber

        if (!savedOrderId) {
          console.error('[v0] No order ID returned from Supabase')
          return { data: null, error: 'No order ID returned from Supabase' }
        }

        // Insert order items
        const itemsToInsert = order.items.map((item) => ({
          order_id: savedOrderId,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          price: item.price,
          modifiers: item.modifiers || {},
          created_at: new Date().toISOString(),
        }))

        const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert)

        if (itemsError) {
          console.error('[v0] Error saving order items:', itemsError)
          return { data: null, error: String(itemsError?.message || itemsError) }
        }

        console.log(`[v0] Successfully saved order ${savedOrderNumber} to Supabase`)
        return { data: savedOrderNumber }
      }

      return { data: null, error: String(lastError?.message || 'Exceeded attempts to find unique order number') }
    } catch (error) {
      console.error('[v0] Unexpected error saving order:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Fetch all orders from Supabase
   */
  async fetchOrdersResult(): Promise<ServiceResult<Order[]>> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return { data: null, error: 'Supabase credentials are missing.' }

      const { data: orders, error } = await supabase
        .from('orders')
        .select(
          `
          id,
          order_number,
          subtotal,
          tax,
          total,
          payment_method,
          notes,
          order_nickname,
          receipt_type,
          receipt_phone,
          status,
          created_at,
          order_items (
            id,
            product_id,
            product_name,
            quantity,
            price,
            modifiers
          )
        `
        )
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[v0] Error fetching orders:', error)
        return { data: null, error: error.message }
      }

      return { data: (orders || []).map((order: any) => ({
        id: `order-${order.order_number}`,
        orderNumber: order.order_number,
        items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          price: item.price,
          modifiers:
            typeof item.modifiers === 'string'
              ? JSON.parse(item.modifiers)
              : item.modifiers || {},
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        paymentMethod: order.payment_method,
        timestamp: order.created_at,
        status: order.status,
        notes: order.notes,
        nickname: order.order_nickname || '',
        receiptPreference: order.receipt_type || 'none',
        receiptPhone: order.receipt_phone || '',
      })) }
    } catch (error) {
      console.error('[v0] Unexpected error fetching orders:', error)
      return { data: null, error: 'Could not load orders.' }
    }
  }

  async fetchOrders(): Promise<Order[]> {
    const result = await this.fetchOrdersResult()
    return result.data || []
  }

  /**
   * Update order status in Supabase
   */
  async updateOrderStatus(
    orderNumber: number,
    status: 'pending' | 'preparing' | 'ready' | 'completed'
  ): Promise<boolean> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return false

      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('order_number', orderNumber)

      if (error) {
        console.error('[v0] Error updating order status:', error)
        return false
      }

      console.log(`[v0] Updated order ${orderNumber} status to ${status}`)
      return true
    } catch (error) {
      console.error('[v0] Unexpected error updating order status:', error)
      return false
    }
  }

  async updateOrderNickname(orderNumber: number, nickname: string): Promise<boolean> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return false

      const { error } = await supabase
        .from('orders')
        .update({
          order_nickname: nickname.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('order_number', orderNumber)

      if (error) {
        console.error('[v0] Error updating order nickname:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[v0] Unexpected error updating order nickname:', error)
      return false
    }
  }
}

export const supabaseService = new SupabaseService()
