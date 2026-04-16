// In dev, BASE is '/api' and Vite proxies to localhost:3000 (see vite.config.ts).
// In prod, set VITE_API_BASE_URL to the Render URL, e.g. https://mai-ngoi-api.onrender.com
const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    // Auto-logout on 401
    if (res.status === 401 && path !== '/auth/login') {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    throw new ApiError(res.status, body.error ?? 'Unknown error', body)
  }

  return res.json()
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export interface Room {
  id: string
  name: string
  pricePerNight: string
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE'
  createdAt: string
  updatedAt: string
}

export interface RoomAvailability extends Room {
  available: boolean
}

export const roomsApi = {
  list: () => request<Room[]>('/rooms'),

  availability: (checkIn: string, checkOut: string) =>
    request<RoomAvailability[]>(`/rooms/availability?checkIn=${checkIn}&checkOut=${checkOut}`),

  updateStatus: (id: string, status: Room['status']) =>
    request<Room>(`/rooms/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updatePrice: (id: string, pricePerNight: number) =>
    request<Room>(`/rooms/${id}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ pricePerNight }),
    }),
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export interface Booking {
  id: string
  roomId: string
  guestName: string
  phone: string
  checkIn: string
  checkOut: string
  totalRoomPrice: string
  status: 'BOOKED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED'
  notes: string | null
  room?: Room
  serviceCharges?: ServiceCharge[]
  payments?: Payment[]
  createdAt: string
  updatedAt: string
}

export interface ServiceCharge {
  id: string
  bookingId: string
  description: string
  quantity: number
  unitPrice: string
  type: 'FOOD' | 'DAMAGE' | 'OTHER'
  createdAt: string
}

export interface Payment {
  id: string
  bookingId: string
  amount: string
  method: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD'
  paidAt: string
  createdAt: string
}

export interface BookingFilters {
  status?: string
  roomId?: string
  guest?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export const bookingsApi = {
  list: (filters?: BookingFilters) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined) params.set(k, String(v))
      })
    }
    const qs = params.toString()
    return request<Booking[]>(`/bookings${qs ? `?${qs}` : ''}`)
  },

  get: (id: string) => request<Booking>(`/bookings/${id}`),

  create: (data: {
    roomId: string
    guestName: string
    phone: string
    checkIn: string
    checkOut: string
    totalRoomPrice: number
    notes?: string
  }) => request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(data) }),

  checkIn: (id: string) =>
    request<Booking>(`/bookings/${id}/check-in`, { method: 'POST' }),

  checkOut: (id: string) =>
    request<Booking>(`/bookings/${id}/check-out`, { method: 'POST' }),

  cancel: (id: string) =>
    request<Booking>(`/bookings/${id}/cancel`, { method: 'POST' }),

  addServiceCharge: (id: string, data: {
    description: string
    quantity: number
    unitPrice: number
    type: 'FOOD' | 'DAMAGE' | 'OTHER'
  }) => request<ServiceCharge>(`/bookings/${id}/service-charges`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  addPayment: (id: string, data: {
    amount: number
    method: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD'
  }) => request<Payment>(`/bookings/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardData {
  stats: {
    totalRooms: number
    available: number
    occupied: number
    cleaning: number
    maintenance: number
    arrivalsToday: number
    departuresToday: number
    inHouseGuests: number
    upcomingCount: number
  }
  rooms: Room[]
  arrivals: Booking[]
  departures: Booking[]
  inHouse: Booking[]
  upcoming: Booking[]
}

export const dashboardApi = {
  today: () => request<DashboardData>('/dashboard/today'),
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface MonthlyReportRow {
  month: string // YYYY-MM
  bookingCount: number
  nightsSold: number
  roomRevenue: number
  serviceRevenue: number
  totalRevenue: number
}

export const reportsApi = {
  monthly: () => request<MonthlyReportRow[]>('/reports/monthly'),
  monthlyBookings: (month: string) =>
    request<Booking[]>(`/reports/monthly/${month}/bookings`),
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  login: (username: string, password: string) =>
    request<{ token: string; username: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<{ userId: string; username: string }>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
}
