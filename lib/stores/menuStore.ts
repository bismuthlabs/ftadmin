import { create } from 'zustand'
import { products as fallbackProducts } from '@/lib/data/products'
import { categories as fallbackCategories } from '@/lib/data/categories'
import { supabaseService } from '@/lib/services/supabaseService'
import type { Product } from '@/lib/types'

interface MenuState {
  products: Product[]
  categories: string[]
  isLoading: boolean
  error?: string
  loadMenu: () => Promise<void>
}

const initialCategories = fallbackCategories.includes('All')
  ? fallbackCategories
  : ['All', ...fallbackCategories]

export const useMenuStore = create<MenuState>((set) => ({
  products: fallbackProducts,
  categories: initialCategories,
  isLoading: false,
  error: undefined,

  loadMenu: async () => {
    set({ isLoading: true, error: undefined })

    const menu = await supabaseService.fetchMenu()
    if (menu.products.length === 0) {
      set({
        products: fallbackProducts,
        categories: initialCategories,
        isLoading: false,
        error: 'Using local fallback menu. Check Supabase credentials/schema.',
      })
      return
    }

    set({
      products: menu.products,
      categories: menu.categories.length > 0 ? menu.categories : initialCategories,
      isLoading: false,
      error: undefined,
    })
  },
}))
