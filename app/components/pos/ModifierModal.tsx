'use client'

import { useState } from 'react'
import { usePOS } from '@/app/context/POSContext'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Product, CartItem } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { Plus, Minus } from 'lucide-react'

interface ModifierModalProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
}

export function ModifierModal({ product, open, onOpenChange, onClose }: ModifierModalProps) {
  const { addToCart } = usePOS()
  const [quantity, setQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string>>({})

  const handleAddModifier = (modifierId: string, optionId: string) => {
    setSelectedModifiers((prev) => ({
      ...prev,
      [modifierId]: optionId,
    }))
  }

  const handleAddToCart = () => {
    const cartItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      quantity,
      price: product.price,
      modifiers: selectedModifiers,
    }

    // Add to cart multiple times if quantity > 1
    for (let i = 0; i < quantity; i++) {
      addToCart({
        ...cartItem,
        id: `${product.id}-${Date.now()}-${i}`,
      })
    }

    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <span className="text-6xl">{product.icon}</span>
            <div className="flex-1">
              <DialogTitle className="text-2xl text-slate-900">{product.name}</DialogTitle>
              <DialogDescription className="text-base mt-1">
                {product.description}
              </DialogDescription>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {formatCurrency(product.price)}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Modifiers */}
        <div className="space-y-6 my-6">
          {product.modifiers.map((modifier) => (
            <div key={modifier.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900">{modifier.name}</h3>
                {modifier.required && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                    Required
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modifier.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleAddModifier(modifier.id, option.id)}
                    className={`p-3 rounded-xl font-medium transition-all text-left border duration-200 ${
                      selectedModifiers[modifier.id] === option.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option.name}</span>
                      {option.price && option.price > 0 && (
                        <span className="text-sm">+{formatCurrency(option.price)}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quantity Selector */}
        <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
          <span className="font-medium text-slate-700">Quantity</span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="rounded-lg"
            >
              <Minus className="w-5 h-5" />
            </Button>
            <span className="font-bold text-xl w-8 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
              className="rounded-lg"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleAddToCart}
            className="bg-blue-600 text-white rounded-xl font-bold text-lg h-12 hover:bg-blue-700"
          >
            Add {quantity} to Cart {formatCurrency(product.price * quantity)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
