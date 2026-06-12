// Ghana cedis currency formatting
export const CURRENCY_SYMBOL = '₵'
export const CURRENCY_CODE = 'GHS'

export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toFixed(2)}`
}

export function formatPrice(amount: number): string {
  return formatCurrency(amount)
}
