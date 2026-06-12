'use client'

import { usePOS } from '@/app/context/POSContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { products } from '@/lib/data/products'
import { formatCurrency } from '@/lib/currency'
import { Trash2, Plus, Minus } from 'lucide-react'
import { PaymentModal } from './PaymentModal'
import { useState } from 'react'

export function CartPanel() {
  const { currentOrder, removeFromCart, updateCartItem, orderNotes, setOrderNotes, clearCart, orderNumber } = usePOS()
  const [showPayment, setShowPayment] = useState(false)

  // Calculate totals
  const subtotal = currentOrder.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)
    const price = product?.price || 0
    return sum + price * item.quantity
  }, 0)

  const tax = subtotal * 0.08
  const total = subtotal + tax

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

  return (
    <>
      <div className="w-full md:w-96 bg-white rounded-xl shadow-sm p-7 flex flex-col gap-6 h-full md:max-h-[calc(100vh-2rem)]">
        {/* Order Header */}
        <div className="pb-6 border-b-2 border-slate-100">
          <p className="text-xs font-semibold uppercase text-slate-500 mb-2 tracking-wide">Current Order</p>
          <div className="flex items-baseline gap-3">
            <p className="text-sm text-slate-600">Order #</p>
            <h2 className="text-4xl font-bold text-blue-600 font-mono">
              {String(orderNumber).padStart(4, '0')}
            </h2>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {currentOrder.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
              <div className="text-7xl opacity-75">🛒</div>
              <div className="text-center">
                <p className="font-semibold text-slate-600 mb-1">Cart is empty</p>
                <p className="text-sm text-slate-500">Select items from the menu</p>
              </div>
            </div>
          ) : (
            currentOrder.map((item) => {
              const product = products.find((p) => p.id === item.productId)
              if (!product) return null

              return (
                <Card key={item.id} className="p-3 border border-slate-200 hover:border-blue-300 transition-all hover:shadow-md">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{product.icon}</span>
                        <div className="flex-1">
                          <p className="font-bold text-sm leading-tight text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-600">
                            {formatCurrency(product.price)} each
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Modifiers */}
                  {Object.keys(item.modifiers).length > 0 && (
                    <div className="mb-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                      {Object.entries(item.modifiers).map(([key, value]) => (
                        <div key={key} className="truncate">
                          • {value}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quantity Control */}
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      className="h-7 w-7 p-0 hover:bg-blue-100"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="flex-1 text-center text-sm font-bold">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className="h-7 w-7 p-0 hover:bg-blue-100"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <span className="text-xs font-bold text-slate-700 w-12 text-right">
                      {formatCurrency(product.price * item.quantity)}
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
            <div className="space-y-3 pt-6 border-t-2 border-slate-100">
              <div className="flex justify-between items-center text-base">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-base">
                <span className="text-slate-600">Tax (8%):</span>
                <span className="font-semibold text-slate-900">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-slate-100">
                <span className="text-lg font-bold text-slate-900">Total:</span>
                <span className="text-2xl font-bold text-blue-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 mb-2 tracking-wide">Special Requests</p>
              <Textarea
                placeholder="Add notes..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="resize-none h-20 rounded-lg border-slate-300 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                onClick={clearCart}
                className="rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold h-11"
              >
                Clear Cart
              </Button>
              <Button
                onClick={() => setShowPayment(true)}
                className="bg-blue-600 text-white rounded-lg font-bold text-base h-11 hover:bg-blue-700 shadow-sm"
              >
                Checkout {formatCurrency(total)}
              </Button>
            </div>
          </>
        )}
      </div>

      {showPayment && <PaymentModal open={showPayment} onOpenChange={setShowPayment} total={total} />}
    </>
  )
}
