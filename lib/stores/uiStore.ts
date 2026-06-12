import { create } from 'zustand'

/**
 * UI State Store using Zustand
 * Manages UI-related state like category selection and search
 */

interface UIState {
  selectedCategory: string
  searchQuery: string
  setSelectedCategory: (category: string) => void
  setSearchQuery: (query: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedCategory: 'All',
  searchQuery: '',
  setSelectedCategory: (category: string) => {
    set({ selectedCategory: category })
  },
  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },
}))
