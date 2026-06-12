'use client'

import { useEffect, useRef } from 'react'
import { useUIStore } from '@/lib/stores/uiStore'
import { useMenuStore } from '@/lib/stores/menuStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'

export function CategorySidebarDual() {
  const { selectedCategory, setSelectedCategory, searchQuery, setSearchQuery } = useUIStore()
  const { categories, loadMenu } = useMenuStore()

  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    loadMenu()

    const onKeyDown = (e: KeyboardEvent) => {
      // Focus search when pressing '/'
      if (e.key === '/') {
        const active = document.activeElement as HTMLElement | null
        const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
        if (!isTyping) {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [loadMenu])

  return (
    <div className="bg-whit border- border-slate-200 py-5 shadow-s">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 items-start">
          {/* Search Bar - Prominent and well-fitted */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search menu items..."
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-full border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-base placeholder:text-slate-400 w-full"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => searchInputRef.current?.focus()}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm px-2 py-1 border border-slate-200 rounded"
                aria-label="Focus search (shortcut: /)"
                title="Press / to focus search"
              >
                /
              </button>
            )}
          </div>

          {/* Categories - Wrap on all screen sizes */}
          <div className="flex-1 w-full">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category)}
                  className={`shrink-0 h-11 px-6 rounded-xs font-medium whitespace-nowrap transition-all duration-200 text-sm ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}