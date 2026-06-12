import { TopBar } from './components/pos/TopBar'
import { CategorySidebar } from './components/pos/CategorySidebar'
import { ProductGrid } from './components/pos/ProductGrid'
import { CartPanel } from './components/pos/CartPanel'

export default function Dashboard() {
  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* <TopBar /> */}
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6 flex flex-col md:flex-row items-center justify-center gap-6">
          <h1>Hello World</h1>
          {/* Left Sidebar */}
          {/* <CategorySidebar /> */}

          {/* Center: Product Grid */}
          {/* <div className="flex-1 h-full">
            <div className="bg-white rounded-xl shadow-sm p-7 h-full flex flex-col">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Menu</h2>
                <p className="text-sm text-slate-500 mt-1">Browse and select items</p>
              </div>
              <ProductGrid />
            </div>
          </div> */}

          {/* Right: Cart Panel */}
          {/* <CartPanel /> */}
        </div>
      </div>
    </div>
  )
}
