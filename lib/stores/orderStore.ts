import { create } from 'zustand'
import { CartItem, Order, OrderStatus, PaymentMethod, ReceiptPreference } from '@/lib/types'

const CURRENT_ORDER_KEY = 'pos-current-order'
const ORDER_NOTES_KEY = 'pos-order-notes'
const ORDER_NUMBER_KEY = 'pos-order-number'
const RECEIPT_KEY = 'pos-receipt-preference'
const RECEIPT_PHONE_KEY = 'pos-receipt-phone'

type StoredReceipt = {
  preference: ReceiptPreference
  phone: string
}

interface OrderState {
  currentOrder: CartItem[]
  orderNotes: string
  selectedCustomerId?: string
  currentOrderNumber: number
  allOrders: Order[]

  addToCart: (item: CartItem) => void
  removeFromCart: (itemId: string) => void
  updateCartItem: (itemId: string, quantity: number, modifiers?: Record<string, string>) => void
  clearCart: () => void
  replaceCurrentOrder: (items: CartItem[], notes?: string) => void
  completeOrder: (paymentMethod: PaymentMethod) => Order | null
  setOrderNotes: (notes: string) => void
  setSelectedCustomerId: (customerId?: string) => void
  setOrderNumber: (number: number) => void
  setOrders: (orders: Order[]) => void
  addOrder: (order: Order) => void
  updateOrderStatus: (orderId: string, status: OrderStatus) => void
  updateOrderNickname: (orderId: string, nickname: string) => void
  loadOrdersFromStorage: () => void
  getCurrentOrderTotal: () => number
}

function canUseStorage() {
  return typeof window !== 'undefined'
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback

  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch (error) {
    console.error(`[v0] Failed to read ${key} from storage:`, error)
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return
  localStorage.setItem(key, JSON.stringify(value))
}

function readReceipt(): StoredReceipt {
  if (!canUseStorage()) return { preference: 'none', phone: '' }

  return {
    preference: (localStorage.getItem(RECEIPT_KEY) as ReceiptPreference | null) || 'none',
    phone: localStorage.getItem(RECEIPT_PHONE_KEY) || '',
  }
}

function persistCurrentOrder(items: CartItem[], notes = '') {
  writeJson(CURRENT_ORDER_KEY, items)
  if (canUseStorage()) {
    localStorage.setItem(ORDER_NOTES_KEY, notes)
  }
}

function persistOrderNumber(orderNumber: number) {
  if (!canUseStorage()) return
  localStorage.setItem(ORDER_NUMBER_KEY, orderNumber.toString())
}

function cloneReorderItems(items: CartItem[]) {
  return items.map((item) => ({
    ...item,
    id: `reorder-${item.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    modifiers: { ...(item.modifiers || {}) },
  }))
}

export const useOrderStore = create<OrderState>((set, get) => ({
  currentOrder: [],
  orderNotes: '',
  selectedCustomerId: undefined,
  currentOrderNumber: 1000,
  allOrders: [],

  addToCart: (item: CartItem) => {
    set((state) => {
      const existingItem = state.currentOrder.find(
        (cartItem) =>
          cartItem.productId === item.productId &&
          JSON.stringify(cartItem.modifiers || {}) === JSON.stringify(item.modifiers || {})
      )

      const currentOrder = existingItem
        ? state.currentOrder.map((cartItem) =>
            cartItem.id === existingItem.id
              ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
              : cartItem
          )
        : [...state.currentOrder, item]

      persistCurrentOrder(currentOrder, state.orderNotes)
      return { currentOrder }
    })
  },

  removeFromCart: (itemId: string) => {
    set((state) => {
      const currentOrder = state.currentOrder.filter((item) => item.id !== itemId)
      persistCurrentOrder(currentOrder, state.orderNotes)
      return { currentOrder }
    })
  },

  updateCartItem: (itemId: string, quantity: number, modifiers?: Record<string, string>) => {
    set((state) => {
      const currentOrder = state.currentOrder.map((item) =>
        item.id === itemId ? { ...item, quantity, modifiers: modifiers || item.modifiers } : item
      )
      persistCurrentOrder(currentOrder, state.orderNotes)
      return { currentOrder }
    })
  },

  clearCart: () => {
    persistCurrentOrder([], '')
    if (canUseStorage()) {
      localStorage.setItem(RECEIPT_KEY, 'none')
      localStorage.setItem(RECEIPT_PHONE_KEY, '')
    }
    set({ currentOrder: [], orderNotes: '', selectedCustomerId: undefined })
  },

  replaceCurrentOrder: (items: CartItem[], notes = '') => {
    const currentOrder = cloneReorderItems(items)
    persistCurrentOrder(currentOrder, notes)
    set({ currentOrder, orderNotes: notes, selectedCustomerId: undefined })
  },

  completeOrder: (paymentMethod: PaymentMethod) => {
    const state = get()
    if (state.currentOrder.length === 0) return null

    const subtotal = state.currentOrder.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
    const tax = subtotal * 0.08
    const total = subtotal + tax
    const receipt = readReceipt()

    const order: Order = {
      id: `order-${state.currentOrderNumber}`,
      orderNumber: state.currentOrderNumber,
      items: state.currentOrder,
      subtotal,
      tax,
      total,
      paymentMethod,
      timestamp: new Date().toISOString(),
      status: 'pending',
      notes: state.orderNotes,
      customerId: state.selectedCustomerId,
      receiptPreference: receipt.preference,
      receiptPhone: receipt.preference === 'sms' ? receipt.phone.trim() : undefined,
    }

    return order
  },

  setOrderNotes: (notes: string) => {
    persistCurrentOrder(get().currentOrder, notes)
    set({ orderNotes: notes })
  },

  setSelectedCustomerId: (customerId?: string) => {
    set({ selectedCustomerId: customerId })
  },

  setOrderNumber: (number: number) => {
    persistOrderNumber(number)
    set({ currentOrderNumber: number })
  },

  setOrders: (orders: Order[]) => {
    set({ allOrders: orders })
  },

  addOrder: (order: Order) => {
    set((state) => {
      const allOrders = [order, ...state.allOrders]
      const nextOrderNumber = Math.max(state.currentOrderNumber, order.orderNumber + 1)
      persistCurrentOrder([], '')
      persistOrderNumber(nextOrderNumber)
      return {
        allOrders,
        currentOrder: [],
        orderNotes: '',
        selectedCustomerId: undefined,
        currentOrderNumber: nextOrderNumber,
      }
    })
  },

  updateOrderStatus: (orderId: string, status: OrderStatus) => {
    set((state) => {
      const allOrders = state.allOrders.map((order) =>
        order.id === orderId ? { ...order, status } : order
      )
      return { allOrders }
    })
  },

  updateOrderNickname: (orderId: string, nickname: string) => {
    set((state) => {
      const allOrders = state.allOrders.map((order) =>
        order.id === orderId ? { ...order, nickname } : order
      )
      return { allOrders }
    })
  },

  loadOrdersFromStorage: () => {
    if (!canUseStorage()) return

    const currentOrder = readJson<CartItem[]>(CURRENT_ORDER_KEY, [])
    const orderNotes = localStorage.getItem(ORDER_NOTES_KEY) || ''
    const savedOrderNumber = Number(localStorage.getItem(ORDER_NUMBER_KEY) || 1000)

    set({
      currentOrder,
      orderNotes,
      currentOrderNumber: Number.isFinite(savedOrderNumber) ? savedOrderNumber : 1000,
    })
  },

  getCurrentOrderTotal: () => {
    const state = get()
    const subtotal = state.currentOrder.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
    return subtotal + subtotal * 0.08
  },
}))
