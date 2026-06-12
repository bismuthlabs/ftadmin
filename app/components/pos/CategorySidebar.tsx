'use client'

import { usePOS } from '@/app/context/POSContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { categories } from '@/lib/data/products'

export function CategorySidebar() {
  const { selectedCategory, setSelectedCategory, searchQuery, setSearchQuery } = usePOS()

  return (
    <div className="w-full md:w-80 bg-white rounded-xl shadow-sm p-7 flex flex-col gap-8 h-full md:max-h-[calc(100vh-2rem)]">
      {/* Logo Section */}
      <div className="flex flex-col items-center gap-3 pb-6 border-b border-slate-200">
        <div className="text-6xl">🍰</div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600 leading-tight">
            Frozen Treats
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Dessert Cafe POS</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-base placeholder:text-slate-400"
        />
      </div>

      {/* Category Section Label */}
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500 mb-3 tracking-wide">Categories</p>

        {/* Category Buttons */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
              className={`w-full justify-start h-11 rounded-lg font-medium transition-all duration-200 text-base ${selectedCategory === category
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                  : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-600 border-slate-200'
                }`}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Today's Specials */}
      <div className="mt-auto pt-6 border-t border-slate-200">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <h3 className="font-bold text-sm text-blue-900 mb-3 flex items-center gap-2">
            <span>⭐</span> Today&apos;s Specials
          </h3>
          <ul className="text-xs text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Matcha Latte -20%</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Chocolate Cake +1 Scoop</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Boba Tea Bundle Deal</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
