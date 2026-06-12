'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { Order } from '@/lib/types'

interface ReceiptPrinterProps {
  order: Order
  compact?: boolean
}

export function ReceiptPrinter({ order, compact = false }: ReceiptPrinterProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [printSuccess, setPrintSuccess] = useState(false)

  const handlePrint = () => {
    setIsPrinting(true)

    const printed = printReceipt(order)
    if (!printed) {
      setIsPrinting(false)
      return
    }

    setPrintSuccess(true)
    setIsPrinting(false)
    setTimeout(() => setPrintSuccess(false), 2000)
  }

  return (
    <>
      <Button
        onClick={handlePrint}
        disabled={isPrinting}
        className={`${compact ? 'w-full h-9 text-sm' : 'flex-1 h-11'
          } rounded-lg font-semibold transition-all ${printSuccess
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-slate-600 hover:bg-slate-700 text-white'
          }`}
      >
        {printSuccess ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Printed
          </>
        ) : (
          <>
            <Printer className="w-4 h-4 mr-2" />
            {compact ? 'Print' : 'Print Receipt'}
          </>
        )}
      </Button>
    </>
  )
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function printReceipt(order: Order, printWindow?: Window | null): boolean {
  const receiptContent = generateReceiptHTML(order)
  const targetWindow = printWindow || window.open('', '_blank')

  if (!targetWindow) {
    return false
  }

  targetWindow.document.open()
  targetWindow.document.write(receiptContent)
  targetWindow.document.close()
  targetWindow.focus()

  const triggerPrint = () => {
    targetWindow.print()
  }

  if (targetWindow.document.readyState === 'complete') {
    setTimeout(triggerPrint, 100)
  } else {
    targetWindow.addEventListener('load', triggerPrint, { once: true })
  }

  return true
}

function generateReceiptHTML(order: Order): string {
  const paymentMethod = order.paymentMethod || 'cash'
  const orderDate = new Date(order.timestamp)
  const dateStr = orderDate.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
  const timeStr = orderDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const receiptRows = order.items
    .map((item) => {
      const itemTotal = item.price * item.quantity
      const modifierText = Object.values(item.modifiers || {})
        .filter(Boolean)
        .map(escapeHtml)
        .join(', ')
      return `
        <tr>
          <td style="text-align: left; padding: 4px 0;">
            ${escapeHtml(item.productName)} x${item.quantity}
            ${modifierText ? `<br><span style="font-size: 10px;">${modifierText}</span>` : ''}
          </td>
          <td style="text-align: right; padding: 4px 0;">${formatCurrency(itemTotal)}</td>
        </tr>
      `
    })
    .join('')

  const subtotal = order.subtotal ?? order.items.reduce((sum, item) => {
    return sum + item.price * item.quantity
  }, 0)
  const tax = order.tax ?? Math.max(0, order.total - subtotal)

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt #${String(order.orderNumber).padStart(4, '0')}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            margin: 0;
            padding: 0;
            background: white;
          }
          .receipt {
            width: 100%;
            padding: 10mm;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 16px;
            font-weight: bold;
          }
          .header p {
            margin: 2px 0;
            font-size: 12px;
          }
          .order-info {
            text-align: center;
            margin-bottom: 10px;
            font-size: 11px;
          }
          .divider {
            border-bottom: 1px dashed #000;
            margin: 8px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            font-size: 12px;
          }
          th {
            text-align: left;
            padding: 4px 0;
            border-bottom: 1px solid #000;
            font-weight: bold;
          }
          td {
            padding: 4px 0;
          }
          .totals {
            margin: 8px 0;
            font-size: 12px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
          }
          .total-amount {
            font-weight: bold;
            font-size: 14px;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 6px 0;
          }
          .payment-info {
            text-align: center;
            margin-top: 8px;
            font-size: 11px;
            border-top: 1px dashed #000;
            padding-top: 8px;
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 10px;
            color: #555;
          }
          @media print {
            body {
              width: 80mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>Frozen Treats Cafe</h1>
            <p>Dessert Cafe POS</p>
          </div>

          <div class="order-info">
            <p><strong>Order #${String(order.orderNumber).padStart(4, '0')}</strong></p>
            <p>${dateStr} ${timeStr}</p>
          </div>

          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${receiptRows}
            </tbody>
          </table>

          <div class="divider"></div>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            <div class="total-row">
              <span>Tax (8%):</span>
              <span>${formatCurrency(tax)}</span>
            </div>
            <div class="total-row total-amount">
              <span>TOTAL:</span>
              <span>${formatCurrency(order.total)}</span>
            </div>
          </div>

          <div class="payment-info">
            <p><strong>Payment Method:</strong> ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</p>
            <p><strong>Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</p>
          </div>

          <div class="divider"></div>

          ${order.notes ? `<div style="margin: 8px 0; font-size: 11px; text-align: center;"><p><strong>Notes:</strong></p><p>${escapeHtml(order.notes)}</p></div>` : ''}

          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>━━━━━━━━━━━━━━━━━━━━</p>
          </div>
        </div>
      </body>
    </html>
  `
}
