import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format number as VND: 1500000 → "1.500.000 ₫" */
export function formatVND(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num)
}

/** Format ISO date string to Vietnamese locale: "07/04/2026" */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

/** Calculate number of nights between two YYYY-MM-DD date strings */
export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const a = new Date(checkIn)
  const b = new Date(checkOut)
  const ms = b.getTime() - a.getTime()
  const nights = Math.round(ms / (1000 * 60 * 60 * 24))
  return nights > 0 ? nights : 0
}
