import type { Room, Booking } from './api'

/** Room status display config — warm earthy palette */
export const ROOM_STATUS: Record<Room['status'], { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: 'Trống', color: 'text-[#4A7A3E]', bg: 'bg-[#F0F5EC]/60 border-[#C5D9B8] backdrop-blur-md' },
  OCCUPIED: { label: 'Có khách', color: 'text-[#8B6914]', bg: 'bg-[#FDF5E6]/60 border-[#E8D5A3] backdrop-blur-md' },
  CLEANING: { label: 'Dọn dẹp', color: 'text-[#9A6B30]', bg: 'bg-[#FEF3E2]/60 border-[#E8CFA0] backdrop-blur-md' },
  MAINTENANCE: { label: 'Bảo trì', color: 'text-[#A04030]', bg: 'bg-[#FDF0ED]/60 border-[#E6C4BC] backdrop-blur-md' },
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
