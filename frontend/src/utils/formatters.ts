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
  if (salePrice >= 1_800_001) return 0.10
  if (salePrice >= 1_300_001) return 0.15
  if (salePrice >= 900_001) return 0.20
  if (salePrice >= 400_001) return 0.25
  if (salePrice >= 100_001) return 0.30
  return 0.35 // от 5.000 до 100.000
}

export function calcCommissionBreakdown(salePrice: number): CommissionBreakdown {
  // НДС 5% выделяется из стоимости: цена / 1,05
  // (целочисленно, чтобы не ловить ошибки округления float)
  const afterVat = Math.round((salePrice * 100) / 105)
  const vat = salePrice - afterVat
  const commissionRate = getCommissionRate(salePrice)
  const commission = Math.round((afterVat * Math.round(commissionRate * 100)) / 100)
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