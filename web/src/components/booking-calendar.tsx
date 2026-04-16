import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { bookingsApi, type Booking } from '@/lib/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BOOKING_STATUS } from '@/lib/constants'
import { formatVND } from '@/lib/utils'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function BookingCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Fetch bookings that overlap with the displayed month
  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`

  const { data: bookings } = useQuery({
    queryKey: ['bookings', 'calendar', firstDay, lastDay],
    queryFn: () => bookingsApi.calendar(firstDay, lastDay),
    staleTime: 30_000,
  })

  // Build a map: date string → bookings that cover that date
  const dateBookings = useMemo(() => {
    const map = new Map<string, Booking[]>()
    if (!bookings) return map

    for (const b of bookings) {
      if (b.status === 'CANCELLED') continue
      const start = new Date(b.checkIn)
      const end = new Date(b.checkOut)
      // Iterate each day in the booking range that falls within displayed month
      const cursor = new Date(Math.max(start.getTime(), new Date(firstDay).getTime()))
      const limit = new Date(Math.min(end.getTime(), new Date(lastDay + 'T23:59:59').getTime()))
      while (cursor <= limit) {
        const key = formatDateKey(cursor)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(b)
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    return map
  }, [bookings, firstDay, lastDay])

  // Calendar grid
  const cells = buildCalendarCells(year, month)
  const todayKey = formatDateKey(today)
  const selectedBookings = selectedDate ? (dateBookings.get(selectedDate) ?? []) : []

  const goPrev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
    setSelectedDate(null)
  }
  const goNext = () => {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
    setSelectedDate(null)
  }
  const goToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDate(todayKey)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lịch đặt phòng</CardTitle>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={goPrev}><ChevronLeft size={16} /></Button>
            <button
              type="button"
              onClick={goToday}
              className="min-w-[140px] text-center text-sm font-semibold"
            >
              Tháng {month + 1}/{year}
            </button>
            <Button size="sm" variant="ghost" onClick={goNext}><ChevronRight size={16} /></Button>
          </div>
        </div>
      </CardHeader>

      {/* Weekday header */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} className="border-t border-border p-1" />
          const key = formatDateKey(new Date(year, month, cell))
          const dayBookings = dateBookings.get(key) ?? []
          const hasBookings = dayBookings.length > 0
          const isToday = key === todayKey
          const isSelected = key === selectedDate

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(isSelected ? null : key)}
              className={`relative border-t border-border p-1 text-left transition-colors hover:bg-accent ${
                isSelected ? 'bg-accent' : ''
              }`}
            >
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                isToday ? 'bg-primary text-primary-foreground' : ''
              }`}>
                {cell}
              </span>
              {hasBookings && (
                <div className="mt-0.5 space-y-0.5">
                  {dayBookings.slice(0, 2).map((b) => (
                    <div
                      key={b.id}
                      className="truncate rounded bg-[#B85C38]/20 px-1 text-[9px] font-medium text-[#B85C38]"
                    >
                      {b.room?.name}
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div className="text-[9px] text-muted-foreground">+{dayBookings.length - 2}</div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date detail */}
      {selectedDate && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-sm font-semibold">
            {new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {selectedBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có đặt phòng</p>
          ) : (
            <div className="space-y-2">
              {selectedBookings.map((b) => (
                <DayBookingRow key={b.id} booking={b} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function DayBookingRow({ booking }: { booking: Booking }) {
  const statusConfig = BOOKING_STATUS[booking.status]
  const checkIn = new Date(booking.checkIn).toLocaleDateString('vi-VN')
  const checkOut = new Date(booking.checkOut).toLocaleDateString('vi-VN')

  return (
    <div className="rounded-md bg-[#F5EDE2]/50 p-3 backdrop-blur-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{booking.guestName}</p>
          <p className="text-xs text-muted-foreground">{booking.phone}</p>
        </div>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">Phòng: </span>
          <strong>{booking.room?.name ?? '—'}</strong>
        </div>
        <div>
          <span className="text-muted-foreground">Tiền phòng: </span>
          <strong>{formatVND(booking.totalRoomPrice)}</strong>
        </div>
        <div>
          <span className="text-muted-foreground">Nhận: </span>
          <span>{checkIn}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Trả: </span>
          <span>{checkOut}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate()
}

/** Build array of day numbers with leading nulls for offset (Monday-based) */
function buildCalendarCells(y: number, m: number): (number | null)[] {
  const total = daysInMonth(y, m)
  // getDay() returns 0=Sun, we want Mon=0
  let startDay = new Date(y, m, 1).getDay() - 1
  if (startDay < 0) startDay = 6
  const cells: (number | null)[] = Array(startDay).fill(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  return cells
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
