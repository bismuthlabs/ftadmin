'use client'

import { useEffect } from 'react'
import { useOrderStore } from '@/lib/stores/orderStore'
import { broadcastService } from '@/lib/services/broadcastService'
import { TopBar } from '@/app/components/pos/TopBar'
import { CategorySidebarDual } from '@/app/components/pos/CategorySidebarDual'
import { ProductGridDual } from '@/app/components/pos/ProductGridDual'
import { CartPanelDual } from '@/app/components/pos/CartPanelDual'

/**
 * Cashier Screen (/pos)
 * 
 * Main POS interface for cashiers to take orders
 * Features:
 * - Browse products and create orders
 * - Process payments
 * - Real-time sync to customer display via BroadcastChannel
 * - Persist orders to Supabase
 */

export default function CashierScreen() {
  const { currentOrder, loadOrdersFromStorage } = useOrderStore()

  useEffect(() => {
    // Restore the in-progress cart and receipt settings after a refresh.
    loadOrdersFromStorage()
  }, [loadOrdersFromStorage])

  // Broadcast cart updates to customer display
  useEffect(() => {
    broadcastService.broadcastOrderUpdate(currentOrder)
  }, [currentOrder])

  return (
    <div className="flex h-screen flex-col">
  {/* 1. Top Bar */}
  <TopBar />

  {/* 2. Main Content Area */}
  <div className="flex flex-1 overflow-hidden gap-4 px-4 md:px-0 max-w-7xl mx-auto">
    {/* Left Panel - Menu Area */}
    <div className="flex-1 flex flex-col gap-4">
      {/* Search + Category Filter */}
      <CategorySidebarDual />        {/* or SearchBar + CategorySidebarDual combined */}

      {/* Product Grid */}
      <ProductGridDual />
    </div>

    {/* Right Panel - Cart */}
    <CartPanelDual />
  </div>
</div>
    // <div className="flex flex-col h-screen bg-slate-50">
    //   <TopBar />

    //   <div className="flex-1 overflow-hidden">
    //       <CategorySidebarDual />
    //     <div className="h-full p-6 flex flex-col md:flex-row gap-4">
    //       {/* Left Sidebar - Product Menu */}
    //       <div className="flex-1 h-full">
    //         <div className="bg- h-full flex flex-col">
    //           <ProductGridDual />
    //         </div>
    //       </div>

    //       {/* Right - Cart Panel */}
    //       <CartPanelDual />
    //     </div>
    //   </div>
    // </div>
  )
}
