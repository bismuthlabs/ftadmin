'use client'

import { useState } from 'react'
import { usePOS } from '@/app/context/POSContext'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PaymentMethod } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { CreditCard, DollarSign, Smartphone, Users } from 'lucide-react'
import { ReceiptPrinter } from './ReceiptPrinter'

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  orderNumber?: number
}

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { id: 'cash', label: 'Cash', icon: <DollarSign className="w-6 h-6" /> },
  { id: 'card', label: 'Card', icon: <CreditCard className="w-6 h-6" /> },
  { id: 'mobile', label: 'Mobile Pay', icon: <Smartphone className="w-6 h-6" /> },
  { id: 'split', label: 'Split Bill', icon: <Users className="w-6 h-6" /> },
]

export function PaymentModal({ open, onOpenChange, total, orderNumber }: PaymentModalProps) {
  const { completeOrder, currentOrder } = usePOS()
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card')
  const [tendered, setTendered] = useState(total.toFixed(2))
  const [showPrintSuccess, setShowPrintSuccess] = useState(false)

  const handlePayment = () => {
    completeOrder(selectedMethod)
    onOpenChange(false)
  }

  const tenderedAmount = parseFloat(tendered) || 0
  const change = tenderedAmount - total

  const quickAmounts = [20, 50, 100]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-slate-900">Payment</DialogTitle>
          <DialogDescription>Complete the transaction</DialogDescription>
        </DialogHeader>

        {/* Total Amount */}
        <div className="bg-blue-50 rounded-xl p-6 text-center my-4 border border-blue-200">
          <p className="text-slate-700 text-sm mb-1">Total Amount</p>
          <p className="text-5xl font-bold text-blue-600">
            {formatCurrency(total)}
          </p>
        </div>

        {/* Payment Methods */}
        <div>
          <p className="font-bold text-sm text-slate-700 mb-3">Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`p-4 rounded-xl border transition-all duration-200 font-medium flex flex-col items-center gap-2 ${
                  selectedMethod === method.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {method.icon}
                {method.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cash-specific Amount Input */}
        {selectedMethod === 'cash' && (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tendered Amount
                </label>
                <Input
                  type="number"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  className="h-12 text-lg border-slate-300 focus:border-blue-500 rounded-xl"
                  placeholder="0.00"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => setTendered(amount.toString())}
                    className="rounded-lg border-slate-300 hover:border-blue-500"
                  >
                    {formatCurrency(amount)}
                  </Button>
                ))}
              </div>

              {/* Change Display */}
              {change !== 0 && (
                <div className="bg-green-50 border border-green-300 rounded-xl p-3">
                  <p className="text-xs text-green-700 mb-1">Change</p>
                  <p className="text-2xl font-bold text-green-600">
                    {change >= 0 ? formatCurrency(change) : `-${formatCurrency(Math.abs(change))}`}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={handlePayment}
            disabled={selectedMethod === 'cash' && (tenderedAmount < total || !tendered)}
            className="w-full bg-blue-600 text-white rounded-lg h-12 font-bold text-base hover:bg-blue-700 disabled:opacity-50"
          >
            Complete Payment
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-lg h-11 font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handlePayment()
                setTimeout(() => {
                  if (orderNumber) {
                    const mockOrder = {
                      id: `order-${orderNumber}`,
                      orderNumber,
                      items: currentOrder,
                      total,
                      subtotal: total / 1.08,
                      paymentMethod: selectedMethod,
                      timestamp: new Date().toISOString(),
                      status: 'completed' as const,
                      notes: '',
                    }
                    // Trigger print through a custom event
                    window.dispatchEvent(new CustomEvent('print-receipt', { detail: mockOrder }))
                  }
                }, 300)
              }}
              className="bg-slate-600 text-white rounded-lg h-11 font-semibold hover:bg-slate-700"
            >
              Print Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
