import type { Room, Booking } from './api'

/** Room status display config */
export const ROOM_STATUS: Record<Room['status'], { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: 'Trống', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  OCCUPIED: { label: 'Có khách', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  CLEANING: { label: 'Dọn dẹp', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  MAINTENANCE: { label: 'Bảo trì', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
}

/** Booking status display config */
export const BOOKING_STATUS: Record<Booking['status'], { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'muted' }> = {
  BOOKED: { label: 'Đã đặt', variant: 'default' },
  CHECKED_IN: { label: 'Đang ở', variant: 'warning' },
  COMPLETED: { label: 'Hoàn thành', variant: 'success' },
  CANCELLED: { label: 'Đã huỷ', variant: 'muted' },
}

export const PAYMENT_METHOD: Record<string, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  CREDIT_CARD: 'Thẻ tín dụng',
}

export const SERVICE_TYPE: Record<string, string> = {
  FOOD: 'Đồ ăn/uống',
  DAMAGE: 'Hư hỏng',
  OTHER: 'Khác',
}
