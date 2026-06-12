export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed'
export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'split'
export type ModifierType = 'topping' | 'flavor' | 'size' | 'level' | 'option'
export type ReceiptPreference = 'none' | 'paper' | 'sms'
export type InventoryCategory =
  | 'Ice Cream'
  | 'Drinks'
  | 'Toppings'
  | 'Bakery'
  | 'Packaging'
  | 'General'
export type InventoryMovementReason = 'received' | 'used' | 'adjustment' | 'to_par'

export interface ModifierOption {
  id: string
  name: string
  price?: number
}

export interface Modifier {
  id: string
  name: string
  type: ModifierType
  required: boolean
  options: ModifierOption[]
}

export interface ProductCategory {
  id: string
  name: string
}

export interface Product {
  id: string
  name: string
  price: number
  category: string
  description: string
  icon: string
  imageSrc?: string | null
  modifiers: Modifier[]
  isBestseller?: boolean
  isSpecial?: boolean
  isActive?: boolean
  stockQuantity?: number
  lowStockThreshold?: number
  trackInventory?: boolean
}

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  unit: string
  stock: number
  lowThreshold: number
  parLevel: number
  track: boolean
  usedBy: string[]
  lastUpdated: string
}

export interface CartItem {
  id: string
  productId: string
  productName: string
  quantity: number
  price: number
  modifiers: Record<string, string> // modifier.id -> selected option name
  notes?: string
}

export interface Order {
  id: string
  orderNumber: number
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  status: OrderStatus
  timestamp: Date | string
  notes?: string
  paymentMethod?: PaymentMethod
  customerId?: string
  nickname?: string
  receiptPreference?: ReceiptPreference
  receiptPhone?: string
}

export interface Customer {
  id: string
  phone: string
  name: string
  loyaltyPoints: number
  visitCount: number
  lastVisit?: Date
}

export interface StaffMember {
  id: string
  name: string
  role: 'cashier' | 'barista' | 'manager'
}
