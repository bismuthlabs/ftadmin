'use client'
// 
import { useEffect, useMemo, useState } from 'react'
import { Clock, MessageSquareText, QrCode, ReceiptText, Smartphone } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBroadcast } from '@/lib/hooks/useBroadcast'
import { CartItem, Order, ReceiptPreference } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'

const MOMO_NUMBER = '0540521305'
const MOMO_NAME = 'EDK FROZEN TREATS'
const MERCHANT_ID = '754830'
const PAYMENT_URL = 'https://edkft.com/pay'

const CURRENT_ORDER_KEY = 'pos-current-order'
const RECEIPT_KEY = 'pos-receipt-preference'
const RECEIPT_PHONE_KEY = 'pos-receipt-phone'

function loadStoredOrder() {
  if (typeof window === 'undefined') return []

  try {
    return JSON.parse(localStorage.getItem(CURRENT_ORDER_KEY) || '[]') as CartItem[]
  } catch (error) {
    console.error('[v0] Failed to load customer display order:', error)
    return []
  }
}

function getPaymentUrl(total: number) {
  const params = new URLSearchParams({
    amount: total.toFixed(2),
    currency: 'GHS',
  })

  return `${PAYMENT_URL}?${params.toString()}`
}

function getQrImageUrl(total: number) {
  const paymentUrl = getPaymentUrl(total)
  const params = new URLSearchParams({
    size: '288x288',
    data: paymentUrl,
  })

  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`
}

export default function CustomerDisplay() {
  const [currentItems, setCurrentItems] = useState<CartItem[]>([])
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [receiptPreference, setReceiptPreference] = useState<ReceiptPreference>('none')
  const [receiptPhone, setReceiptPhone] = useState('')

  useEffect(() => {
    setCurrentItems(loadStoredOrder())
    setReceiptPreference(
      (localStorage.getItem(RECEIPT_KEY) as ReceiptPreference | null) || 'none'
    )
    setReceiptPhone(localStorage.getItem(RECEIPT_PHONE_KEY) || '')

    const onStorage = (event: StorageEvent) => {
      if (event.key === CURRENT_ORDER_KEY) {
        setCurrentItems(loadStoredOrder())
        setCompletedOrder(null)
      }
      if (event.key === RECEIPT_KEY) {
        setReceiptPreference((event.newValue as ReceiptPreference | null) || 'none')
      }
      if (event.key === RECEIPT_PHONE_KEY) {
        setReceiptPhone(event.newValue || '')
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useBroadcast('order-update', (items: CartItem[]) => {
    setCurrentItems(items)
    setCompletedOrder(null)
    localStorage.setItem(CURRENT_ORDER_KEY, JSON.stringify(items))
  })

  useBroadcast('payment-complete', (order: Order) => {
    setCompletedOrder(order)
    setCurrentItems([])
    localStorage.setItem(CURRENT_ORDER_KEY, JSON.stringify([]))
  })

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const subtotal = currentItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.08
  const total = subtotal + tax
  const hasOrder = currentItems.length > 0
  const displayOrder = completedOrder?.items || currentItems
  const displaySubtotal = completedOrder?.subtotal ?? subtotal
  const displayTax = completedOrder?.tax ?? tax
  const displayTotal = completedOrder?.total ?? total

  const qrImageUrl = useMemo(() => (hasOrder ? getQrImageUrl(total) : ''), [hasOrder, total])
  const paymentUrl = useMemo(() => (hasOrder ? getPaymentUrl(total) : ''), [hasOrder, total])

  const updateReceiptPreference = (preference: ReceiptPreference) => {
    setReceiptPreference(preference)
    localStorage.setItem(RECEIPT_KEY, preference)
    if (preference !== 'sms') {
      setReceiptPhone('')
      localStorage.setItem(RECEIPT_PHONE_KEY, '')
    }
  }

  const updateReceiptPhone = (phone: string) => {
    setReceiptPhone(phone)
    localStorage.setItem(RECEIPT_PHONE_KEY, phone)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-linear-to-br from-blue-50 to-blue-100">
      <section className="flex flex-1 flex-col overflow-auto p-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              {completedOrder ? 'Order Complete' : hasOrder ? 'Your Order' : 'Welcome'}
            </h1>
            {completedOrder ? (
              <p className="mt-2 text-lg font-medium text-green-700">
                Thank you for your purchase.
              </p>
            ) : (
              <p className="mt-2 text-slate-500">
                {hasOrder ? 'Review your items and choose your receipt.' : 'Your order will appear here.'}
              </p>
            )}
          </div>

          {displayOrder.length === 0 ? (
            <div className="mt-16 rounded-xs border border-dashed border-blue-200 bg-white/70 p-12 text-center">
              <ReceiptText className="mx-auto mb-4 text-slate-400" />
              <p className="text-xl font-semibold text-slate-600">Waiting for your order</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {displayOrder.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xs border border-blue-100 bg-white px-8 py-4 shadow"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{item.productName}</p>
                      {Object.keys(item.modifiers || {}).length > 0 && (
                        <p className="mt-1 text-xs text-slate-600">
                          {Object.values(item.modifiers).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xs bg-white p-8 shadow">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatCurrency(displaySubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Tax (8%)</span>
                    <span className="font-semibold">{formatCurrency(displayTax)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-6">
                    <div className="flex justify-between text-4xl font-black text-blue-600">
                      <span>Total</span>
                      <span>{formatCurrency(displayTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {!completedOrder && (
                <div className="rounded-xs bg-white p-6 shadow">
                  <div className="mb-4 flex items-center gap-2">
                    <MessageSquareText className="text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900">Receipt</h2>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { value: 'none', label: 'None' },
                      { value: 'paper', label: 'Paper receipt' },
                      { value: 'sms', label: 'SMS receipt' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateReceiptPreference(option.value as ReceiptPreference)}
                        className={`rounded-xs border px-4 py-3 text-sm font-semibold ${
                          receiptPreference === option.value
                            ? 'border-blue-600 bg-blue-50 text-blue-900'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {receiptPreference === 'sms' && (
                    <label className="mt-4 flex flex-col gap-1 text-sm font-semibold text-slate-700">
                      Phone number
                      <Input
                        type="tel"
                        value={receiptPhone}
                        onChange={(event) => updateReceiptPhone(event.target.value)}
                        placeholder="Customer phone number"
                      />
                    </label>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
            <Clock className="size-3" />
            {currentTime}
          </div>
        </div>
      </section>

      <section className="flex w-5/12 flex-col border-l border-slate-200 bg-white p-10">
        <Tabs defaultValue="scan" className="flex min-h-0 flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan">
              <QrCode data-icon="inline-start" />
              Scan to Pay
            </TabsTrigger>
            <TabsTrigger value="momo">
              <Smartphone data-icon="inline-start" />
              Our MOMO Number
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="flex flex-1 flex-col items-center justify-center">
            {hasOrder ? (
              <div className="flex flex-col items-center text-center">
                <h2 className="mb-2 text-4xl font-black text-slate-900">Scan to pay</h2>
                <p className="mb-6 text-slate-500">{formatCurrency(total)}</p>
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xs bg-slate-100 p-4 shadow-inner"
                >
                  <img
                    src={qrImageUrl}
                    alt="Payment QR code"
                    className="size-72 object-contain"
                  />
                </a>
              </div>
            ) : (
              <div className="flex size-72 flex-col items-center justify-center rounded-xs border border-dashed border-slate-300 bg-slate-50 text-center">
                <QrCode className="mb-3 text-slate-400" />
                <p className="font-semibold text-slate-600">Waiting for your order</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="momo" className="flex flex-1 flex-col items-center justify-center">
            <div className="flex flex-col gap-6 text-center">
              <div>
                <p className="text-sm text-slate-500">MOMO Number</p>
                <p className="text-4xl font-black tracking-wider text-slate-900">{MOMO_NUMBER}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Account Name</p>
                <p className="text-2xl font-bold text-slate-800">{MOMO_NAME}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Merchant ID</p>
                <p className="font-mono text-3xl font-black text-slate-900">{MERCHANT_ID}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}
