'use client'

import { useState } from 'react'
import { usePOS } from '@/app/context/POSContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { products } from '@/lib/data/products'
import { formatCurrency } from '@/lib/currency'
import { ModifierModal } from './ModifierModal'
import { Product } from '@/lib/types'
import { ShoppingCart } from 'lucide-react'

export function ProductGrid() {
  const { selectedCategory, searchQuery } = usePOS()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showModifierModal, setShowModifierModal] = useState(false)

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
    <>
      <div className="flex-1 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
            <div className="text-5xl">🔍</div>
            <p className="text-lg font-medium">No items found</p>
            <p className="text-sm">Try adjusting your search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group border border-slate-200 hover:border-blue-300"
                onClick={() => handleAddProduct(product)}
              >
                <div className="aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden">
                  <span className="text-6xl group-hover:scale-110 transition-transform duration-300">
                    {product.icon}
                  </span>
                  {product.isBestseller && (
                    <Badge className="absolute top-2 right-2 bg-blue-600 text-white border-0 text-xs">
                      Popular
                    </Badge>
                  )}
                </div>
                <div className="p-3 bg-white">
                  <h3 className="font-bold text-sm md:text-base text-slate-900 truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-600 truncate mb-2">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(product.price)}
                    </span>
                    <Button
                      size="sm"
                      className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg h-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddProduct(product)
                      }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <ModifierModal
          product={selectedProduct}
          open={showModifierModal}
          onOpenChange={setShowModifierModal}
          onClose={() => {
            setShowModifierModal(false)
            setSelectedProduct(null)
          }}
        />
      )}
    </>
  )
}
