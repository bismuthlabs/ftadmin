'use client'

import { useEffect, useState } from 'react'
import { usePOS } from '@/app/context/POSContext'
import { TopBar } from '../components/pos/TopBar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Gift, Phone, User } from 'lucide-react'

export default function CustomersPage() {
  const { setCurrentPage } = usePOS()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setCurrentPage('customers')
  }, [setCurrentPage])

  // Mock customer data
  const customers = [
    {
      id: '1',
      name: 'Emma Johnson',
      phone: '(555) 123-4567',
      loyaltyPoints: 850,
      visitCount: 24,
      lastVisit: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      tier: 'Gold',
    },
    {
      id: '2',
      name: 'Michael Chen',
      phone: '(555) 234-5678',
      loyaltyPoints: 520,
      visitCount: 15,
      lastVisit: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      tier: 'Silver',
    },
    {
      id: '3',
      name: 'Sarah Williams',
      phone: '(555) 345-6789',
      loyaltyPoints: 1250,
      visitCount: 38,
      lastVisit: new Date(Date.now() - 12 * 60 * 60 * 1000),
      tier: 'Platinum',
    },
    {
      id: '4',
      name: 'James Rodriguez',
      phone: '(555) 456-7890',
      loyaltyPoints: 340,
      visitCount: 9,
      lastVisit: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      tier: 'Bronze',
    },
    {
      id: '5',
      name: 'Lisa Park',
      phone: '(555) 567-8901',
      loyaltyPoints: 2100,
      visitCount: 52,
      lastVisit: new Date(),
      tier: 'Platinum',
    },
  ]

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
  )

  const tierColors = {
    Bronze: 'bg-amber-100 text-amber-800',
    Silver: 'bg-slate-100 text-slate-800',
    Gold: 'bg-yellow-100 text-yellow-800',
    Platinum: 'bg-purple-100 text-purple-800',
  }

  const getPointsBonus = (tier: string): number => {
    switch (tier) {
      case 'Bronze':
        return 1
      case 'Silver':
        return 1.25
      case 'Gold':
        return 1.5
      case 'Platinum':
        return 2
      default:
        return 1
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <TopBar />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Customer Loyalty Program</h1>
          <p className="text-slate-600 mb-6">Manage and track customer relationships</p>

          {/* Search Bar */}
          <Card className="mb-6 p-4 border-2 border-pink-100 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by name or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 rounded-xl border-2 border-pink-200 focus:border-pink-500"
              />
            </div>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 border-2 border-blue-100 bg-blue-50">
              <p className="text-sm text-slate-600 mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-blue-600">{customers.length}</p>
            </Card>
            <Card className="p-4 border-2 border-green-100 bg-green-50">
              <p className="text-sm text-slate-600 mb-1">Points Issued</p>
              <p className="text-3xl font-bold text-green-600">
                {customers.reduce((sum, c) => sum + c.loyaltyPoints, 0)}
              </p>
            </Card>
            <Card className="p-4 border-2 border-orange-100 bg-orange-50">
              <p className="text-sm text-slate-600 mb-1">Avg Visits</p>
              <p className="text-3xl font-bold text-orange-600">
                {(customers.reduce((sum, c) => sum + c.visitCount, 0) / customers.length).toFixed(1)}
              </p>
            </Card>
            <Card className="p-4 border-2 border-purple-100 bg-purple-50">
              <p className="text-sm text-slate-600 mb-1">Platinum Members</p>
              <p className="text-3xl font-bold text-purple-600">
                {customers.filter((c) => c.tier === 'Platinum').length}
              </p>
            </Card>
          </div>

          {/* Customers List */}
          <div className="space-y-3">
            {filteredCustomers.length === 0 ? (
              <Card className="p-12 border-2 border-pink-100 text-center">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No customers found</p>
              </Card>
            ) : (
              filteredCustomers.map((customer) => (
                <Card
                  key={customer.id}
                  className="p-4 border-2 border-pink-100 hover:border-pink-300 transition-all"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    {/* Customer Info */}
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{customer.name}</h3>
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Loyalty Points */}
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Loyalty Points</p>
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-yellow-500" />
                        <p className="text-lg font-bold text-slate-900">{customer.loyaltyPoints}</p>
                      </div>
                    </div>

                    {/* Tier and Visits */}
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Member Tier</p>
                      <Badge className={tierColors[customer.tier as keyof typeof tierColors]}>
                        {customer.tier}
                      </Badge>
                      <p className="text-xs text-slate-600 mt-2">
                        {customer.visitCount} visit{customer.visitCount !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Bonus Rate */}
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Points Multiplier</p>
                      <p className="text-xl font-bold text-orange-600">
                        {getPointsBonus(customer.tier)}x
                      </p>
                    </div>

                    {/* Last Visit and Action */}
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Last Visit</p>
                      <p className="text-sm font-medium text-slate-900 mb-2">
                        {new Date(customer.lastVisit).toLocaleDateString()}
                      </p>
                      <Button className="w-full bg-blue-600 text-white rounded-lg h-9 text-xs font-medium">
                        View Profile
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Tier Information */}
          <Card className="mt-8 p-6 border-2 border-pink-100">
            <h2 className="font-bold text-lg text-slate-900 mb-4">Loyalty Tier Benefits</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['Bronze', 'Silver', 'Gold', 'Platinum'].map((tier) => (
                <div key={tier}>
                  <p className={`font-bold mb-2 px-3 py-1 rounded-lg inline-block ${tierColors[tier as keyof typeof tierColors]}`}>
                    {tier}
                  </p>
                  <ul className="text-sm text-slate-600 space-y-1 mt-2">
                    <li>• {getPointsBonus(tier)}x points</li>
                    <li>
                      • At {['1', '10', '25', '50'][['Bronze', 'Silver', 'Gold', 'Platinum'].indexOf(tier)]} visits
                    </li>
                    <li>• Exclusive rewards</li>
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
