'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Info,
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

import { TopBar } from '../components/pos/TopBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { supabaseService } from '@/lib/services/supabaseService'
import type { InventoryCategory, InventoryItem, InventoryMovementReason } from '@/lib/types'
import { cn } from '@/lib/utils'

type CreateInventoryForm = {
  name: string
  category: InventoryCategory
  unit: string
  stock: string
  lowThreshold: string
  parLevel: string
  track: boolean
  usedByText: string
}

const categoryOptions: Array<InventoryCategory | 'All'> = [
  'All',
  'Ice Cream',
  'Drinks',
  'Toppings',
  'Bakery',
  'Packaging',
  'General',
]

const createCategoryOptions: InventoryCategory[] = categoryOptions.filter(
  (category): category is InventoryCategory => category !== 'All'
)

const emptyCreateForm: CreateInventoryForm = {
  name: '',
  category: 'General',
  unit: '',
  stock: '0',
  lowThreshold: '0',
  parLevel: '1',
  track: true,
  usedByText: '',
}

function stockStatus(item: InventoryItem) {
  if (!item.track) return 'Not tracked'
  if (item.stock <= item.lowThreshold) return 'Low stock'
  if (item.stock <= item.lowThreshold * 1.5) return 'Watch'
  return 'Healthy'
}

function statusBadgeClass(status: string) {
  if (status === 'Low stock') return 'bg-red-100 text-red-800'
  if (status === 'Watch') return 'bg-amber-100 text-amber-800'
  if (status === 'Not tracked') return 'bg-slate-100 text-slate-700'
  return 'bg-emerald-100 text-emerald-800'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseNonNegativeNumber(value: string, fallback = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

function parseUsedBy(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function HelpTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <Info className="size-3.5" />
          <span className="sr-only">More information</span>
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6} className="max-w-64">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | 'All'>('All')
  const [movementQuantity, setMovementQuantity] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState<CreateInventoryForm>(emptyCreateForm)
  const [savingItems, setSavingItems] = useState<Record<string, boolean>>({})
  const [erroredItems, setErroredItems] = useState<Record<string, boolean>>({})

  const replaceItem = useCallback((updatedItem: InventoryItem) => {
    setItems((current) =>
      current.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    )
    setErroredItems((current) => ({ ...current, [updatedItem.id]: false }))
  }, [])

  const loadInventoryItems = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    const result = await supabaseService.fetchInventoryItems()

    if (result.error) {
      setItems([])
      setLoadError(result.error)
      toast.error('Could not load inventory from Supabase.', {
        description: result.error,
      })
    } else {
      setItems(result.data || [])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadInventoryItems()
  }, [loadInventoryItems])

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return items.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
      const matchesQuery =
        !normalizedQuery ||
        [item.name, item.category, item.unit, ...item.usedBy]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)

      return matchesCategory && matchesQuery
    })
  }, [items, query, selectedCategory])

  const trackedItems = useMemo(() => items.filter((item) => item.track), [items])
  const lowStockItems = useMemo(
    () => trackedItems.filter((item) => item.stock <= item.lowThreshold),
    [trackedItems]
  )
  const watchItems = useMemo(
    () =>
      trackedItems.filter(
        (item) => item.stock > item.lowThreshold && item.stock <= item.lowThreshold * 1.5
      ),
    [trackedItems]
  )
  const totalUnits = useMemo(
    () => trackedItems.reduce((sum, item) => sum + item.stock, 0),
    [trackedItems]
  )

  const updateItemLocal = (itemId: string, updates: Partial<InventoryItem>) => {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, ...updates, lastUpdated: new Date().toISOString() } : item
      )
    )
  }

  const saveItemSettings = async (
    item: InventoryItem,
    updates: Partial<Pick<InventoryItem, 'lowThreshold' | 'parLevel' | 'track'>>
  ) => {
    setSavingItems((current) => ({ ...current, [item.id]: true }))
    const result = await supabaseService.updateInventoryItem(item.id, updates)
    setSavingItems((current) => ({ ...current, [item.id]: false }))

    if (result.error || !result.data) {
      setErroredItems((current) => ({ ...current, [item.id]: true }))
      toast.error(`Could not save ${item.name}.`, {
        description: result.error || 'Try again.',
      })
      return
    }

    replaceItem(result.data)
    toast.success(`${item.name} saved.`)
  }

  const adjustStock = async (
    item: InventoryItem,
    quantityDelta: number,
    reason: InventoryMovementReason,
    note?: string
  ) => {
    if (quantityDelta === 0) return

    setSavingItems((current) => ({ ...current, [item.id]: true }))
    const result = await supabaseService.adjustInventoryItemStock(
      item.id,
      quantityDelta,
      reason,
      note
    )
    setSavingItems((current) => ({ ...current, [item.id]: false }))

    if (result.error || !result.data) {
      setErroredItems((current) => ({ ...current, [item.id]: true }))
      toast.error(`Could not update ${item.name}.`, {
        description: result.error || 'Try again.',
      })
      return
    }

    replaceItem(result.data)
    toast.success(`${item.name} updated to ${result.data.stock} ${result.data.unit}.`)
  }

  const applyMovement = (item: InventoryItem, direction: 'in' | 'out') => {
    const rawQuantity = movementQuantity[item.id] || '1'
    const quantity = Number(rawQuantity)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Enter a quantity greater than zero.')
      return
    }

    void adjustStock(
      item,
      direction === 'in' ? quantity : -quantity,
      direction === 'in' ? 'received' : 'used',
      direction === 'in' ? 'Received from inventory page' : 'Used from inventory page'
    )
    setMovementQuantity((current) => ({ ...current, [item.id]: '' }))
  }

  const restockToPar = (item: InventoryItem) => {
    if (item.stock >= item.parLevel) {
      toast.message(`${item.name} is already at or above par.`)
      return
    }

    void adjustStock(item, item.parLevel - item.stock, 'to_par', 'Restocked to par level')
  }

  const handleCreateItem = async () => {
    const name = createForm.name.trim()
    const unit = createForm.unit.trim()
    const stock = parseNonNegativeNumber(createForm.stock)
    const lowThreshold = parseNonNegativeNumber(createForm.lowThreshold)
    const parLevel = Math.max(1, parseNonNegativeNumber(createForm.parLevel, 1))

    if (!name) {
      toast.error('Inventory item name is required.')
      return
    }

    if (!unit) {
      toast.error('Unit is required.')
      return
    }

    setIsCreating(true)
    const result = await supabaseService.createInventoryItem({
      name,
      category: createForm.category,
      unit,
      stock,
      lowThreshold,
      parLevel,
      track: createForm.track,
      usedBy: parseUsedBy(createForm.usedByText),
    })
    setIsCreating(false)

    if (result.error || !result.data) {
      toast.error('Could not create inventory item.', {
        description: result.error || 'Try again.',
      })
      return
    }

    const createdItem = result.data
    setItems((current) =>
      [...current, createdItem].sort((a, b) =>
        `${a.category}${a.name}`.localeCompare(`${b.category}${b.name}`)
      )
    )
    setSelectedCategory(createdItem.category)
    setCreateForm(emptyCreateForm)
    setIsCreateOpen(false)
    toast.success(`${createdItem.name} created.`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <TopBar />

      <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                Inventory
              </h1>
              {/* <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
                Track ingredient and packaging stock for the Frozen Treats menu. Update deliveries,
                record usage, and keep low-stock items visible before service gets blocked.
              </p> */}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadInventoryItems()}
                disabled={isLoading}
              >
                <RefreshCw data-icon="inline-start" className={cn(isLoading && 'animate-spin')} />
                Refresh
              </Button>
              <div className="flex items-center gap-1">
                <Button type="button" onClick={() => setIsCreateOpen(true)}>
                  <Plus data-icon="inline-start" />
                  Create item
                </Button>
                <HelpTooltip content="Add a new ingredient, packaging item, or supply that managers want to count." />
              </div>
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-xs border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-slate-600">
                  <Boxes />
                  Tracked items
                  <HelpTooltip content="Items where stock counting is turned on." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-slate-900">{trackedItems.length}</p>
              </CardContent>
            </Card>

            <Card className="rounded-xs border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-red-700">
                  <AlertTriangle />
                  Low stock
                  <HelpTooltip content="Tracked items at or below their low stock threshold." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-red-700">{lowStockItems.length}</p>
              </CardContent>
            </Card>

            <Card className="rounded-xs border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-amber-700">
                  <ClipboardList />
                  Watch list
                  <HelpTooltip content="Tracked items getting close to the low stock threshold." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-amber-700">{watchItems.length}</p>
              </CardContent>
            </Card>

            <Card className="rounded-xs border-emerald-200 bg-emerald-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 />
                  Units on hand
                  <HelpTooltip content="The total counted quantity across tracked inventory items." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-emerald-700">{totalUnits}</p>
              </CardContent>
            </Card>
          </section>

          {loadError && (
            <Card className="rounded-xs border-red-200 bg-red-50">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                <AlertTriangle className="shrink-0 text-red-700" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-red-900">Inventory could not load</p>
                  <p className="text-sm text-red-800">{loadError}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {lowStockItems.length > 0 && (
            <Card className="rounded-xs border-red-200 bg-red-50">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                <AlertTriangle className="shrink-0 text-red-700" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-red-900">Low stock needs attention</p>
                  <p className="text-sm text-red-800">
                    {lowStockItems.map((item) => item.name).join(', ')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <section className="grid gap-3 lg:grid-cols-[1fr_240px]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ingredient, packaging, menu use..."
                className="h-11 pl-10"
              />
            </label>

            <div className="flex items-center gap-1">
              <Select
                value={selectedCategory}
                onValueChange={(value) => setSelectedCategory(value as InventoryCategory | 'All')}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <HelpTooltip content="Filter the list by the kind of stock item you want to manage." />
            </div>
          </section>

          {isLoading ? (
            <div className="flex min-h-80 items-center justify-center rounded-xs border bg-white text-slate-500">
              <Loader2 className="mr-2 animate-spin" />
              Loading inventory...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-xs border bg-white p-6 text-center text-slate-500">
              <Boxes className="mb-3" />
              <p className="font-semibold text-slate-800">No inventory items found</p>
              <p className="max-w-md text-sm">
                Create a new item or adjust the search and category filters.
              </p>
            </div>
          ) : (
            <section className="grid gap-3 xl:grid-cols-2">
              {filteredItems.map((item) => {
                const status = stockStatus(item)
                const stockPercent =
                  item.parLevel > 0
                    ? Math.min(100, Math.round((item.stock / item.parLevel) * 100))
                    : 0
                const quantityValue = movementQuantity[item.id] ?? ''
                const isSavingItem = Boolean(savingItems[item.id])
                const hasError = Boolean(erroredItems[item.id])

                return (
                  <Card
                    key={item.id}
                    className={cn(
                      'rounded-xs border-slate-200 bg-white',
                      status === 'Low stock' && 'border-red-200 bg-red-50',
                      status === 'Watch' && 'border-amber-200 bg-amber-50',
                      hasError && 'border-red-300'
                    )}
                  >
                    <CardHeader className="gap-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <CardTitle className="text-lg text-slate-900">{item.name}</CardTitle>
                          <p className="text-sm text-slate-600">{item.category}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {isSavingItem && (
                            <Badge variant="secondary" className="rounded-xs">
                              <Loader2 className="animate-spin" />
                              Saving
                            </Badge>
                          )}
                          {hasError && (
                            <Badge className="rounded-xs bg-red-100 text-red-800">
                              Needs attention
                            </Badge>
                          )}
                          <Badge className={cn('w-fit border-0', statusBadgeClass(status))}>
                            {status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xs bg-white/80 p-3">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-semibold text-slate-500">On hand</p>
                            <HelpTooltip content="How many units are currently counted for this item." />
                          </div>
                          <p className="text-2xl font-black text-slate-900">
                            {item.stock}{' '}
                            <span className="text-sm font-semibold text-slate-500">{item.unit}</span>
                          </p>
                        </div>
                        <label className="rounded-xs bg-white/80 p-3">
                          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                            Low threshold
                            <HelpTooltip content="The count where this item becomes low stock." />
                          </span>
                          <Input
                            type="number"
                            min="0"
                            value={item.lowThreshold}
                            onChange={(event) =>
                              updateItemLocal(item.id, {
                                lowThreshold: Math.max(0, Number(event.target.value || 0)),
                              })
                            }
                            onBlur={(event) => {
                              const lowThreshold = Math.max(0, Number(event.target.value || 0))
                              updateItemLocal(item.id, { lowThreshold })
                              void saveItemSettings(item, { lowThreshold })
                            }}
                            disabled={isSavingItem}
                            className="mt-1 h-9"
                          />
                        </label>
                        <label className="rounded-xs bg-white/80 p-3">
                          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                            Par level
                            <HelpTooltip content="The target amount you want to have after restocking." />
                          </span>
                          <Input
                            type="number"
                            min="1"
                            value={item.parLevel}
                            onChange={(event) =>
                              updateItemLocal(item.id, {
                                parLevel: Math.max(1, Number(event.target.value || 1)),
                              })
                            }
                            onBlur={(event) => {
                              const parLevel = Math.max(1, Number(event.target.value || 1))
                              updateItemLocal(item.id, { parLevel })
                              void saveItemSettings(item, { parLevel })
                            }}
                            disabled={isSavingItem}
                            className="mt-1 h-9"
                          />
                        </label>
                      </div>

                      <div>
                        <div className="mb-2 flex justify-between gap-3 text-xs font-semibold text-slate-500">
                          <span className="flex items-center gap-1">
                            Stock level
                            <HelpTooltip content="How close the current stock is to the par level." />
                          </span>
                          <span>{stockPercent}% of par</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              status === 'Low stock'
                                ? 'bg-red-500'
                                : status === 'Watch'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-600'
                            )}
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                          {item.usedBy.length > 0 ? (
                            item.usedBy.map((menuUse) => (
                              <Badge key={menuUse} variant="secondary" className="rounded-xs">
                                {menuUse}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="rounded-xs">
                              No menu use listed
                            </Badge>
                          )}
                        </div>

                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          Track
                          <HelpTooltip content="When on, this item appears in stock counts and low-stock alerts." />
                          <Switch
                            checked={item.track}
                            onCheckedChange={(checked) => {
                              updateItemLocal(item.id, { track: checked })
                              void saveItemSettings(item, { track: checked })
                            }}
                            disabled={isSavingItem}
                            aria-label={`Track ${item.name}`}
                          />
                        </label>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={quantityValue}
                          onChange={(event) =>
                            setMovementQuantity((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder="Qty"
                          disabled={isSavingItem}
                          className="h-10"
                        />
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => applyMovement(item, 'out')}
                            disabled={isSavingItem}
                          >
                            <Minus data-icon="inline-start" />
                            Used
                          </Button>
                          <HelpTooltip content="Subtract stock when items are used, wasted, sampled, or counted out." />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => applyMovement(item, 'in')}
                            disabled={isSavingItem}
                          >
                            <Plus data-icon="inline-start" />
                            Received
                          </Button>
                          <HelpTooltip content="Add stock when deliveries arrive or a count correction increases stock." />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            onClick={() => restockToPar(item)}
                            disabled={isSavingItem}
                          >
                            <PackagePlus data-icon="inline-start" />
                            To par
                          </Button>
                          <HelpTooltip content="Add only the amount needed to bring this item up to its target par level." />
                        </div>
                      </div>

                      <p className="text-xs text-slate-500">Last updated {formatDate(item.lastUpdated)}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </section>
          )}
        </div>
      </main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create inventory item</DialogTitle>
            <DialogDescription>
              Add an ingredient, packaging item, or supply that should be counted in inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Item name
              <Input
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="e.g. Mango puree"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Category
              <Select
                value={createForm.category}
                onValueChange={(value) =>
                  setCreateForm((current) => ({
                    ...current,
                    category: value as InventoryCategory,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {createCategoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Unit
              <Input
                value={createForm.unit}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, unit: event.target.value }))
                }
                placeholder="scoops, cups, pieces..."
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Starting stock
              <Input
                type="number"
                min="0"
                value={createForm.stock}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, stock: event.target.value }))
                }
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Low threshold
              <Input
                type="number"
                min="0"
                value={createForm.lowThreshold}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    lowThreshold: event.target.value,
                  }))
                }
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Par level
              <Input
                type="number"
                min="1"
                value={createForm.parLevel}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, parLevel: event.target.value }))
                }
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xs border p-3 text-sm font-semibold text-slate-700 sm:col-span-2">
              <span className="flex items-center gap-2">
                Track inventory
                <HelpTooltip content="Turn this on when managers want this item included in counts and alerts." />
              </span>
              <Switch
                checked={createForm.track}
                onCheckedChange={(checked) =>
                  setCreateForm((current) => ({ ...current, track: checked }))
                }
                aria-label="Track new inventory item"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
              Used by
              <Textarea
                value={createForm.usedByText}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, usedByText: event.target.value }))
                }
                placeholder="Separate menu items with commas or new lines"
                className="min-h-24"
              />
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateForm(emptyCreateForm)
                setIsCreateOpen(false)
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreateItem()} disabled={isCreating}>
              {isCreating && <Loader2 data-icon="inline-start" className="animate-spin" />}
              Create item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
