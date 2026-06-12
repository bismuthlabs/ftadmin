'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  Clock,
  Flame,
  Loader2,
  MessageSquareText,
  ReceiptText,
  RotateCcw,
  Search,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

import { TopBar } from '../components/pos/TopBar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { broadcastService } from '@/lib/services/broadcastService'
import { supabaseService } from '@/lib/services/supabaseService'
import { useOrderStore } from '@/lib/stores/orderStore'
import { Order, OrderStatus } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

const statuses: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed']

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    badge: 'bg-amber-100 text-amber-800',
    panel: 'border-amber-200 bg-amber-50',
    next: 'preparing' as OrderStatus,
    action: 'Start Preparing',
  },
  preparing: {
    label: 'Preparing',
    icon: Flame,
    badge: 'bg-red-100 text-red-800',
    panel: 'border-red-200 bg-red-50',
    next: 'ready' as OrderStatus,
    action: 'Mark Ready',
  },
  ready: {
    label: 'Ready',
    icon: Zap,
    badge: 'bg-green-100 text-green-800',
    panel: 'border-green-200 bg-green-50',
    next: 'completed' as OrderStatus,
    action: 'Complete',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    badge: 'bg-blue-100 text-blue-800',
    panel: 'border-blue-200 bg-blue-50',
    next: null,
    action: '',
  },
}

function formatOrderAge(timestamp: Date | string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
  )

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return new Date(timestamp).toLocaleDateString()
}

export default function OrdersPage() {
  const router = useRouter()
  const {
    allOrders,
    replaceCurrentOrder,
    setOrders,
    updateOrderStatus,
    updateOrderNickname,
  } = useOrderStore()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [savingNickname, setSavingNickname] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true)
      setLoadError('')
      const result = await supabaseService.fetchOrdersResult()
      if (result.error) {
        setOrders([])
        setLoadError(result.error)
        toast.error('Could not load orders from Supabase.', {
          description: result.error,
        })
      } else {
        setOrders(result.data || [])
      }
      setIsLoading(false)
    }

    void loadOrders()
  }, [setOrders])

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return allOrders

    return allOrders.filter((order) => {
      const searchable = [
        String(order.orderNumber),
        order.nickname || '',
        order.notes || '',
        order.receiptPhone || '',
        ...order.items.map((item) => item.productName),
      ]
        .join(' ')
        .toLowerCase()

      return searchable.includes(normalizedQuery)
    })
  }, [allOrders, query])

  const orderCounts = useMemo(() => {
    return statuses.reduce(
      (counts, status) => ({
        ...counts,
        [status]: filteredOrders.filter((order) => order.status === status).length,
      }),
      {} as Record<OrderStatus, number>
    )
  }, [filteredOrders])

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    setUpdatingStatus(order.id)
    const saved = await supabaseService.updateOrderStatus(order.orderNumber, status)
    setUpdatingStatus(null)

    if (!saved) {
      toast.error('Status was not saved.', {
        description: 'The order was left unchanged. Try again when the connection is stable.',
      })
      return
    }

    updateOrderStatus(order.id, status)
    broadcastService.broadcastOrderStatusChange(order.id, status)
    toast.success(`Order #${String(order.orderNumber).padStart(4, '0')} is ${status}.`)
  }

  const handleNicknameSave = async (order: Order, nickname: string) => {
    const nextNickname = nickname.trim()
    setSavingNickname(order.id)
    const saved = await supabaseService.updateOrderNickname(order.orderNumber, nextNickname)
    setSavingNickname(null)

    if (!saved) {
      toast.error('Nickname was not saved.', {
        description: 'The order was left unchanged. Edit the field and leave it again to retry.',
      })
      return
    }

    updateOrderNickname(order.id, nextNickname)
    toast.success(nextNickname ? 'Order nickname saved.' : 'Order nickname cleared.')
  }

  const handleReorder = (order: Order) => {
    replaceCurrentOrder(order.items, order.notes || '')
    broadcastService.broadcastOrderUpdate(order.items)
    toast.success(`Order #${String(order.orderNumber).padStart(4, '0')} loaded in POS.`)
    router.push('/pos')
  }

  const renderOrders = (orders: Order[]) => {
    if (isLoading) {
      return (
        <div className="flex min-h-80 items-center justify-center text-slate-500">
          <Loader2 className="mr-2 animate-spin" />
          Loading orders...
        </div>
      )
    }

    if (orders.length === 0) {
      return (
        <div className="flex min-h-80 flex-col items-center justify-center text-center text-slate-500">
          <ReceiptText className="mb-3" />
          <p className="font-semibold">{loadError ? 'Orders could not load' : 'No orders found'}</p>
          <p className="text-sm">Completed POS orders will appear here.</p>
          {loadError && <p className="mt-1 max-w-md text-xs text-red-600">{loadError}</p>}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {orders.map((order) => {
          const config = statusConfig[order.status]
          const Icon = config.icon
          const receiptLabel =
            order.receiptPreference === 'sms'
              ? `SMS ${order.receiptPhone || ''}`.trim()
              : order.receiptPreference === 'paper'
                ? 'Paper receipt'
                : 'No receipt'

          return (
            <Card key={order.id} className={cn('border', config.panel)}>
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      #{String(order.orderNumber).padStart(4, '0')}
                    </CardTitle>
                    <p className="text-sm text-slate-600">
                      {formatOrderAge(order.timestamp)} ·{' '}
                      {new Date(order.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <Badge className={config.badge}>
                    <Icon data-icon="inline-start" />
                    {config.label}
                  </Badge>
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                    Customer nickname / usual name
                    <Input
                      defaultValue={order.nickname || ''}
                      placeholder="e.g. Ama's usual"
                      onBlur={(event) => {
                        if (event.target.value.trim() !== (order.nickname || '').trim()) {
                          void handleNicknameSave(order, event.target.value)
                        }
                      }}
                    />
                  </label>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleReorder(order)}
                      className="w-full sm:w-auto"
                    >
                      <RotateCcw data-icon="inline-start" />
                      Reorder
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                <div className="rounded-xs bg-white/80 p-3">
                  <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>Items</span>
                    <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3 text-sm">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.quantity} x {item.productName}
                          </p>
                          {Object.keys(item.modifiers || {}).length > 0 && (
                            <p className="text-xs text-slate-500">
                              {Object.values(item.modifiers).join(' · ')}
                            </p>
                          )}
                        </div>
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xs bg-white/80 p-3">
                    <p className="text-xs font-semibold text-slate-500">Subtotal</p>
                    <p className="font-bold text-slate-900">{formatCurrency(order.subtotal)}</p>
                  </div>
                  <div className="rounded-xs bg-white/80 p-3">
                    <p className="text-xs font-semibold text-slate-500">Tax</p>
                    <p className="font-bold text-slate-900">{formatCurrency(order.tax)}</p>
                  </div>
                  <div className="rounded-xs bg-white/80 p-3">
                    <p className="text-xs font-semibold text-slate-500">Total</p>
                    <p className="font-bold text-slate-900">{formatCurrency(order.total)}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xs bg-white/80 p-3">
                    <p className="text-xs font-semibold text-slate-500">Payment</p>
                    <p className="font-semibold capitalize text-slate-900">
                      {order.paymentMethod || 'Not recorded'}
                    </p>
                  </div>
                  <div className="rounded-xs bg-white/80 p-3">
                    <p className="text-xs font-semibold text-slate-500">Receipt</p>
                    <p className="font-semibold text-slate-900">{receiptLabel}</p>
                  </div>
                </div>

                {order.notes && (
                  <div className="flex gap-2 rounded-xs bg-white/80 p-3 text-sm text-slate-700">
                    <MessageSquareText className="mt-0.5 shrink-0" />
                    <p>{order.notes}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  {config.next && (
                    <Button
                      type="button"
                      onClick={() => void handleStatusChange(order, config.next!)}
                      disabled={updatingStatus === order.id}
                    >
                      {updatingStatus === order.id && (
                        <Loader2 data-icon="inline-start" className="animate-spin" />
                      )}
                      {config.action}
                    </Button>
                  )}
                  {savingNickname === order.id && (
                    <p className="flex items-center text-sm font-medium text-slate-500">
                      <Loader2 className="mr-2 animate-spin" />
                      Saving nickname...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <TopBar />

      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">Orders</h1>
              {/* <p className="text-sm text-slate-500">
                View order history, label regulars, and load any order back into POS.
              </p> */}
            </div>

            <label className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search order, nickname, item, phone..."
                className="pl-10 placeholder:text-xs"
              />
            </label>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 lg:grid-cols-5">
              <TabsTrigger value="all">All ({filteredOrders.length})</TabsTrigger>
              {statuses.map((status) => (
                <TabsTrigger key={status} value={status}>
                  {statusConfig[status].label} ({orderCounts[status]})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-4">
              {renderOrders(filteredOrders)}
            </TabsContent>
            {statuses.map((status) => (
              <TabsContent key={status} value={status} className="mt-4">
                {renderOrders(filteredOrders.filter((order) => order.status === status))}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
    </div>
  )
}
