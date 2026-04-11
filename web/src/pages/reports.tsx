import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, TrendingUp } from 'lucide-react'
import { reportsApi, type MonthlyReportRow, type Booking } from '@/lib/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BOOKING_STATUS } from '@/lib/constants'
import { formatVND, formatDate } from '@/lib/utils'
import { BookingDetail } from '@/pages/bookings'

export function ReportsPage() {
  const { data: monthly, isLoading } = useQuery({
    queryKey: ['reports', 'monthly'],
    queryFn: reportsApi.monthly,
  })

  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)

  if (isLoading) return <p className="text-muted-foreground">Đang tải...</p>

  const totalYear = monthly?.reduce((sum, m) => sum + m.totalRevenue, 0) ?? 0
  const totalBookings = monthly?.reduce((sum, m) => sum + m.bookingCount, 0) ?? 0
  const totalNights = monthly?.reduce((sum, m) => sum + m.nightsSold, 0) ?? 0

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Báo cáo doanh thu</h2>

      {/* Year totals */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Tổng doanh thu (12 tháng)" value={formatVND(totalYear)} />
        <SummaryCard label="Tổng số đặt phòng" value={totalBookings.toString()} />
        <SummaryCard label="Tổng số đêm bán" value={totalNights.toString()} />
      </div>

      {/* Monthly breakdown */}
      <Card>
        <CardHeader><CardTitle>Doanh thu theo tháng</CardTitle></CardHeader>
        {!monthly || monthly.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-2">
            {monthly.map((m) => (
              <MonthRow
                key={m.month}
                row={m}
                expanded={expandedMonth === m.month}
                onToggle={() => setExpandedMonth(expandedMonth === m.month ? null : m.month)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3">
      <div className="rounded-lg bg-gray-100 p-2 text-emerald-600">
        <TrendingUp size={20} />
      </div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  )
}

function MonthRow({ row, expanded, onToggle }: {
  row: MonthlyReportRow
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-accent"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-semibold">{formatMonth(row.month)}</span>
          <span className="text-xs text-muted-foreground">
            {row.bookingCount} đặt phòng · {row.nightsSold} đêm
          </span>
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatVND(row.totalRevenue)}</p>
          <p className="text-xs text-muted-foreground">
            Phòng {formatVND(row.roomRevenue)} · Phụ thu {formatVND(row.serviceRevenue)}
          </p>
        </div>
      </button>

      {expanded && <MonthDetail month={row.month} />}
    </div>
  )
}

function MonthDetail({ month }: { month: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['reports', 'monthly', month, 'bookings'],
    queryFn: () => reportsApi.monthlyBookings(month),
  })

  if (isLoading) {
    return <p className="border-t border-border p-3 text-sm text-muted-foreground">Đang tải...</p>
  }
  if (!bookings || bookings.length === 0) {
    return <p className="border-t border-border p-3 text-sm text-muted-foreground">Không có đặt phòng</p>
  }

  return (
    <div className="space-y-2 border-t border-border p-3">
      {bookings.map((b) => (
        <BookingHistoryRow
          key={b.id}
          booking={b}
          expanded={expandedId === b.id}
          onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
        />
      ))}
    </div>
  )
}

function BookingHistoryRow({ booking, expanded, onToggle }: {
  booking: Booking
  expanded: boolean
  onToggle: () => void
}) {
  const statusConfig = BOOKING_STATUS[booking.status]
  return (
    <div className="rounded-md bg-gray-50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-2 text-left text-sm hover:bg-gray-100"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <div>
            <p className="font-medium">{booking.guestName}</p>
            <p className="text-xs text-muted-foreground">
              {booking.room?.name} · {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium">{formatVND(booking.totalRoomPrice)}</p>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <BookingDetail booking={booking} />
        </div>
      )}
    </div>
  )
}

/** "2026-04" → "Tháng 4/2026" */
function formatMonth(ym: string): string {
  const [y, m] = ym.split('-')
  return `Tháng ${Number(m)}/${y}`
}
