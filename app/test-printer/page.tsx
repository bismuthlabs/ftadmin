'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ReceiptPrinter } from '@/app/components/pos/ReceiptPrinter'
import { Order } from '@/lib/types'
import { Printer } from 'lucide-react'

export default function PrinterTestPage() {
  const mockOrder: Order = {
    id: 'test-order-1',
    orderNumber: 1001,
    items: [
      {
        id: '1',
        productId: 'boba-milk-tea',
        productName: 'Classic Boba Milk Tea',
        quantity: 2,
        price: 5.99,
        modifiers: { topping: 'Tapioca Pearls', iceLevel: 'Regular Ice' },
      },
      {
        id: '2',
        productId: 'matcha-latte',
        productName: 'Matcha Latte',
        quantity: 1,
        price: 6.49,
        modifiers: { temp: 'Hot' },
      },
      {
        id: '3',
        productId: 'mango-smoothie',
        productName: 'Mango Smoothie',
        quantity: 1,
        price: 5.49,
        modifiers: {},
      },
    ],
    total: 24.39,
    subtotal: 22.56,
    tax: 1.83,
    paymentMethod: 'cash',
    timestamp: new Date().toISOString(),
    status: 'completed',
    notes: 'Extra shot of espresso in the Matcha Latte. No ice in the first Boba Tea.',
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Printer className="w-10 h-10 text-blue-600" />
            POS Printer Test
          </h1>
          <p className="text-slate-600">Test the receipt printer functionality</p>
        </div>

        <Card className="p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Test Receipt</h2>

          <div className="bg-slate-100 rounded-lg p-6 mb-6 font-mono text-sm">
            <div className="text-center mb-4 border-b border-slate-300 pb-4">
              <p className="font-bold text-lg">Frozen Treats Cafe Receipt</p>
              <p className="text-xs">Dessert Cafe POS</p>
            </div>

            <div className="mb-4">
              <p className="font-bold">Order #1001</p>
              <p className="text-xs text-slate-600">{new Date().toLocaleString()}</p>
            </div>

            <div className="border-t border-b border-slate-300 py-4 mb-4">
              <div className="flex justify-between mb-2">
                <span>Classic Boba x2</span>
                <span>₵11.98</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Matcha Latte x1</span>
                <span>₵6.49</span>
              </div>
              <div className="flex justify-between">
                <span>Mango Smoothie x1</span>
                <span>₵5.49</span>
              </div>
            </div>

            <div className="space-y-2 mb-4 border-b border-slate-300 pb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₵23.96</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (8%):</span>
                <span>₵1.92</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>TOTAL:</span>
                <span>₵25.88</span>
              </div>
            </div>

            <div className="text-center text-xs mb-4">
              <p>Payment: Cash</p>
              <p>Status: Completed</p>
            </div>

            <div className="text-center text-xs">
              <p>Thank you for your purchase!</p>
              <p>━━━━━━━━━━━━━━━━━</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-slate-600 mb-4">
              Click the button below to open the print dialog. You can print to a physical receipt printer or save as PDF.
            </p>

            <div className="flex gap-3">
              <ReceiptPrinter order={mockOrder} />
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex-1 h-11 font-semibold rounded-lg"
              >
                Print Page
              </Button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="font-bold text-slate-900 mb-3">Features:</h3>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>✓ Formatted receipt in proper POS format (80mm width)</li>
              <li>✓ Ghana cedis (₵) currency display</li>
              <li>✓ Order details with item breakdown</li>
              <li>✓ Tax calculation display</li>
              <li>✓ Payment method and order status</li>
              <li>✓ Special order notes section</li>
              <li>✓ Print to any printer or PDF</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}
