'use client'

import { useState } from 'react'
import { useOrderStore } from '@/lib/stores/orderStore'
import { Button } from '@/components/ui/button'
import { Product, CartItem } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { Plus, Minus, X } from 'lucide-react'
import { randomUUID } from 'crypto'

/**
 * Modifier Modal for Dual-Screen POS
 * Uses Zustand for order state instead of Context
 * Allows users to customize products before adding to cart
 */

interface ModifierModalDualProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
}

export function ModifierModalDual({
  open,
  onOpenChange,
  product,
}: ModifierModalDualProps) {
  const { addToCart } = useOrderStore()
  const [quantity, setQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string>>({})

  const handleModifierChange = (groupName: string, optionName: string) => {
    setSelectedModifiers((prev) => ({
      ...prev,
      [groupName]: optionName,
    }))
  }

  const handleAddToCart = () => {
    const cartItem: CartItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: product.id,
      productName: product.name,
      quantity,
      price: product.price,
      modifiers: selectedModifiers,
    }

    addToCart(cartItem)
    setQuantity(1)
    setSelectedModifiers({})
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 bg-opacity-50" onClick={() => onOpenChange(false)} />
      
      <div className="relative bg-white rounded-xs shadow-2xl p-8 max-w-xl w-full mx-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>

        {/* Product Header */}
        <div className="mb-6">
          <div className="text-6xl mb-4">{product.icon}</div>
          <h2 className="text-base font- text-slate-900 mb-1">{product.name}</h2>
          <p className="text-3xl font-black text-slate-900 mt-2">
            GH{formatCurrency(product.price)}
          </p>
        </div>

        {/* Modifiers */}
        {product.modifiers && product.modifiers.length > 0 && (
          <div className="space-y-4 mb-6">
            {product.modifiers.map((modifier) => (
              <div key={modifier.name}>
                <p className="text-sm font-semibold text-slate-900 mb-2">
                  {modifier.name}
                </p>
                <div className="space-y-1">
                  {modifier.options.map((option) => (
                    <label
                      key={option.name}
                      className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50"
                    >
                      <input
                        type="radio"
                        name={modifier.name}
                        value={option.name}
                        checked={selectedModifiers[modifier.name] === option.name}
                        onChange={() => handleModifierChange(modifier.name, option.name)}
                        className="w-4 h-4"
                      />
                      <span className="flex-1 text-sm">{option.name}</span>
                      {option.price && option.price > 0 && (
                        <span className="text-sm text-slate-600">
                          +{formatCurrency(option.price)}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quantity Selector */}
        <div className="mb-6">
          {/* <p className="text-xs font-semibold uppercase text-slate-500 mb-3">Quantity</p> */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-10 w-10 p-0 rounded-full"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-lg font-bold text-slate-900 min-w-12 text-center">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(quantity + 1)}
              className="h-10 w-10 p-0 rounded-full"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Add to Cart Button */}
        <Button
          onClick={handleAddToCart}
          className="w-full bg-blue-600 text-white rounded-xs font-bold text-lg h-12 hover:bg-blue-700"
        >
          Order {quantity} <span className="text-slate-">-</span> {formatCurrency(product.price * quantity)}
        </Button>
      </div>
    </div>
  )
}
