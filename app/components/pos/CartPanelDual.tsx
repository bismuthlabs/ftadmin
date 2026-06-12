'use client'

import { useState, useEffect } from 'react'
import { useOrderStore } from '@/lib/stores/orderStore'
import { useMenuStore } from '@/lib/stores/menuStore'
import { broadcastService } from '@/lib/services/broadcastService'
import { supabaseService } from '@/lib/services/supabaseService'
import { formatCurrency } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Trash2, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'

/**
 * CartPanel for Dual-Screen POS
 * 
 * Features:
 * - Zustand state management instead of Context
 * - Automatic broadcasting of order updates
 * - Supabase persistence on payment completion
 * - Real-time sync to customer display
 */

export function CartPanelDual() {
  const {
    currentOrder,
    orderNotes,
    currentOrderNumber,
    removeFromCart,
    updateCartItem,
    setOrderNotes,
    clearCart,
    completeOrder,
    addOrder,
    setOrderNumber,
  } = useOrderStore()
  const { products } = useMenuStore()

  const [showPayment, setShowPayment] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Ensure order number persists
  useEffect(() => {
    const saved = localStorage.getItem('pos-order-number')
    if (saved) {
      setOrderNumber(parseInt(saved))
    }
  }, [setOrderNumber])

  // Save order number to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pos-order-number', currentOrderNumber.toString())
  }, [currentOrderNumber])

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId)
    } else {
      const item = currentOrder.find((i) => i.id === itemId)
      if (item) {
        updateCartItem(itemId, newQuantity, item.modifiers)
      }
    }
  }

  const handleCompletePayment = async (paymentMethod: string) => {
    setIsSaving(true)
    try {
      // Build order first. The cart is only cleared after Supabase confirms the save.
      const order = completeOrder(paymentMethod as any)

      if (order) {
        const result = await supabaseService.saveOrder(order)
        if (!result.data) {
          toast.error('Could not save order to Supabase.', {
            description: result.error || 'The cart is still here. Check the connection or database policies.',
          })
          return
        }

        const savedOrderNumber = result.data
        const savedOrder = { ...order, orderNumber: savedOrderNumber, id: `order-${savedOrderNumber}` }

        addOrder(savedOrder)
        broadcastService.broadcastPaymentComplete(savedOrder)
        toast.success('Order saved.')
        setShowPayment(false)
      }
    } catch (error) {
      console.error('[v0] Error completing payment:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate totals
  const subtotal = currentOrder.reduce((sum, item) => {
    return sum + item.price * item.quantity
  }, 0)

  const tax = subtotal * 0.08
  const total = subtotal + tax

  return (
    <>
      <div className="w-full md:w-86 bg-white rounded-xs shadow-sm p-7 flex flex-col gap-6 h-full md:max-h-[calc(100vh-2rem)] mt-5">
        {/* w-96 border-l border-slate-200 flex flex-col */}
        {/* Order Header */}
        {/* <div className="pb- border-b-2 border-slate-100"> */}
          {/* <p className="text-xs font-semibold uppercase text-slate-500 mb-2 py-3 tracking-wide">
            Current Order
          </p> */}
          {/* <div className="flex items-baseline gap-3">
            <p className="text-sm text-slate-600">Order #</p>
            <h2 className="text-4xl font-bold text-blue-600 font-mono">
              {String(currentOrderNumber).padStart(4, '0')}
            </h2>
          </div> */}
        {/* </div> */}
           <div className="text-left">
          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            Orders
          </h1>
          {/* <p className="text-xs text-slate-500 font-medium mt-1">Moments Served Cold.</p> */}
        </div>

        {/* Cart Items */}
        <div className="flex- overflow-y-auto space-y-3 pr-2">
          {currentOrder.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
              {/* <div className="text-7xl opacity-75">🛒</div> */}
              <div className="text-center">
                <p className="font-semibold text-slate-600 mb-1">Empty</p>
                <p className="text-sm text-slate-500">Order from the menu</p>
              </div>
            </div>
          ) : (
            currentOrder.map((item) => {
              const product = products.find((p) => p.id === item.productId)
              const productName = product?.name || item.productName
              const productPrice = product?.price || item.price

              return (
                <Card
                  key={item.id}
                  className="p-3 border border-slate-200 hover:border-blue-300 transition-all hover:shadow-md rounded-xs"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl bg-accent p-2 rounded-xl flex items-center justify-center text-center">
                          {product?.imageSrc ? (
                            <img
                              src={product.imageSrc}
                              alt={productName}
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          ) : (
                            product?.icon || '🍨'
                          )}
                        </span>
                        <div className="flex-1">
                          <p className="font-bol text-sm leading-tight text-slate-600">
                            {productName}
                          </p>
                          <p className="text-xs text-slate-900 font-semibold">
                            {formatCurrency(productPrice)} each
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        className="h-6 w-6 p-0 rounded-full"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-semibold text-slate-700 w-6 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="h-6 w-6 p-0 rounded-full"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>

                    <span className="text-xs font-bold text-slate-900 w-12 text-right">
                      {formatCurrency(productPrice * item.quantity)}
                    </span>
                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* Totals and Notes */}
        {currentOrder.length > 0 && (
          <>
            {/* Pricing Breakdown */}
            <div className="space-y-3 pt-6 border border-slate-100 bg-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Tax (8%):</span>
                <span className="font-semibold text-slate-900">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-slate-100">
                <span className="text-lg font-bold text-slate-500">Total:</span>
                <span className="text-2xl font-black text-slate-900">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Notes */}
            {/* <div>
              <p className="text-xs font-semibold uppercase text-slate-500 mb-2 tracking-wide">
                Special Requests
              </p>
              <Textarea
                placeholder="Add notes..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="resize-none h-20 rounded-lg border-slate-300 focus:border-blue-500 text-sm"
              />
            </div> */}

            {/* Action Buttons */}
            <div className="grid grid-cols gap-3 pt-2">
              <Button
                onClick={() => setShowPayment(true)}
                className="bg-blue-600 text-white rounded-xs font-bold text-base h-11 hover:bg-blue-700 shadow-sm"
              >
                Proceed 
                {/* {formatCurrency(total)} */}
              </Button>
              <Button
                variant="outline"
                onClick={clearCart}
                className="border-slate-30 border-0 text-slate-700 rounded-xs font-semibold h-11 px-0"
              >
                Clear
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModalDual
        open={showPayment}
        onOpenChange={setShowPayment}
        total={total}
        orderNumber={currentOrderNumber}
        onPaymentComplete={handleCompletePayment}
        isSaving={isSaving}
      />
    </>
  )
}

/**
 * Enhanced Payment Modal for Dual-Screen
 * Integrates with broadcast service and Supabase
 */
interface PaymentModalDualProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  orderNumber: number
  onPaymentComplete: (method: string) => Promise<void>
  isSaving: boolean
}

function PaymentModalDual({
  open,
  onOpenChange,
  total,
  orderNumber,
  onPaymentComplete,
  isSaving,
}: PaymentModalDualProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('card')
  const [tendered, setTendered] = useState(total.toFixed(2))

  const tenderedAmount = parseFloat(tendered) || 0
  const change = tenderedAmount - total

  const quickAmounts = [20, 50, 100]

  const paymentMethods = [
    { id: 'cash', label: 'Cash' },
    { id: 'card', label: 'Card' },
    { id: 'mobile', label: 'Mobile Pay' },
    { id: 'split', label: 'Split Bill' },
  ]

  const handlePayment = async () => {
    await onPaymentComplete(selectedMethod)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity ${
        open ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {open && (
        <div
          className="absolute inset-0 bg-black/50 bg-opacity-50"
          onClick={() => onOpenChange(false)}
        />
      )}

      {open && (
        <div className="relative bg-white rounded-xs shadow-2xl p-8 max-w-md w-full mx-4">
          {/* <div className="mb-6 pb-6 border-b-2 border-slate-100">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Order Payment</p>
            <p className="text-3xl font-bold text-slate-900">
              Order #{String(orderNumber).padStart(4, '0')}
            </p>
          </div> */}

          {/* Total Amount */}
          <div className="bg-blue-50 rounded-xs p-6 text-center mb-4 border border-blue-200">
            <p className="text-slate-700 text-sm mb-1">Total Amount</p>
            <p className="text-5xl font-black text-blue-600">{formatCurrency(total)}</p>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3 mb-6">
            <p className="text-xs font-semibold text-slate-500">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-3 rounded-xs border-2 transition-all font-medium ${
                    selectedMethod === method.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cash Handling */}
          {selectedMethod === 'cash' && (
            <div className="mb-6 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-2">
                  Amount Tendered
                </label>
                <input
                  type="number"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xs font-semibold text-lg focus:border-blue-500"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => setTendered(amount.toString())}
                    className="rounded-full border-slate-300 hover:border-blue-500"
                  >
                    {formatCurrency(amount)}
                  </Button>
                ))}
              </div>

              {/* Change Display */}
              {change !== 0 && (
                <div className="bg-green-50 border border-green-300 rounded-xs p-3">
                  <p className="text-xs text-green-700 mb-1">Change</p>
                  <p className="text-2xl font-bold text-green-600">
                    {change >= 0
                      ? formatCurrency(change)
                      : `-${formatCurrency(Math.abs(change))}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={handlePayment}
              disabled={selectedMethod === 'cash' && (tenderedAmount < total || !tendered) || isSaving}
              className="w-full bg-blue-600 text-white rounded-xs h-12 font-bold text-base hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Processing...' : 'Done'}
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                className="rounded-lg h-11 font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={selectedMethod === 'cash' && (tenderedAmount < total || !tendered) || isSaving}
                className="bg-slate-600 text-white rounded-xs h-11 font-semibold hover:bg-slate-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Pay & Print'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
