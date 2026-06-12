'use client'

import { useEffect } from 'react'
import { usePOS } from '@/app/context/POSContext'
import { TopBar } from '../components/pos/TopBar'
import { Card } from '@/components/ui/card'
import { TrendingUp, DollarSign, ShoppingCart, Users } from 'lucide-react'

export default function ReportsPage() {
  const { setCurrentPage, allOrders } = usePOS()

  useEffect(() => {
    setCurrentPage('reports')
  }, [setCurrentPage])

  // Calculate statistics
  const completedOrders = allOrders.filter((o) => o.status === 'completed')
  const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0)
  const totalOrders = completedOrders.length
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const hourlyData = Array.from({ length: 12 }, (_, i) => ({
    hour: `${i + 8}:00`,
    orders: Math.floor(Math.random() * 8) + 2,
    revenue: Math.floor(Math.random() * 150) + 50,
  }))

  const topItems = [
    { name: 'Espresso Martini', orders: 12, revenue: 143.88 },
    { name: 'Chocolate Cake Slice', orders: 8, revenue: 55.92 },
    { name: 'Classic Boba Milk Tea', orders: 15, revenue: 89.85 },
    { name: 'Matcha Latte', orders: 10, revenue: 64.90 },
    { name: 'Strawberry Ice Cream', orders: 7, revenue: 38.43 },
  ]

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <TopBar />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Sales Reports</h1>
          <p className="text-slate-600 mb-6">Today&apos;s performance and analytics</p>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 border border-blue-200 bg-blue-50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-slate-900">
                    ${totalRevenue.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-xs text-slate-600 mt-3 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                +12% from yesterday
              </p>
            </Card>

            <Card className="p-6 border border-amber-200 bg-amber-50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-slate-900">{totalOrders}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-xs text-slate-600 mt-3 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                Peak hour: 12 PM
              </p>
            </Card>

            <Card className="p-6 border border-green-200 bg-green-50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Avg Order Value</p>
                  <p className="text-3xl font-bold text-slate-900">
                    ${avgOrderValue.toFixed(2)}
                  </p>
                </div>
                <ShoppingCart className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-xs text-slate-600 mt-3 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                Based on completed orders
              </p>
            </Card>

            <Card className="p-6 border border-slate-200 bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Transactions</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {['cash', 'card', 'mobile', 'split']
                      .map(
                        (method) =>
                          allOrders.filter(
                            (o) => o.status === 'completed' && o.paymentMethod === method
                          ).length
                      )
                      .reduce((a, b) => a + b, 0)}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
              <p className="text-xs text-slate-600 mt-3">Payment methods used</p>
            </Card>
          </div>

          {/* Charts and Data */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hourly Orders */}
            <Card className="lg:col-span-2 p-6 border-2 border-pink-100">
              <h2 className="font-bold text-lg text-slate-900 mb-4">Hourly Orders</h2>
              <div className="space-y-3">
                {hourlyData.map((data, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-600 w-12">{data.hour}</span>
                    <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-lg flex items-center justify-end pr-2"
                        style={{ width: `${(data.orders / 12) * 100}%` }}
                      >
                        <span className="text-xs font-bold text-white">{data.orders}</span>
                      </div>
                    </div>
                    <span className="text-sm text-slate-600 w-16 text-right">${data.revenue.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Payment Methods */}
            <Card className="p-6 border-2 border-orange-100">
              <h2 className="font-bold text-lg text-slate-900 mb-4">Payment Methods</h2>
              <div className="space-y-3">
                {['card', 'cash', 'mobile', 'split'].map((method) => {
                  const count = completedOrders.filter((o) => o.paymentMethod === method).length
                  const percentage = totalOrders > 0 ? (count / totalOrders) * 100 : 0
                  return (
                    <div key={method} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-600 capitalize w-16">{method}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-lg"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-900 w-10 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Top Items */}
          <Card className="mt-6 p-6 border-2 border-pink-100">
            <h2 className="font-bold text-lg text-slate-900 mb-4">Top Selling Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-pink-100">
                    <th className="text-left py-3 px-3 font-bold text-gray-700">Item</th>
                    <th className="text-right py-3 px-3 font-bold text-gray-700">Orders</th>
                    <th className="text-right py-3 px-3 font-bold text-gray-700">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((item, i) => (
                    <tr key={i} className="border-b border-gray-200 hover:bg-pink-50">
                      <td className="py-3 px-3">{item.name}</td>
                      <td className="text-right py-3 px-3 font-medium">{item.orders}</td>
                      <td className="text-right py-3 px-3 font-bold text-green-600">
                        ${item.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
