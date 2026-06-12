'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CartItem, Order, OrderStatus, PaymentMethod, StaffMember } from '@/lib/types'

interface POSContextType {
  // Current order state
  currentOrder: CartItem[]
  orderNotes: string
  selectedCustomerId?: string
  orderNumber: number
  
  // UI state
  isDarkMode: boolean
  currentPage: string
  selectedCategory: string
  searchQuery: string
  
  // Staff state
  currentStaff: StaffMember
  
  // All orders history
  allOrders: Order[]
  
  // Actions
  addToCart: (item: CartItem) => void
  removeFromCart: (itemId: string) => void
  updateCartItem: (itemId: string, quantity: number, modifiers?: Record<string, string>) => void
  clearCart: () => void
  completeOrder: (paymentMethod: PaymentMethod) => void
  setOrderNotes: (notes: string) => void
  setSelectedCustomerId: (customerId?: string) => void
  setDarkMode: (isDark: boolean) => void
  setCurrentPage: (page: string) => void
  setSelectedCategory: (category: string) => void
  setSearchQuery: (query: string) => void
  updateOrderStatus: (orderId: string, status: OrderStatus) => void
}

const POSContext = createContext<POSContextType | undefined>(undefined)

export function POSProvider({ children }: { children: React.ReactNode }) {
  const [currentOrder, setCurrentOrder] = useState<CartItem[]>([])
  const [orderNotes, setOrderNotes] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [orderNumber, setOrderNumber] = useState(1000)
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [currentStaff] = useState<StaffMember>({
    id: 'staff-1',
    name: 'Sarah Chen',
    role: 'cashier',
  })

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pos-state')
    if (saved) {
      try {
        const state = JSON.parse(saved)
        setCurrentOrder(state.currentOrder || [])
        setOrderNotes(state.orderNotes || '')
        setSelectedCustomerId(state.selectedCustomerId)
        setIsDarkMode(state.isDarkMode || false)
        setCurrentPage(state.currentPage || 'dashboard')
        setSelectedCategory(state.selectedCategory || 'All')
        setOrderNumber(state.orderNumber || 1000)
        setAllOrders(state.allOrders || [])
      } catch (error) {
        console.error('[v0] Error loading POS state from localStorage:', error)
      }
    }
  }, [])

  // Save to localStorage whenever state changes
  useEffect(() => {
    const state = {
      currentOrder,
      orderNotes,
      selectedCustomerId,
      isDarkMode,
      currentPage,
      selectedCategory,
      orderNumber,
      allOrders,
    }
    localStorage.setItem('pos-state', JSON.stringify(state))
  }, [currentOrder, orderNotes, selectedCustomerId, isDarkMode, currentPage, selectedCategory, orderNumber, allOrders])

  const addToCart = useCallback((item: CartItem) => {
    setCurrentOrder((prev) => [...prev, item])
  }, [])

  const removeFromCart = useCallback((itemId: string) => {
    setCurrentOrder((prev) => prev.filter((item) => item.id !== itemId))
  }, [])

  const updateCartItem = useCallback(
    (itemId: string, quantity: number, modifiers?: Record<string, string>) => {
      setCurrentOrder((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, quantity, modifiers: modifiers || item.modifiers } : item
        )
      )
    },
    []
  )

  const clearCart = useCallback(() => {
    setCurrentOrder([])
    setOrderNotes('')
    setSelectedCustomerId(undefined)
  }, [])

  const completeOrder = useCallback(
    (paymentMethod: PaymentMethod) => {
      if (currentOrder.length === 0) return

      // Calculate totals
      const subtotal = currentOrder.reduce((sum, item) => {
        const price = require('@/lib/data/products').products.find((p: any) => p.id === item.productId)?.price || 0
        return sum + price * item.quantity
      }, 0)
      const tax = subtotal * 0.08
      const total = subtotal + tax

      const newOrder: Order = {
        id: `order-${Date.now()}`,
        orderNumber,
        items: currentOrder,
        subtotal,
        tax,
        total,
        status: 'pending',
        timestamp: new Date(),
        notes: orderNotes,
        paymentMethod,
        customerId: selectedCustomerId,
      }

      setAllOrders((prev) => [newOrder, ...prev])
      setOrderNumber((prev) => prev + 1)
      clearCart()
    },
    [currentOrder, orderNotes, selectedCustomerId, orderNumber, clearCart]
  )

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setAllOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status } : order))
    )
  }, [])

  const value: POSContextType = {
    currentOrder,
    orderNotes,
    selectedCustomerId,
    orderNumber,
    isDarkMode,
    currentPage,
    selectedCategory,
    searchQuery,
    currentStaff,
    allOrders,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    completeOrder,
    setOrderNotes,
    setSelectedCustomerId,
    setDarkMode: setIsDarkMode,
    setCurrentPage,
    setSelectedCategory,
    setSearchQuery,
    updateOrderStatus,
  }

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>
}

export function usePOS() {
  const context = useContext(POSContext)
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider')
  }
  return context
}
