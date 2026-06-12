'use client'

import { useEffect, useState } from 'react'
import { useUIStore } from '@/lib/stores/uiStore'
import { useMenuStore } from '@/lib/stores/menuStore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/currency'
import { ModifierModalDual } from './ModifierModalDual'
import { Product } from '@/lib/types'
import { Plus } from 'lucide-react'

/**
 * ProductGrid for Dual-Screen POS
 * Uses Zustand for UI state instead of Context
 */

export function ProductGridDual() {
  const { selectedCategory, searchQuery } = useUIStore()
  const { products, isLoading, loadMenu } = useMenuStore()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showModifierModal, setShowModifierModal] = useState(false)

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  // Filter products based on category and search
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleAddProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowModifierModal(true)
  }

  return (
    <div className="flex-1 overflow-auto pb-8">
      {filteredProducts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div className="text-slate-400">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-lg font-semibold">No products found</p>
            <p className="text-sm">Try different search or category</p>
          </div>
        </div>
      ) : (
        <div className="overflow-y-auto grid grid-cols-4 gap-1">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="p-4 rounded-xs hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer border border-slate-200"
              onClick={() => handleAddProduct(product)}
            >
              <div className="flex flex-col">
                <div className="h-16 flex items-center justify-start gap-3 mb-2 overflow-hidden rounded-xs bg-slate-">
                  {/* Product Icon */}
                  <div className="h-16 flex items-center justify-center mb-2 overflow-hidden rounded-xs bg-slate-50">
                    {product.imageSrc ? (
                      <img
                        src={product.imageSrc}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl">{product.icon}</span>
                    )}
                  </div>

                  {/* Product Name */}
                  <p className="font-semibold text-xs text-slate-900 mb-1 line-clamp-2">
                    {product.name}
                  </p>
                </div>

                {/* Badges */}
                {product.isSpecial && (
                  <Badge className="mb-2 w-fit bg-amber-100 text-amber-800">
                    ⭐ Special
                  </Badge>
                )}

                {/* Spacer */}
                {/* <div className="flex-1" /> */}

                {/* Footer */}
                <div className="flex items-center justify-between mt-aut">
                  <span className="text-xs font- text-slate-900">
                    {formatCurrency(product.price)}
                  </span>
                  <Button
                    size="sm"
                    className="bg-slate-900 hover:bg-slate-700 text-white h-7 w-7 p-0 rounded-full flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isLoading && (
        <p className="mt-3 text-xs text-slate-400">Refreshing menu...</p>
      )}

      {/* Modifier Modal */}
      {selectedProduct && (
        <ModifierModalDual
          open={showModifierModal}
          onOpenChange={setShowModifierModal}
          product={selectedProduct}
        />
      )}
    </div>
  )
}
