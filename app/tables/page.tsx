'use client'

import { useEffect } from 'react'
import { usePOS } from '@/app/context/POSContext'
import { TopBar } from '../components/pos/TopBar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Clock } from 'lucide-react'

export default function TablesPage() {
  const { setCurrentPage, allOrders } = usePOS()

  useEffect(() => {
    setCurrentPage('tables')
  }, [setCurrentPage])

  // Generate mock table data
  const tables = Array.from({ length: 12 }, (_, i) => {
    const tableNum = i + 1
    const activeOrders = allOrders.filter(
      (o) => o.status !== 'completed' && Math.random() > 0.6
    )
    const totalWaitTime =
      activeOrders.length > 0
        ? Math.floor((Date.now() - new Date(activeOrders[0].timestamp).getTime()) / 60000)
        : 0

    return {
      id: tableNum,
      number: tableNum,
      capacity: 2 + (tableNum % 4),
      occupied: Math.random() > 0.4,
      orders: activeOrders.slice(0, 1),
      waitTime: totalWaitTime,
    }
  })

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <TopBar />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Table Management</h1>
          <p className="text-slate-600 mb-6">Floor plan and table status</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tables.map((table) => (
              <Card
                key={table.id}
                className={`p-6 text-center border transition-all cursor-pointer hover:shadow-lg ${
                  table.occupied
                    ? 'bg-orange-50 border-orange-300'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* Table Number */}
                <div className="text-4xl font-bold text-slate-900 mb-2">
                  🪑 {table.number}
                </div>

                {/* Status */}
                {table.occupied ? (
                  <>
                    <Badge className="bg-orange-100 text-orange-800 mb-3">
                      Occupied
                    </Badge>
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-center gap-1 text-sm text-slate-600">
                        <Users className="w-4 h-4" />
                        <span>{table.capacity} seats</span>
                      </div>
                      {table.waitTime > 0 && (
                        <div className="flex items-center justify-center gap-1 text-sm text-orange-600 font-medium">
                          <Clock className="w-4 h-4" />
                          <span>{table.waitTime} min</span>
                        </div>
                      )}
                    </div>
                    <Button className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg h-9">
                      Check Order
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge className="bg-green-100 text-green-800 mb-3">
                      Available
                    </Badge>
                    <div className="flex items-center justify-center gap-1 text-sm text-slate-600 mt-3 mb-4">
                      <Users className="w-4 h-4" />
                      <span>{table.capacity} seats</span>
                    </div>
                    <Button className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg h-9">
                      New Order
                    </Button>
                  </>
                )}
              </Card>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-8 p-6 bg-white rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">Legend</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-100 border-2 border-orange-300" />
                <span className="text-sm text-slate-700">Occupied - Active Order</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-200" />
                <span className="text-sm text-slate-700">Available - No Orders</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
