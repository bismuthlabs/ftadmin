'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Loader2,
  Plus,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { supabaseService } from '@/lib/services/supabaseService'
import { Modifier, ModifierType, Product, ProductCategory } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

type ProductField =
  | 'name'
  | 'description'
  | 'draftPrice'
  | 'draftImageSrc'
  | 'draftStock'
  | 'draftLowStock'
  | 'isActive'
  | 'trackInventory'

type SaveStatus = 'clean' | 'unsaved' | 'saving' | 'saved' | 'error'
type ProductStatuses = Record<string, Partial<Record<ProductField, SaveStatus>>>

type ProductDraft = Product & {
  draftPrice: string
  draftStock: string
  draftLowStock: string
  draftImageSrc: string
}

type AddProductForm = {
  categoryId: string
  name: string
  description: string
  basePrice: string
  icon: string
  imageSrc: string
  stockQuantity: string
  lowStockThreshold: string
  isActive: boolean
  trackInventory: boolean
}

const PRODUCT_FIELDS: ProductField[] = [
  'name',
  'description',
  'draftPrice',
  'draftImageSrc',
  'draftStock',
  'draftLowStock',
  'isActive',
  'trackInventory',
]

const MODIFIER_TYPES: ModifierType[] = ['option', 'size', 'level', 'flavor', 'topping']

const defaultAddProductForm: AddProductForm = {
  categoryId: '',
  name: '',
  description: '',
  basePrice: '0',
  icon: '🍨',
  imageSrc: '',
  stockQuantity: '0',
  lowStockThreshold: '5',
  isActive: true,
  trackInventory: true,
}

function toDraft(product: Product): ProductDraft {
  return {
    ...product,
    draftPrice: String(product.price),
    draftStock: String(product.stockQuantity ?? 0),
    draftLowStock: String(product.lowStockThreshold ?? 5),
    draftImageSrc: product.imageSrc || '',
  }
}

function cloneModifiers(modifiers: Modifier[]): Modifier[] {
  return modifiers.map((modifier) => ({
    ...modifier,
    options: modifier.options.map((option) => ({ ...option })),
  }))
}

function createLocalId(prefix: string) {
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) || Date.now().toString(36)
  return `${prefix}-${suffix}`
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function getNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function getWholeNumber(value: string) {
  const number = getNumber(value)
  return number !== null && Number.isInteger(number) ? number : null
}

function fieldLabel(field: ProductField) {
  const labels: Record<ProductField, string> = {
    name: 'Name',
    description: 'Description',
    draftPrice: 'Price',
    draftImageSrc: 'Image',
    draftStock: 'Stock',
    draftLowStock: 'Low stock',
    isActive: 'Availability',
    trackInventory: 'Track inventory',
  }

  return labels[field]
}

function nextBaseline(product: ProductDraft, field: ProductField): ProductDraft {
  if (field === 'draftPrice') {
    return { ...product, price: Number(product.draftPrice || 0) }
  }
  if (field === 'draftImageSrc') {
    return { ...product, imageSrc: product.draftImageSrc.trim() || null }
  }
  if (field === 'draftStock') {
    return { ...product, stockQuantity: Number(product.draftStock || 0) }
  }
  if (field === 'draftLowStock') {
    return { ...product, lowStockThreshold: Number(product.draftLowStock || 0) }
  }

  return { ...product }
}

function productFieldValue(product: ProductDraft, field: ProductField) {
  return product[field]
}

function buildFieldUpdate(product: ProductDraft, field: ProductField) {
  if (field === 'name') {
    const name = product.name.trim()
    if (!name) return { error: 'Name is required.' }
    return { updates: { name } }
  }

  if (field === 'description') {
    return { updates: { description: product.description } }
  }

  if (field === 'draftPrice') {
    const price = getNumber(product.draftPrice)
    if (price === null || price < 0) return { error: 'Price must be zero or more.' }
    return { updates: { base_price: price } }
  }

  if (field === 'draftImageSrc') {
    return { updates: { image_src: product.draftImageSrc.trim() || null } }
  }

  if (field === 'draftStock') {
    const stock = getWholeNumber(product.draftStock)
    if (stock === null || stock < 0) return { error: 'Stock must be a whole number zero or more.' }
    return { updates: { stock_quantity: stock } }
  }

  if (field === 'draftLowStock') {
    const lowStock = getWholeNumber(product.draftLowStock)
    if (lowStock === null || lowStock < 0) {
      return { error: 'Low stock must be a whole number zero or more.' }
    }
    return { updates: { low_stock_threshold: lowStock } }
  }

  if (field === 'isActive') {
    return { updates: { is_active: product.isActive ?? true } }
  }

  return { updates: { track_inventory: product.trackInventory ?? true } }
}

function cardStatus(statuses: Partial<Record<ProductField, SaveStatus>>) {
  const values = PRODUCT_FIELDS.map((field) => statuses[field]).filter(Boolean)
  if (values.includes('error')) return 'error'
  if (values.includes('saving')) return 'saving'
  if (values.includes('unsaved')) return 'unsaved'
  if (values.includes('saved')) return 'saved'
  return 'clean'
}

export default function MenuAdminPage() {
  const [products, setProducts] = useState<ProductDraft[]>([])
  const [savedProducts, setSavedProducts] = useState<Record<string, ProductDraft>>({})
  const [productStatuses, setProductStatuses] = useState<ProductStatuses>({})
  const [categoryOptions, setCategoryOptions] = useState<ProductCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [addProductForm, setAddProductForm] = useState<AddProductForm>(defaultAddProductForm)
  const [modifierProduct, setModifierProduct] = useState<ProductDraft | null>(null)
  const [modifierDrafts, setModifierDrafts] = useState<Modifier[]>([])
  const [isSavingModifiers, setIsSavingModifiers] = useState(false)

  const productsRef = useRef<ProductDraft[]>([])
  const savedProductsRef = useRef<Record<string, ProductDraft>>({})
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const cleanTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    productsRef.current = products
  }, [products])

  useEffect(() => {
    savedProductsRef.current = savedProducts
  }, [savedProducts])

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach(clearTimeout)
      Object.values(cleanTimersRef.current).forEach(clearTimeout)
    }
  }, [])

  const categories = useMemo(() => {
    const categoryNames = categoryOptions.map((category) => category.name)
    const names = categoryNames.length
      ? categoryNames
      : Array.from(new Set(products.map((product) => product.category)))

    return ['All', ...names]
  }, [categoryOptions, products])

  const visibleProducts = products.filter(
    (product) => selectedCategory === 'All' || product.category === selectedCategory
  )

  const globalStatus = useMemo(() => {
    const statuses = Object.values(productStatuses).map(cardStatus)
    if (statuses.includes('error')) return 'Needs attention'
    if (statuses.includes('saving')) return 'Saving changes...'
    if (statuses.includes('unsaved')) return 'Unsaved changes'
    return 'All changes saved'
  }, [productStatuses])

  const setFieldStatus = (productId: string, field: ProductField, status: SaveStatus) => {
    setProductStatuses((current) => ({
      ...current,
      [productId]: {
        ...current[productId],
        [field]: status,
      },
    }))
  }

  const loadProducts = async () => {
    Object.values(saveTimersRef.current).forEach(clearTimeout)
    saveTimersRef.current = {}
    setIsLoading(true)

    const [menu, categoriesResult] = await Promise.all([
      supabaseService.fetchMenu(true),
      supabaseService.fetchProductCategories(),
    ])
    const drafts = menu.products.map(toDraft)
    const savedById = Object.fromEntries(drafts.map((product) => [product.id, product]))

    productsRef.current = drafts
    savedProductsRef.current = savedById
    setProducts(drafts)
    setSavedProducts(savedById)
    setProductStatuses({})
    setCategoryOptions(categoriesResult)
    setAddProductForm((current) => ({
      ...current,
      categoryId: current.categoryId || categoriesResult[0]?.id || '',
    }))
    setIsLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const saveField = async (
    productId: string,
    field: ProductField,
    productOverride?: ProductDraft
  ) => {
    const product =
      productOverride || productsRef.current.find((currentProduct) => currentProduct.id === productId)
    if (!product) return

    const savedProduct = savedProductsRef.current[productId]
    if (savedProduct && productFieldValue(savedProduct, field) === productFieldValue(product, field)) {
      setFieldStatus(productId, field, 'clean')
      return
    }

    const result = buildFieldUpdate(product, field)
    const toastId = `menu-${productId}-${field}`

    if ('error' in result) {
      setFieldStatus(productId, field, 'error')
      toast.error(result.error, { id: toastId })
      return
    }

    setFieldStatus(productId, field, 'saving')
    toast.loading(`Saving ${fieldLabel(field).toLowerCase()}...`, { id: toastId })

    const saved = await supabaseService.updateProduct(productId, result.updates)
    if (!saved) {
      setFieldStatus(productId, field, 'error')
      toast.error(`Could not save ${fieldLabel(field).toLowerCase()}.`, {
        id: toastId,
        description: 'Check Supabase permissions and try again.',
      })
      return
    }

    const updatedBaseline = nextBaseline(product, field)
    savedProductsRef.current = {
      ...savedProductsRef.current,
      [productId]: {
        ...savedProductsRef.current[productId],
        ...updatedBaseline,
      },
    }
    setSavedProducts(savedProductsRef.current)

    const currentProduct = productsRef.current.find((current) => current.id === productId)
    const hasChangedAgain =
      currentProduct && productFieldValue(currentProduct, field) !== productFieldValue(updatedBaseline, field)

    setFieldStatus(productId, field, hasChangedAgain ? 'unsaved' : 'saved')
    toast.success('Saved', { id: toastId })

    const cleanTimerKey = `${productId}:${field}`
    clearTimeout(cleanTimersRef.current[cleanTimerKey])
    cleanTimersRef.current[cleanTimerKey] = setTimeout(() => {
      setProductStatuses((current) => {
        if (current[productId]?.[field] !== 'saved') return current
        return {
          ...current,
          [productId]: {
            ...current[productId],
            [field]: 'clean',
          },
        }
      })
    }, 1600)
  }

  const scheduleSave = (productId: string, field: ProductField) => {
    const timerKey = `${productId}:${field}`
    clearTimeout(saveTimersRef.current[timerKey])
    saveTimersRef.current[timerKey] = setTimeout(() => {
      delete saveTimersRef.current[timerKey]
      void saveField(productId, field)
    }, 1000)
  }

  const updateProductField = (
    productId: string,
    field: ProductField,
    value: string | boolean,
    mode: 'debounce' | 'immediate' = 'debounce'
  ) => {
    const nextProducts = productsRef.current.map((product) =>
      product.id === productId ? { ...product, [field]: value } : product
    )
    const nextProduct = nextProducts.find((product) => product.id === productId)

    productsRef.current = nextProducts
    setProducts(nextProducts)
    setFieldStatus(productId, field, 'unsaved')

    if (mode === 'immediate' && nextProduct) {
      const timerKey = `${productId}:${field}`
      clearTimeout(saveTimersRef.current[timerKey])
      delete saveTimersRef.current[timerKey]
      void saveField(productId, field, nextProduct)
      return
    }

    scheduleSave(productId, field)
  }

  const flushField = (productId: string, field: ProductField) => {
    const timerKey = `${productId}:${field}`
    if (saveTimersRef.current[timerKey]) {
      clearTimeout(saveTimersRef.current[timerKey])
      delete saveTimersRef.current[timerKey]
      void saveField(productId, field)
    }
  }

  const flushPendingSaves = async () => {
    const pendingKeys = Object.keys(saveTimersRef.current)
    await Promise.all(
      pendingKeys.map((timerKey) => {
        clearTimeout(saveTimersRef.current[timerKey])
        delete saveTimersRef.current[timerKey]
        const [productId, field] = timerKey.split(':') as [string, ProductField]
        return saveField(productId, field)
      })
    )
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await flushPendingSaves()
    await loadProducts()
    setIsRefreshing(false)
    toast.success('Menu refreshed')
  }

  const handleProductImageUpload = async (productId: string, file?: File) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      updateProductField(productId, 'draftImageSrc', dataUrl, 'debounce')
    } catch (error) {
      console.error('[v0] Failed to read image file:', error)
      toast.error('Could not read that image file.')
    }
  }

  const handleAddProductImageUpload = async (file?: File) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setAddProductForm((current) => ({ ...current, imageSrc: dataUrl }))
    } catch (error) {
      console.error('[v0] Failed to read image file:', error)
      toast.error('Could not read that image file.')
    }
  }

  const resetAddProductForm = () => {
    setAddProductForm({
      ...defaultAddProductForm,
      categoryId: categoryOptions[0]?.id || '',
    })
  }

  const openAddProduct = () => {
    resetAddProductForm()
    setIsAddOpen(true)
  }

  const submitAddProduct = async () => {
    const category = categoryOptions.find((option) => option.id === addProductForm.categoryId)
    const basePrice = getNumber(addProductForm.basePrice)
    const stockQuantity = getWholeNumber(addProductForm.stockQuantity)
    const lowStockThreshold = getWholeNumber(addProductForm.lowStockThreshold)

    if (!category) {
      toast.error('Choose a category.')
      return
    }
    if (!addProductForm.name.trim()) {
      toast.error('Product name is required.')
      return
    }
    if (basePrice === null || basePrice < 0) {
      toast.error('Price must be zero or more.')
      return
    }
    if (stockQuantity === null || stockQuantity < 0) {
      toast.error('Stock must be a whole number zero or more.')
      return
    }
    if (lowStockThreshold === null || lowStockThreshold < 0) {
      toast.error('Low stock must be a whole number zero or more.')
      return
    }

    setIsCreatingProduct(true)
    const created = await supabaseService.createProduct({
      categoryId: category.id,
      name: addProductForm.name.trim(),
      description: addProductForm.description,
      basePrice,
      imageSrc: addProductForm.imageSrc.trim() || null,
      icon: addProductForm.icon.trim() || '🍨',
      isActive: addProductForm.isActive,
      stockQuantity,
      lowStockThreshold,
      trackInventory: addProductForm.trackInventory,
    })
    setIsCreatingProduct(false)

    if (!created) {
      toast.error('Could not add product.', {
        description: 'Check Supabase permissions and try again.',
      })
      return
    }

    setIsAddOpen(false)
    setSelectedCategory(category.name)
    await loadProducts()
    toast.success(`${created.name} added`)
  }

  const openModifierModal = (product: ProductDraft) => {
    setModifierProduct(product)
    setModifierDrafts(cloneModifiers(product.modifiers))
  }

  const updateModifier = (modifierId: string, updates: Partial<Modifier>) => {
    setModifierDrafts((current) =>
      current.map((modifier) =>
        modifier.id === modifierId ? { ...modifier, ...updates } : modifier
      )
    )
  }

  const addModifier = () => {
    setModifierDrafts((current) => [
      ...current,
      {
        id: createLocalId('modifier'),
        name: 'New modifier',
        type: 'option',
        required: false,
        options: [],
      },
    ])
  }

  const removeModifier = (modifierId: string) => {
    if (!window.confirm('Delete this modifier group and its options?')) return
    setModifierDrafts((current) => current.filter((modifier) => modifier.id !== modifierId))
  }

  const addModifierOption = (modifierId: string) => {
    setModifierDrafts((current) =>
      current.map((modifier) =>
        modifier.id === modifierId
          ? {
              ...modifier,
              options: [
                ...modifier.options,
                { id: createLocalId('option'), name: 'New option', price: 0 },
              ],
            }
          : modifier
      )
    )
  }

  const updateModifierOption = (
    modifierId: string,
    optionId: string,
    updates: Partial<Modifier['options'][number]>
  ) => {
    setModifierDrafts((current) =>
      current.map((modifier) =>
        modifier.id === modifierId
          ? {
              ...modifier,
              options: modifier.options.map((option) =>
                option.id === optionId ? { ...option, ...updates } : option
              ),
            }
          : modifier
      )
    )
  }

  const removeModifierOption = (modifierId: string, optionId: string) => {
    if (!window.confirm('Delete this option?')) return
    setModifierDrafts((current) =>
      current.map((modifier) =>
        modifier.id === modifierId
          ? {
              ...modifier,
              options: modifier.options.filter((option) => option.id !== optionId),
            }
          : modifier
      )
    )
  }

  const saveModifiers = async () => {
    if (!modifierProduct) return

    const hasEmptyModifierName = modifierDrafts.some((modifier) => !modifier.name.trim())
    const hasEmptyOptionName = modifierDrafts.some((modifier) =>
      modifier.options.some((option) => !option.name.trim())
    )
    const hasInvalidPrice = modifierDrafts.some((modifier) =>
      modifier.options.some((option) => {
        const price = Number(option.price || 0)
        return !Number.isFinite(price) || price < 0
      })
    )

    if (hasEmptyModifierName) {
      toast.error('Every modifier group needs a name.')
      return
    }
    if (hasEmptyOptionName) {
      toast.error('Every modifier option needs a name.')
      return
    }
    if (hasInvalidPrice) {
      toast.error('Modifier option prices must be zero or more.')
      return
    }

    setIsSavingModifiers(true)
    toast.loading('Saving modifiers...', { id: `modifiers-${modifierProduct.id}` })

    const saved = await supabaseService.saveProductModifiers(modifierProduct.id, modifierDrafts)
    setIsSavingModifiers(false)

    if (!saved) {
      toast.error('Could not save modifiers.', {
        id: `modifiers-${modifierProduct.id}`,
        description: 'Check Supabase permissions and try again.',
      })
      return
    }

    toast.success('Modifiers saved', { id: `modifiers-${modifierProduct.id}` })
    setModifierProduct(null)
    setModifierDrafts([])
    await loadProducts()
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Menu</h1>
            <p className="text-sm font-medium text-slate-500">
              {globalStatus}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={openAddProduct} disabled={categoryOptions.length === 0}>
              <Plus data-icon="inline-start" />
              Add product
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <RefreshCw data-icon="inline-start" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="shrink-0 lg:w-60">
            <div className="rounded-xs border border-slate-200 bg-white p-4 lg:sticky lg:top-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500">
                Categories
              </h2>

              <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
                {categories.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="shrink-0"
                  >
                    {category}
                  </Button>
                ))}
              </div>

              <div className="hidden flex-col gap-1 lg:flex">
                {categories.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant={selectedCategory === category ? 'default' : 'ghost'}
                    onClick={() => setSelectedCategory(category)}
                    className="justify-start"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1">
            {isLoading ? (
              <div className="rounded-xs border border-slate-200 bg-white p-8 text-center text-slate-500">
                Loading menu...
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="rounded-xs border border-slate-200 bg-white p-8 text-center text-slate-500">
                No products in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => {
                  const status = cardStatus(productStatuses[product.id] || {})
                  const statusText =
                    status === 'error'
                      ? 'Needs attention'
                      : status === 'saving'
                        ? 'Saving'
                        : status === 'unsaved'
                          ? 'Unsaved'
                          : status === 'saved'
                            ? 'Saved'
                            : 'Saved'

                  return (
                    <section
                      key={product.id}
                      className={cn(
                        'flex flex-col gap-4 rounded-xs border bg-white p-4',
                        status === 'error' ? 'border-red-300' : 'border-slate-200'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{product.name}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {formatCurrency(Number(product.draftPrice || 0))}
                          </p>
                        </div>
                        <Badge
                          variant={status === 'error' ? 'destructive' : 'secondary'}
                          className="shrink-0"
                        >
                          {statusText}
                        </Badge>
                      </div>

                      <div className="h-24 overflow-hidden rounded-xs bg-slate-100">
                        {product.draftImageSrc ? (
                          <img
                            src={product.draftImageSrc}
                            alt={product.name || 'Product'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-4xl">
                            {product.icon}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-3">
                        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
                          Name
                          <Input
                            value={product.name}
                            onChange={(event) =>
                              updateProductField(product.id, 'name', event.target.value)
                            }
                            onBlur={() => flushField(product.id, 'name')}
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
                          Description
                          <Textarea
                            value={product.description}
                            onChange={(event) =>
                              updateProductField(product.id, 'description', event.target.value)
                            }
                            onBlur={() => flushField(product.id, 'description')}
                            className="min-h-20"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
                          Price
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.draftPrice}
                            onChange={(event) =>
                              updateProductField(product.id, 'draftPrice', event.target.value)
                            }
                            onBlur={() => flushField(product.id, 'draftPrice')}
                          />
                        </label>

                        <div className="flex flex-col gap-2">
                          <p className="text-xs font-semibold text-slate-500">Image</p>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button type="button" variant="outline" asChild>
                              <label className="cursor-pointer">
                                <Upload data-icon="inline-start" />
                                Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(event) => {
                                    void handleProductImageUpload(
                                      product.id,
                                      event.target.files?.[0]
                                    )
                                    event.currentTarget.value = ''
                                  }}
                                  className="sr-only"
                                />
                              </label>
                            </Button>
                            {product.draftImageSrc && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  updateProductField(product.id, 'draftImageSrc', '', 'debounce')
                                }
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
                          Stock
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={product.draftStock}
                            onChange={(event) =>
                              updateProductField(product.id, 'draftStock', event.target.value)
                            }
                            onBlur={() => flushField(product.id, 'draftStock')}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
                          Low stock
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={product.draftLowStock}
                            onChange={(event) =>
                              updateProductField(product.id, 'draftLowStock', event.target.value)
                            }
                            onBlur={() => flushField(product.id, 'draftLowStock')}
                          />
                        </label>
                      </div>

                      <div className="flex flex-col gap-3 rounded-xs bg-slate-50 p-3">
                        <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                          Available
                          <Switch
                            checked={product.isActive ?? true}
                            onCheckedChange={(checked) =>
                              updateProductField(product.id, 'isActive', checked, 'immediate')
                            }
                          />
                        </label>

                        <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                          Track inventory
                          <Switch
                            checked={product.trackInventory ?? true}
                            onCheckedChange={(checked) =>
                              updateProductField(product.id, 'trackInventory', checked, 'immediate')
                            }
                          />
                        </label>
                        <p className="text-xs leading-5 text-slate-500">
                          When this is on, the system keeps count of this item&apos;s stock and can
                          warn us when it is running low. Turn it off for items we do not count one
                          by one.
                        </p>
                      </div>

                      <Button type="button" variant="outline" onClick={() => openModifierModal(product)}>
                        <SlidersHorizontal data-icon="inline-start" />
                        Modifiers ({product.modifiers.length})
                      </Button>
                    </section>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add product</DialogTitle>
            <DialogDescription>
              Create a new item in one of the existing menu categories.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Category
              <Select
                value={addProductForm.categoryId}
                onValueChange={(value) =>
                  setAddProductForm((current) => ({ ...current, categoryId: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Name
              <Input
                value={addProductForm.name}
                onChange={(event) =>
                  setAddProductForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700 sm:col-span-2">
              Description
              <Textarea
                value={addProductForm.description}
                onChange={(event) =>
                  setAddProductForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Price
              <Input
                type="number"
                min="0"
                step="0.01"
                value={addProductForm.basePrice}
                onChange={(event) =>
                  setAddProductForm((current) => ({ ...current, basePrice: event.target.value }))
                }
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Icon
              <Input
                value={addProductForm.icon}
                onChange={(event) =>
                  setAddProductForm((current) => ({ ...current, icon: event.target.value }))
                }
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Stock
              <Input
                type="number"
                min="0"
                step="1"
                value={addProductForm.stockQuantity}
                onChange={(event) =>
                  setAddProductForm((current) => ({
                    ...current,
                    stockQuantity: event.target.value,
                  }))
                }
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Low stock
              <Input
                type="number"
                min="0"
                step="1"
                value={addProductForm.lowStockThreshold}
                onChange={(event) =>
                  setAddProductForm((current) => ({
                    ...current,
                    lowStockThreshold: event.target.value,
                  }))
                }
              />
            </label>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <p className="text-sm font-semibold text-slate-700">Image</p>
              {addProductForm.imageSrc && (
                <div className="h-28 overflow-hidden rounded-xs bg-slate-100">
                  <img
                    src={addProductForm.imageSrc}
                    alt="New product"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload data-icon="inline-start" />
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        void handleAddProductImageUpload(event.target.files?.[0])
                        event.currentTarget.value = ''
                      }}
                      className="sr-only"
                    />
                  </label>
                </Button>
                {addProductForm.imageSrc && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setAddProductForm((current) => ({ ...current, imageSrc: '' }))
                    }
                  >
                    Remove image
                  </Button>
                )}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xs bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              Available
              <Switch
                checked={addProductForm.isActive}
                onCheckedChange={(checked) =>
                  setAddProductForm((current) => ({ ...current, isActive: checked }))
                }
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xs bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              Track inventory
              <Switch
                checked={addProductForm.trackInventory}
                onCheckedChange={(checked) =>
                  setAddProductForm((current) => ({ ...current, trackInventory: checked }))
                }
              />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitAddProduct} disabled={isCreatingProduct}>
              {isCreatingProduct ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Plus data-icon="inline-start" />
              )}
              Add product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(modifierProduct)} onOpenChange={(open) => !open && setModifierProduct(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Modifiers</DialogTitle>
            <DialogDescription>
              {modifierProduct ? `Edit choices for ${modifierProduct.name}.` : 'Edit choices.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {modifierDrafts.length === 0 ? (
              <div className="rounded-xs border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No modifiers yet.
              </div>
            ) : (
              modifierDrafts.map((modifier) => (
                <section key={modifier.id} className="flex flex-col gap-3 rounded-xs border p-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_150px_auto_auto]">
                    <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                      Group name
                      <Input
                        value={modifier.name}
                        onChange={(event) =>
                          updateModifier(modifier.id, { name: event.target.value })
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                      Type
                      <Select
                        value={modifier.type}
                        onValueChange={(value) =>
                          updateModifier(modifier.id, { type: value as ModifierType })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {MODIFIER_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </label>

                    <label className="flex items-center justify-between gap-3 rounded-xs bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                      Required
                      <Switch
                        checked={modifier.required}
                        onCheckedChange={(checked) =>
                          updateModifier(modifier.id, { required: checked })
                        }
                      />
                    </label>

                    <Button
                      type="button"
                      variant="outline"
                      className="self-end"
                      onClick={() => removeModifier(modifier.id)}
                    >
                      <Trash2 data-icon="inline-start" />
                      Delete
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {modifier.options.map((option) => (
                      <div
                        key={option.id}
                        className="grid gap-2 rounded-xs bg-slate-50 p-2 sm:grid-cols-[1fr_140px_auto]"
                      >
                        <Input
                          value={option.name}
                          aria-label="Option name"
                          onChange={(event) =>
                            updateModifierOption(modifier.id, option.id, {
                              name: event.target.value,
                            })
                          }
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={String(option.price || 0)}
                          aria-label="Option price"
                          onChange={(event) =>
                            updateModifierOption(modifier.id, option.id, {
                              price: Number(event.target.value || 0),
                            })
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeModifierOption(modifier.id, option.id)}
                        >
                          <Trash2 data-icon="inline-start" />
                          Delete
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      className="self-start"
                      onClick={() => addModifierOption(modifier.id)}
                    >
                      <Plus data-icon="inline-start" />
                      Add option
                    </Button>
                  </div>
                </section>
              ))
            )}

            <Button type="button" variant="outline" className="self-start" onClick={addModifier}>
              <Plus data-icon="inline-start" />
              Add modifier group
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModifierProduct(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveModifiers} disabled={isSavingModifiers}>
              {isSavingModifiers ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              Save modifiers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
