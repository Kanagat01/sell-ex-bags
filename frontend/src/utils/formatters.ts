export const formatPrice = (price: string | number): string => {
  const num = typeof price === "string" ? parseFloat(price) : price
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(num)
}

export const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString))
}

export const formatDateTime = (dateString: string): string => {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString))
}

export interface CommissionBreakdown {
  salePrice: number
  vat: number
  afterVat: number
  commissionRate: number
  commission: number
  sellerGets: number
}

export function getCommissionRate(salePrice: number): number {
  if (salePrice >= 1_000_000) return 0.15
  if (salePrice >= 501_000) return 0.20
  if (salePrice >= 251_000) return 0.25
  if (salePrice >= 101_000) return 0.30
  if (salePrice >= 51_000) return 0.35
  if (salePrice >= 31_000) return 0.40
  return 0.45
}

export function calcCommissionBreakdown(salePrice: number): CommissionBreakdown {
  const vat = Math.round(salePrice * 0.05)
  const afterVat = salePrice - vat
  const commissionRate = getCommissionRate(salePrice)
  const commission = Math.round(afterVat * commissionRate)
  const sellerGets = afterVat - commission
  return { salePrice, vat, afterVat, commissionRate, commission, sellerGets }
}

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "")
  const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})$/)
  if (match) {
    return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`
  }
  return phone
}